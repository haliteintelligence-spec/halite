import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, CatalogFormat, ProductCategory, SkinConcern, SkinType } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { uploadToS3, getPresignedUrl } from '../lib/storage.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'
import { embedBrandProducts } from '../lib/embeddings.js'
import * as XLSX from 'xlsx'

export async function catalogRoutes(server: FastifyInstance) {
  // ── Upload catalog file (CSV or JSON) ─────────────────────────────
  server.post(
    '/:brandId/catalog/upload',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }

      const data = await request.file()
      if (!data) throw new ApiError(400, 'No file provided')

      const ext = data.filename.split('.').pop()?.toLowerCase()
      const format: CatalogFormat =
        ext === 'csv' ? 'CSV' : ext === 'json' ? 'JSON' : (() => { throw new ApiError(400, 'Unsupported format. Use CSV or JSON') })()

      const buffer = await data.toBuffer()
      const key = `catalogs/${brandId}/${Date.now()}-${data.filename}`
      const fileUrl = await uploadToS3(key, buffer, data.mimetype)

      const upload = await prisma.catalogUpload.create({
        data: { brandId, fileName: data.filename, fileUrl, format, status: 'PROCESSING' },
      })

      // Process async — don't block the response
      processCatalogUpload(upload.id, brandId, buffer, format)
        .then(() => {
          if (process.env.OPENAI_API_KEY) {
            return embedBrandProducts(brandId)
          }
          return
        })
        .catch((err) => {
          console.error(`Catalog processing failed for upload ${upload.id}:`, err)
          prisma.catalogUpload.update({
            where: { id: upload.id },
            data: { status: 'FAILED', errorLog: { message: String(err) } },
          })
        })

      return reply.status(202).send({ uploadId: upload.id, status: 'PROCESSING' })
    }
  )

  // ── Poll upload status ────────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads/:uploadId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, uploadId } = request.params as { brandId: string; uploadId: string }
      const upload = await prisma.catalogUpload.findFirst({
        where: { id: uploadId, brandId },
      })
      if (!upload) throw new ApiError(404, 'Upload not found')
      return { upload }
    }
  )

  // ── List uploads ──────────────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const uploads = await prisma.catalogUpload.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return { uploads }
    }
  )

  // ── Download upload file ──────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads/:uploadId/download',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, uploadId } = request.params as { brandId: string; uploadId: string }
      const upload = await prisma.catalogUpload.findFirst({ where: { id: uploadId, brandId } })
      if (!upload) throw new ApiError(404, 'Upload not found')

      if (upload.source === 'USER_UPLOADED' && upload.fileUrl) {
        const key = new URL(upload.fileUrl).pathname.slice(1)
        const url = await getPresignedUrl(key, 300)
        return reply.redirect(url)
      }

      // AI-generated: build XLSX on the fly based on file name
      let wb: XLSX.WorkBook
      const name = upload.fileName.toLowerCase()

      if (name.includes('purchase')) {
        const users = await prisma.endUser.findMany({
          where: { brandId },
          include: {
            routines: {
              where: { activeTo: null },
              include: { steps: { include: { product: { select: { id: true, name: true, category: true, price: true, currency: true } } } } },
              take: 1,
            },
          },
          take: 500,
        })
        const rows: Array<Record<string, unknown>> = []
        for (const u of users) {
          const routine = u.routines[0]
          if (!routine) continue
          const seen = new Set<string>()
          for (const step of routine.steps) {
            if (seen.has(step.productId)) continue
            seen.add(step.productId)
            // Stagger order dates across the past 6 months
            const daysAgo = Math.floor(Math.random() * 180)
            const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
            rows.push({
              orderId: `ORD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
              customerId: u.id,
              customerName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
              customerEmail: u.email ?? '',
              productName: step.product.name,
              category: step.product.category,
              quantity: Math.floor(Math.random() * 2) + 1,
              unitPrice: step.product.price ?? '',
              currency: step.product.currency,
              orderDate: orderDate.toISOString().slice(0, 10),
            })
          }
        }
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Purchase History')
      } else if (name.includes('consumer')) {
        const users = await prisma.endUser.findMany({
          where: { brandId },
          include: { beautyProfile: true },
          take: 500,
        })
        const rows = users.map(u => ({
          id: u.id,
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          email: u.email ?? '',
          skinType: u.beautyProfile?.skinType ?? '',
          skinTone: u.beautyProfile?.monkSkinTone ?? '',
          concerns: (u.beautyProfile?.skinConcerns ?? []).join(', '),
          climate: u.beautyProfile?.climateTag ?? '',
          createdAt: u.createdAt.toISOString().slice(0, 10),
        }))
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Consumers')
      } else if (name.includes('check')) {
        const checkIns = await prisma.checkIn.findMany({
          where: { endUser: { brandId } },
          include: { endUser: { select: { firstName: true, lastName: true } } },
          take: 2000,
          orderBy: { createdAt: 'desc' },
        })
        const rows = checkIns.map(c => ({
          consumerId: c.endUserId,
          name: `${c.endUser.firstName ?? ''} ${c.endUser.lastName ?? ''}`.trim(),
          skinRating: c.skinRating ?? '',
          compliant: c.compliant ? 'Yes' : 'No',
          symptoms: (c.symptoms ?? []).join(', '),
          notes: c.notes ?? '',
          date: c.createdAt.toISOString().slice(0, 10),
        }))
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Check-ins')
      } else {
        const products = await prisma.product.findMany({ where: { brandId }, take: 500 })
        const rows = products.map(p => ({
          name: p.name,
          category: p.category,
          price: p.price ?? '',
          currency: p.currency,
          description: p.description ?? '',
          keyIngredients: p.keyIngredients.join(', '),
          concerns: p.concerns.join(', '),
          inStock: p.inStock,
          productUrl: p.productUrl ?? '',
        }))
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Products')
      }

      const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${upload.fileName}"`)
      return reply.send(buf)
    }
  )

  // ── List products ─────────────────────────────────────────────────
  server.get(
    '/:brandId/products',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        category: z.string().optional(),
        inStock: z.coerce.boolean().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(50),
      })
      const { category, inStock, page, limit } = schema.parse(request.query)

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: {
            brandId,
            ...(category ? { category: category as any } : {}),
            ...(inStock !== undefined ? { inStock } : {}),
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where: { brandId } }),
      ])

      return { products, total, page, pages: Math.ceil(total / limit) }
    }
  )

  // ── Create product manually ───────────────────────────────────────
  server.post(
    '/:brandId/products',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.nativeEnum(ProductCategory),
        concerns: z.array(z.nativeEnum(SkinConcern)).default([]),
        skinTypes: z.array(z.nativeEnum(SkinType)).default([]),
        monkSkinTones: z.array(z.number().int().min(1).max(10)).default([]),
        ingredients: z.array(z.string()).default([]),
        keyIngredients: z.array(z.string()).default([]),
        price: z.number().min(0),
        currency: z.string().default('USD'),
        imageUrl: z.string().url().optional(),
        productUrl: z.string().url().optional(),
        externalId: z.string().optional(),
        inStock: z.boolean().default(true),
      })
      const d = schema.parse(request.body)
      const product = await prisma.product.create({
        data: {
          brandId,
          name: d.name,
          description: d.description ?? null,
          category: d.category,
          concerns: d.concerns,
          skinTypes: d.skinTypes,
          monkSkinTones: d.monkSkinTones,
          ingredients: d.ingredients,
          keyIngredients: d.keyIngredients,
          price: d.price,
          currency: d.currency,
          imageUrl: d.imageUrl ?? null,
          productUrl: d.productUrl ?? null,
          externalId: d.externalId ?? null,
          inStock: d.inStock,
        },
      })
      return reply.status(201).send({ product })
    }
  )

  // ── Get product detail with usage stats ──────────────────────────
  server.get(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }

      const product = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!product) throw new ApiError(404, 'Product not found')

      const [checkInProducts, routineCount] = await Promise.all([
        prisma.checkInProduct.findMany({
          where: { productId },
          include: {
            checkIn: {
              select: {
                skinRating: true,
                endUser: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        }),
        prisma.routineStep.count({ where: { productId } }),
      ])

      const used = checkInProducts.filter(cp => cp.used).length
      const positive = checkInProducts.filter(cp => cp.reaction === 'POSITIVE').length
      const neutral = checkInProducts.filter(cp => cp.reaction === 'NEUTRAL').length
      const negative = checkInProducts.filter(cp => cp.reaction === 'NEGATIVE').length

      const consumerMap = new Map<string, { id: string; firstName: string | null; lastName: string | null; email: string | null; checkIns: number; totalRating: number }>()
      for (const cp of checkInProducts) {
        const u = cp.checkIn.endUser
        const existing = consumerMap.get(u.id)
        if (existing) { existing.checkIns++; existing.totalRating += cp.checkIn.skinRating }
        else { consumerMap.set(u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, checkIns: 1, totalRating: cp.checkIn.skinRating }) }
      }
      const topConsumers = Array.from(consumerMap.values())
        .sort((a, b) => b.checkIns - a.checkIns)
        .slice(0, 10)
        .map(c => ({ ...c, avgRating: Math.round((c.totalRating / c.checkIns) * 10) / 10 }))

      return {
        product,
        stats: {
          routineCount,
          checkInTotal: checkInProducts.length,
          checkInUsed: used,
          usageRate: checkInProducts.length > 0 ? Math.round((used / checkInProducts.length) * 100) : null,
          reactions: { positive, neutral, negative },
        },
        topConsumers,
      }
    }
  )

  // ── Update product ────────────────────────────────────────────────
  server.patch(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z.nativeEnum(ProductCategory).optional(),
        concerns: z.array(z.nativeEnum(SkinConcern)).optional(),
        skinTypes: z.array(z.nativeEnum(SkinType)).optional(),
        fitzpatrickTypes: z.array(z.number().int().min(1).max(6)).optional(),
        ingredients: z.array(z.string()).optional(),
        keyIngredients: z.array(z.string()).optional(),
        price: z.number().min(0).optional(),
        currency: z.string().optional(),
        imageUrl: z.string().url().nullable().optional(),
        productUrl: z.string().url().nullable().optional(),
        inStock: z.boolean().optional(),
      })
      const parsed = schema.parse(request.body)
      const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))
      const existing = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!existing) throw new ApiError(404, 'Product not found')
      const product = await prisma.product.update({ where: { id: productId }, data })
      return { product }
    }
  )

  // ── Delete product ────────────────────────────────────────────────
  server.delete(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }
      const existing = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!existing) throw new ApiError(404, 'Product not found')
      await prisma.product.delete({ where: { id: productId } })
      return reply.status(204).send()
    }
  )

  // ── Get presigned URL for direct browser upload ───────────────────
  server.post(
    '/:brandId/catalog/presign',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const { filename } = z.object({ filename: z.string() }).parse(request.body)
      const key = `catalogs/${brandId}/${Date.now()}-${filename}`
      const url = await getPresignedUrl(key)
      return reply.send({ url, key })
    }
  )
}
