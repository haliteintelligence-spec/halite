import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireHaliteAdmin, requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { embedBrandProducts, embedProduct, findSimilarProducts } from '../lib/embeddings.js'

const createBrandSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).default('STARTER'),
  ownerEmail: z.string().email(),
  ownerName: z.string(),
  ownerPassword: z.string().min(8),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function brandRoutes(server: FastifyInstance) {
  // ── Public: resolve brand by slug (quiz page / widget) ────────────
  server.get(
    '/slug/:slug',
    async (request) => {
      const { slug } = request.params as { slug: string }
      const brand = await prisma.brand.findUnique({
        where: { slug },
        select: { id: true, name: true, focusAreas: true, logoUrl: true, primaryColor: true, active: true },
      })
      if (!brand || !brand.active) throw new ApiError(404, 'Brand not found')
      return { brand }
    }
  )

  // ── Public: issue anonymous end-user token (hosted quiz page) ─────
  server.post(
    '/slug/:slug/quiz/token',
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { externalId, email } = z.object({
        externalId: z.string().optional(),
        email: z.string().email().optional(),
      }).parse(request.body)

      const brand = await prisma.brand.findUnique({ where: { slug } })
      if (!brand || !brand.active) throw new ApiError(404, 'Brand not found')

      const uid = externalId ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const endUser = await prisma.endUser.upsert({
        where: { brandId_externalId: { brandId: brand.id, externalId: uid } },
        update: { email: email ?? null },
        create: { brandId: brand.id, externalId: uid, email: email ?? null },
      })

      const token = server.jwt.sign(
        { role: 'end_user', userId: endUser.id, brandId: brand.id },
        { expiresIn: '30d' }
      )
      return reply.send({ token, userId: endUser.id, brandId: brand.id })
    }
  )

  // ── Halite Admin: list all brands ──────────────────────────────────
  server.get(
    '/',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const brands = await prisma.brand.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { endUsers: true, products: true } },
          admins: { where: { role: 'OWNER' }, select: { email: true, name: true } },
        },
      })
      return { brands }
    }
  )

  // ── Halite Admin: create brand ─────────────────────────────────────
  server.post(
    '/',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const data = createBrandSchema.parse(request.body)

      const existing = await prisma.brand.findUnique({ where: { slug: data.slug } })
      if (existing) throw new ApiError(409, 'Slug already taken')

      const hashedPassword = await bcrypt.hash(data.ownerPassword, 12)

      const brand = await prisma.brand.create({
        data: {
          name: data.name,
          slug: data.slug,
          plan: data.plan,
          logoUrl: data.logoUrl ?? null,
          primaryColor: data.primaryColor ?? null,
          admins: {
            create: {
              email: data.ownerEmail,
              name: data.ownerName,
              password: hashedPassword,
              role: 'OWNER',
            },
          },
        },
        include: { admins: { select: { id: true, email: true, name: true, role: true } } },
      })

      return reply.status(201).send({ brand })
    }
  )

  // ── Halite Admin: get single brand ────────────────────────────────
  server.get(
    '/:brandId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          admins: { select: { id: true, email: true, name: true, role: true } },
          _count: { select: { endUsers: true, products: true, quizSessions: true } },
        },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      return { brand }
    }
  )

  // ── Halite Admin: update brand ────────────────────────────────────
  server.patch(
    '/:brandId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        name: z.string().optional(),
        plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).optional(),
        active: z.boolean().optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
      const parsed = schema.parse(request.body)
      const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))
      const brand = await prisma.brand.update({ where: { id: brandId }, data })
      return { brand }
    }
  )

  // ── Brand Admin: update own brand profile ────────────────────────
  server.patch(
    '/:brandId/profile',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        name: z.string().min(2).optional(),
        logoUrl: z.string().url().optional().nullable(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        focusAreas: z.array(z.enum(['SKINCARE', 'BODY', 'HAIR', 'MAKEUP', 'FRAGRANCE', 'NAILS', 'WELLNESS', 'SUN_CARE', 'LIP_CARE', 'EYE_CARE'])).optional(),
      })
      const parsed = schema.parse(request.body)
      const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))
      const brand = await prisma.brand.update({ where: { id: brandId }, data })
      const { shopifyToken, shopifyWebhookSecret, apiKey, ...safe } = brand
      return { brand: safe }
    }
  )

  // ── Brand Admin: get own brand profile ────────────────────────────
  server.get(
    '/:brandId/profile',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: { _count: { select: { endUsers: true, products: true } } },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      const { shopifyToken, shopifyWebhookSecret, apiKey, ...safe } = brand
      return { brand: safe }
    }
  )

  // ── Brand Admin: get integrations status ──────────────────────────
  server.get(
    '/:brandId/integrations',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { shopifyShop: true },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')

      const lastSync = brand.shopifyShop
        ? await prisma.catalogUpload.findFirst({
            where: { brandId, format: 'SHOPIFY_SYNC', status: 'DONE' },
            orderBy: { processedAt: 'desc' },
            select: { processedAt: true, rowCount: true },
          })
        : null

      return {
        shopify: {
          connected: !!brand.shopifyShop,
          shop: brand.shopifyShop ?? null,
          lastSync: lastSync?.processedAt ?? null,
          lastSyncCount: lastSync?.rowCount ?? null,
        },
      }
    }
  )

  // ── Brand Admin: disconnect Shopify ───────────────────────────────
  server.delete(
    '/:brandId/shopify',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      await prisma.brand.update({
        where: { id: brandId },
        data: { shopifyShop: null, shopifyToken: null, shopifyWebhookSecret: null },
      })
      return reply.status(204).send()
    }
  )

  // ── Brand Admin: list team members ───────────────────────────────
  server.get(
    '/:brandId/team',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const admins = await prisma.brandAdmin.findMany({
        where: { brandId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })
      return { admins }
    }
  )

  // ── Brand Admin: invite team member ──────────────────────────────
  server.post(
    '/:brandId/team/invite',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const caller = await prisma.brandAdmin.findFirst({
        where: { id: request.brandAdmin!.adminId, brandId },
      })
      if (caller?.role !== 'OWNER') throw new ApiError(403, 'Only owners can invite members')

      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(['OWNER', 'MEMBER']).default('MEMBER'),
      })
      const data = schema.parse(request.body)

      const existing = await prisma.brandAdmin.findUnique({ where: { email: data.email } })
      if (existing) throw new ApiError(409, 'An admin with this email already exists')

      const hashedPassword = await bcrypt.hash(data.password, 12)
      const admin = await prisma.brandAdmin.create({
        data: { brandId, name: data.name, email: data.email, password: hashedPassword, role: data.role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
      return reply.status(201).send({ admin })
    }
  )

  // ── Brand Admin (OWNER): change member role ───────────────────────
  server.patch(
    '/:brandId/team/:adminId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, adminId } = request.params as { brandId: string; adminId: string }
      const caller = await prisma.brandAdmin.findFirst({
        where: { id: request.brandAdmin!.adminId, brandId },
      })
      if (caller?.role !== 'OWNER') throw new ApiError(403, 'Only owners can change roles')
      if (adminId === request.brandAdmin!.adminId) throw new ApiError(400, 'Cannot change your own role')

      const { role } = z.object({ role: z.enum(['OWNER', 'MEMBER']) }).parse(request.body)

      if (role === 'MEMBER') {
        const ownerCount = await prisma.brandAdmin.count({ where: { brandId, role: 'OWNER' } })
        if (ownerCount <= 1) throw new ApiError(400, 'Cannot demote the last owner')
      }

      const target = await prisma.brandAdmin.findFirst({ where: { id: adminId, brandId } })
      if (!target) throw new ApiError(404, 'Member not found')

      const admin = await prisma.brandAdmin.update({
        where: { id: adminId },
        data: { role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
      return { admin }
    }
  )

  // ── Brand Admin (OWNER): remove team member ───────────────────────
  server.delete(
    '/:brandId/team/:adminId',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, adminId } = request.params as { brandId: string; adminId: string }
      const caller = await prisma.brandAdmin.findFirst({
        where: { id: request.brandAdmin!.adminId, brandId },
      })
      if (caller?.role !== 'OWNER') throw new ApiError(403, 'Only owners can remove members')
      if (adminId === request.brandAdmin!.adminId) throw new ApiError(400, 'Cannot remove yourself')

      const target = await prisma.brandAdmin.findFirst({ where: { id: adminId, brandId } })
      if (!target) throw new ApiError(404, 'Member not found')

      if (target.role === 'OWNER') {
        const ownerCount = await prisma.brandAdmin.count({ where: { brandId, role: 'OWNER' } })
        if (ownerCount <= 1) throw new ApiError(400, 'Cannot remove the last owner')
      }

      await prisma.brandAdmin.delete({ where: { id: adminId } })
      return reply.status(204).send()
    }
  )

  // ── Brand Admin: rotate API key ───────────────────────────────────
  server.post(
    '/:brandId/rotate-api-key',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const newKey = crypto.randomUUID()
      await prisma.brand.update({ where: { id: brandId }, data: { apiKey: newKey } })
      return { apiKey: newKey }
    }
  )

  // ── Brand Admin: get API key ──────────────────────────────────────
  server.get(
    '/:brandId/api-key',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { apiKey: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')
      return { apiKey: brand.apiKey }
    }
  )

  // ── Brand Admin: get quiz config ──────────────────────────────────
  server.get(
    '/:brandId/quiz-config',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const config = await prisma.quizConfig.findUnique({ where: { brandId } })
      return { config }
    }
  )

  // ── Brand Admin: upsert quiz config ───────────────────────────────
  server.put(
    '/:brandId/quiz-config',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        enabledAreas: z.array(z.enum(['SKINCARE', 'BODY', 'HAIR', 'MAKEUP', 'FRAGRANCE', 'NAILS', 'WELLNESS', 'SUN_CARE', 'LIP_CARE', 'EYE_CARE'])),
      })
      const { enabledAreas } = schema.parse(request.body)
      const config = await prisma.quizConfig.upsert({
        where: { brandId },
        update: { enabledAreas },
        create: { brandId, enabledAreas },
      })
      return { config }
    }
  )

  // ── Brand Admin: trigger embedding run for all products ───────────
  server.post(
    '/:brandId/products/embed',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }

      if (!process.env.OPENAI_API_KEY) {
        throw new ApiError(503, 'Embedding service not configured (missing OPENAI_API_KEY)')
      }

      // Run async — return job accepted immediately
      embedBrandProducts(brandId).catch((err) => {
        console.error(`Embedding job failed for brand ${brandId}:`, err)
      })

      return reply.status(202).send({ status: 'accepted', message: 'Embedding job started' })
    }
  )

  // ── Brand Admin: embed single product ─────────────────────────────
  server.post(
    '/:brandId/products/:productId/embed',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }

      if (!process.env.OPENAI_API_KEY) {
        throw new ApiError(503, 'Embedding service not configured (missing OPENAI_API_KEY)')
      }

      const product = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!product) throw new ApiError(404, 'Product not found')

      await embedProduct(productId)
      return reply.status(200).send({ status: 'ok', productId })
    }
  )

  // ── Brand Admin: find similar products ────────────────────────────
  server.get(
    '/:brandId/products/:productId/similar',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }
      const { limit } = (request.query as { limit?: string })
      const n = Math.min(parseInt(limit ?? '5', 10) || 5, 20)

      const product = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!product) throw new ApiError(404, 'Product not found')

      const similar = await findSimilarProducts(brandId, productId, n)
      return { similar }
    }
  )
}
