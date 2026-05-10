import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, CatalogFormat } from '@halite/db'
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
