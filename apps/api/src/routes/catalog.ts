import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, CatalogFormat, ProductCategory, SkinConcern, SkinType } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { uploadToS3, getPresignedUrl } from '../lib/storage.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'
import { embedBrandProducts } from '../lib/embeddings.js'

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
