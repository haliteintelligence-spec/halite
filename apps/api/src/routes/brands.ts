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
        select: { id: true, name: true, focusAreas: true, logoUrl: true, primaryColor: true, active: true, isDemo: true, shopifyShop: true },
      })
      if (!brand || !brand.active) throw new ApiError(404, 'Brand not found')
      return { brand: { ...brand, shopifyShop: brand.shopifyShop ?? null } }
    }
  )

  // ── Public: look up existing consumer by email or phone ───────────
  // Returns minimal info only — no raw cross-brand data.
  // If found, issues a short-lived prefill token the client can redeem.
  server.get(
    '/slug/:slug/quiz/lookup',
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { email, phone } = z.object({
        email: z.string().email().optional(),
        phone: z.string().min(7).optional(),
      }).parse(request.query)

      if (!email && !phone) return reply.send({ found: false })

      const brand = await prisma.brand.findUnique({ where: { slug }, select: { id: true, isDemo: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')

      const orClauses: any[] = []
      if (email) orClauses.push({ email })
      if (phone) orClauses.push({ phone })

      // 1. Check the Consumer (cross-brand identity) table first.
      // Privacy tier: demo consumers only surface profiles from demo brands; onboarded from onboarded brands.
      const consumer = await prisma.consumer.findFirst({
        where: { OR: orClauses },
        include: {
          endUsers: {
            where: { brandId: { not: brand.id }, brand: { isDemo: brand.isDemo } },
            select: { firstName: true, lastName: true, beautyProfile: { select: { completedAreas: true } } },
          },
        },
      })

      if (consumer) {
        const allAreas = new Set<string>()
        for (const eu of consumer.endUsers) {
          for (const a of (eu.beautyProfile?.completedAreas as string[] ?? [])) allAreas.add(a)
        }
        const firstName = consumer.endUsers.find(eu => eu.firstName)?.firstName ?? null
        const prefillToken = (server as any).jwt.sign(
          { role: 'consumer_prefill', consumerId: consumer.id },
          { expiresIn: '30m' }
        )
        return reply.send({
          found: true,
          firstName,
          completedAreas: [...allAreas],
          brandCount: consumer.endUsers.length,
          prefillToken,
        })
      }

      // 2. Fall back to EndUser by email at any other brand in the same tier
      const endUser = email ? await prisma.endUser.findFirst({
        where: { email, brandId: { not: brand.id }, beautyProfile: { isNot: null }, brand: { isDemo: brand.isDemo } },
        select: { id: true, firstName: true, lastName: true, beautyProfile: { select: { completedAreas: true } } },
      }) : null

      if (endUser) {
        const completedAreas = (endUser.beautyProfile?.completedAreas as string[]) ?? []
        const prefillToken = (server as any).jwt.sign(
          { role: 'consumer_prefill', endUserId: endUser.id },
          { expiresIn: '30m' }
        )
        return reply.send({
          found: true,
          firstName: endUser.firstName ?? null,
          completedAreas,
          brandCount: 1,
          prefillToken,
        })
      }

      return reply.send({ found: false })
    }
  )

  // ── Public: redeem a prefill token → return saved answers ──────────
  server.post(
    '/slug/:slug/quiz/prefill',
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { prefillToken } = z.object({ prefillToken: z.string() }).parse(request.body)

      const brand = await prisma.brand.findUnique({ where: { slug }, select: { id: true, isDemo: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')

      let prefillAnswers: Record<string, unknown> = {}
      let completedAreas: string[] = []
      let firstName: string | null = null
      let lastName: string | null = null

      try {
        const payload = (server as any).jwt.verify(prefillToken) as any

        if (payload.role === 'consumer_prefill' && payload.consumerId) {
          const consumer = await prisma.consumer.findUnique({
            where: { id: payload.consumerId },
            include: {
              endUsers: {
                where: { brandId: { not: brand.id }, brand: { isDemo: brand.isDemo } },
                include: {
                  beautyProfile: { select: { completedAreas: true } },
                  quizSessions: { where: { completed: true }, orderBy: { completedAt: 'desc' }, take: 1 },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          })
          if (consumer) {
            prefillAnswers = (consumer.prefillAnswers as Record<string, unknown>) ?? {}
            const allAreas = new Set<string>()
            let bestFirst: string | null = null
            let bestLast: string | null = null
            for (const eu of consumer.endUsers) {
              for (const a of (eu.beautyProfile?.completedAreas as string[] ?? [])) allAreas.add(a)
              // Supplement prefill with any area answers from latest session if Consumer.prefillAnswers is sparse
              const sessionAnswers = (eu.quizSessions[0]?.answers as Record<string, unknown>) ?? {}
              prefillAnswers = { ...sessionAnswers, ...prefillAnswers } // Consumer.prefillAnswers wins
              if (!bestFirst && eu.firstName) bestFirst = eu.firstName
              if (!bestLast && eu.lastName) bestLast = eu.lastName
            }
            completedAreas = [...allAreas]
            firstName = bestFirst
            lastName = bestLast
          }
        } else if (payload.role === 'consumer_prefill' && payload.endUserId) {
          const endUser = await prisma.endUser.findUnique({
            where: { id: payload.endUserId },
            include: {
              brand: { select: { isDemo: true } },
              beautyProfile: { select: { completedAreas: true } },
              quizSessions: { where: { completed: true }, orderBy: { completedAt: 'desc' }, take: 1 },
            },
          })
          // Only redeem if the source brand is in the same privacy tier
          if (endUser && endUser.brand.isDemo === brand.isDemo) {
            prefillAnswers = (endUser.quizSessions[0]?.answers as Record<string, unknown>) ?? {}
            completedAreas = (endUser.beautyProfile?.completedAreas as string[]) ?? []
            firstName = endUser.firstName
            lastName = endUser.lastName
          }
        } else {
          throw new ApiError(401, 'Invalid prefill token')
        }
      } catch (e) {
        if (e instanceof ApiError) throw e
        throw new ApiError(401, 'Invalid or expired prefill token')
      }

      return reply.send({ prefillAnswers, completedAreas, firstName, lastName })
    }
  )

  // ── Public: issue anonymous end-user token (hosted quiz page) ─────
  server.post(
    '/slug/:slug/quiz/token',
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { externalId, email, phone, firstName, lastName, consumerId } = z.object({
        externalId: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        consumerId: z.string().optional(),
      }).parse(request.body)

      const brand = await prisma.brand.findUnique({ where: { slug } })
      if (!brand || !brand.active) throw new ApiError(404, 'Brand not found')

      // Resolve or create the cross-brand Consumer record if email/phone given
      let resolvedConsumerId = consumerId ?? null
      if (!resolvedConsumerId && (email || phone)) {
        const orClauses: any[] = []
        if (email) orClauses.push({ email })
        if (phone) orClauses.push({ phone })
        const existing = await prisma.consumer.findFirst({ where: { OR: orClauses }, select: { id: true, email: true, phone: true } })
        if (existing) {
          resolvedConsumerId = existing.id
          // Fill in any missing contact info on the Consumer record
          await prisma.consumer.update({
            where: { id: existing.id },
            data: {
              ...(email && !existing.email ? { email } : {}),
              ...(phone && !existing.phone ? { phone } : {}),
            },
          }).catch(() => {})
        } else if (email) {
          // Create a new Consumer record for this person
          const created = await prisma.consumer.create({
            data: { email, ...(phone ? { phone } : {}), prefillAnswers: {} as any },
            select: { id: true },
          }).catch(() => null)
          if (created) resolvedConsumerId = created.id
        }
      }

      let uid = externalId
      if (!uid && resolvedConsumerId) uid = `consumer-${resolvedConsumerId}`
      if (!uid) uid = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const endUser = await prisma.endUser.upsert({
        where: { brandId_externalId: { brandId: brand.id, externalId: uid } },
        update: {
          ...(email ? { email } : {}),
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(resolvedConsumerId ? { consumerId: resolvedConsumerId } : {}),
        },
        create: {
          brandId: brand.id,
          externalId: uid,
          email: email ?? null,
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          consumerId: resolvedConsumerId,
        },
      })

      const token = server.jwt.sign(
        { role: 'end_user', userId: endUser.id, brandId: brand.id },
        { expiresIn: '30d' }
      )
      return reply.send({ token, userId: endUser.id, brandId: brand.id, consumerId: endUser.consumerId })
    }
  )

  // ── Public: check-in page auth — find existing end user by email/phone ─
  server.post(
    '/slug/:slug/check-in/auth',
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const { email, phone } = z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }).parse(request.body)

      if (!email && !phone) throw new ApiError(400, 'Email or phone required')

      const brand = await prisma.brand.findUnique({ where: { slug }, select: { id: true, active: true, isDemo: true } })
      if (!brand || !brand.active) throw new ApiError(404, 'Brand not found')

      // Find end user at this brand who has completed the quiz (has a beauty profile)
      let endUserId: string | null = null

      if (email) {
        const eu = await prisma.endUser.findFirst({
          where: { brandId: brand.id, email, beautyProfile: { isNot: null } },
          select: { id: true },
        })
        if (eu) endUserId = eu.id
      }

      if (!endUserId && phone) {
        const consumer = await prisma.consumer.findFirst({
          where: { phone },
          include: {
            endUsers: {
              where: { brandId: brand.id, beautyProfile: { isNot: null } },
              select: { id: true },
              take: 1,
            },
          },
        })
        if (consumer?.endUsers[0]) endUserId = consumer.endUsers[0].id
      }

      if (endUserId) {
        const token = server.jwt.sign(
          { role: 'end_user', userId: endUserId, brandId: brand.id },
          { expiresIn: '30d' }
        )
        return reply.send({ token, userId: endUserId, brandId: brand.id })
      }

      // ── Cross-brand fallback ───────────────────────────────────────────────────
      // No profile at this brand — check whether this consumer exists at another
      // brand in the same privacy tier (demo↔demo or onboarded↔onboarded).
      const orClauses: any[] = []
      if (email) orClauses.push({ email })
      if (phone) orClauses.push({ phone })

      const crossConsumer = await prisma.consumer.findFirst({
        where: { OR: orClauses },
        include: {
          endUsers: {
            where: { brandId: { not: brand.id }, brand: { isDemo: brand.isDemo } },
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (crossConsumer && crossConsumer.endUsers.length > 0) {
        const best = crossConsumer.endUsers[0]!
        const externalId = `consumer-${crossConsumer.id}`

        const endUser = await prisma.endUser.upsert({
          where: { brandId_externalId: { brandId: brand.id, externalId } },
          update: {
            ...(crossConsumer.email ? { email: crossConsumer.email } : {}),
            ...(best.firstName ? { firstName: best.firstName } : {}),
            ...(best.lastName ? { lastName: best.lastName } : {}),
            consumerId: crossConsumer.id,
          },
          create: {
            brandId: brand.id,
            externalId,
            email: crossConsumer.email ?? best.email ?? null,
            firstName: best.firstName ?? null,
            lastName: best.lastName ?? null,
            consumerId: crossConsumer.id,
          },
        })

        const token = server.jwt.sign(
          { role: 'end_user', userId: endUser.id, brandId: brand.id },
          { expiresIn: '30d' }
        )
        return reply.send({ token, userId: endUser.id, brandId: brand.id, crossBrand: true })
      }

      throw new ApiError(404, 'No profile found. Please complete the quiz first.')
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
        brandWebsiteUrl: z.preprocess(v => v === '' ? null : v, z.string().url().optional().nullable()),
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
      return { brand: { ...safe, whiteLabelEnabled: brand.whiteLabelEnabled, brandThemeConfig: brand.brandThemeConfig } }
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

  // ── Brand Admin: change own password ─────────────────────────────
  server.post(
    '/:brandId/change-password',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const jwt = request.user as { adminId: string; brandId: string }
      if (jwt.brandId !== brandId) throw new ApiError(403, 'Forbidden')

      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string()
          .min(10, 'Password must be at least 10 characters')
          .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Must contain at least one number')
          .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
      })
      const { currentPassword, newPassword } = schema.parse(request.body)

      const admin = await prisma.brandAdmin.findFirst({ where: { id: jwt.adminId, brandId } })
      if (!admin) throw new ApiError(404, 'Admin not found')

      const valid = await bcrypt.compare(currentPassword, admin.password)
      if (!valid) throw new ApiError(400, 'Current password is incorrect')

      const hashed = await bcrypt.hash(newPassword, 12)
      await prisma.brandAdmin.update({ where: { id: admin.id }, data: { password: hashed } })
      return { ok: true }
    }
  )

  // ── Brand Admin: list consumers ──────────────────────────────────
  server.get(
    '/:brandId/consumers',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const q = request.query as {
        skinType?: string; concern?: string; search?: string
        minCheckIns?: string; compliant?: string; symptom?: string; page?: string; limit?: string
      }
      const page  = Math.max(1, parseInt(q.page  ?? '1',  10) || 1)
      const limit = Math.min(100, parseInt(q.limit ?? '50', 10) || 50)
      const skip  = (page - 1) * limit

      const where: Record<string, unknown> = { brandId }
      if (q.search) {
        where.OR = [
          { firstName: { contains: q.search, mode: 'insensitive' } },
          { lastName:  { contains: q.search, mode: 'insensitive' } },
          { email:     { contains: q.search, mode: 'insensitive' } },
        ]
      }
      if (q.skinType) where.beautyProfile = { skinType: q.skinType }
      if (q.concern)  where.beautyProfile = { ...(where.beautyProfile as object ?? {}), skinConcerns: { has: q.concern } }
      if (q.symptom)  where.checkIns = { some: { symptoms: { has: q.symptom as any } } }

      const [total, endUsers] = await Promise.all([
        prisma.endUser.count({ where }),
        prisma.endUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, firstName: true, lastName: true, email: true, createdAt: true,
            beautyProfile: { select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true } },
            _count: { select: { checkIns: true } },
            checkIns: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true, skinRating: true, compliant: true },
            },
          },
        }),
      ])

      const consumers = endUsers.map(u => {
        const checkins = u.checkIns
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          createdAt: u.createdAt,
          skinType: u.beautyProfile?.skinType ?? null,
          skinConcerns: u.beautyProfile?.skinConcerns ?? [],
          ageRange: u.beautyProfile?.ageRange ?? null,
          monkSkinTone: u.beautyProfile?.monkSkinTone ?? null,
          checkInCount: u._count.checkIns,
          lastCheckInDate: checkins[0]?.date ?? null,
          lastSkinRating: checkins[0]?.skinRating ?? null,
        }
      })

      // Filter by min check-ins post-query (count not filterable in Prisma without subquery)
      const minCI = parseInt(q.minCheckIns ?? '0', 10) || 0
      const filtered = minCI > 0 ? consumers.filter(c => c.checkInCount >= minCI) : consumers

      return { consumers: filtered, total }
    }
  )

  // ── Brand Admin: consumer detail ──────────────────────────────────
  server.get(
    '/:brandId/consumers/:consumerId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, consumerId } = request.params as { brandId: string; consumerId: string }

      const endUser = await prisma.endUser.findFirst({
        where: { id: consumerId, brandId },
        include: {
          beautyProfile: true,
          checkIns: {
            orderBy: { date: 'desc' },
            take: 20,
            include: {
              products: {
                include: { product: { select: { id: true, name: true, category: true } } },
              },
            },
          },
          routines: {
            where: { activeTo: null },
            take: 1,
            include: {
              steps: {
                orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }],
                include: { product: { select: { id: true, name: true, category: true, keyIngredients: true } } },
              },
            },
          },
          _count: { select: { checkIns: true } },
        },
      })

      if (!endUser) throw new ApiError(404, 'Consumer not found')

      const [allCheckIns, consumerRecord] = await Promise.all([
        prisma.checkIn.findMany({
          where: { endUserId: consumerId },
          select: { compliant: true, skinRating: true },
        }),
        endUser.consumerId
          ? prisma.consumer.findUnique({ where: { id: endUser.consumerId }, select: { birthday: true } })
          : Promise.resolve(null),
      ])

      const complianceRate = allCheckIns.length > 0
        ? Math.round((allCheckIns.filter(c => c.compliant).length / allCheckIns.length) * 100)
        : null
      const avgSkinRating = allCheckIns.length > 0
        ? Math.round((allCheckIns.reduce((s, c) => s + c.skinRating, 0) / allCheckIns.length) * 10) / 10
        : null

      return {
        consumer: {
          ...endUser,
          birthday: consumerRecord?.birthday ?? null,
          stats: { totalCheckIns: endUser._count.checkIns, complianceRate, avgSkinRating },
        },
      }
    }
  )

  // ── Brand Admin: ingredient detail ───────────────────────────────
  server.get(
    '/:brandId/ingredients/:ingredientName',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, ingredientName } = request.params as { brandId: string; ingredientName: string }
      const name = decodeURIComponent(ingredientName)

      const products = await prisma.product.findMany({
        where: { brandId, keyIngredients: { has: name } },
        select: { id: true, name: true, category: true, concerns: true, imageUrl: true },
      })
      if (products.length === 0) throw new ApiError(404, 'Ingredient not found in catalog')

      const productIds = products.map(p => p.id)

      const [routineSteps, checkInProducts] = await Promise.all([
        prisma.routineStep.findMany({
          where: { productId: { in: productIds } },
          include: {
            routine: { select: { endUserId: true, focusArea: true, activeTo: true } },
          },
        }),
        prisma.checkInProduct.findMany({
          where: { productId: { in: productIds }, used: true },
          include: {
            checkIn: { select: { skinRating: true, endUserId: true, symptoms: true } },
          },
        }),
      ])

      const activeConsumerIds = new Set(
        routineSteps.filter(s => s.routine.activeTo === null).map(s => s.routine.endUserId)
      )
      const uniqueConsumerIds = new Set(checkInProducts.map(cp => cp.checkIn.endUserId))
      const ratings = checkInProducts.map(cp => cp.checkIn.skinRating)
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null

      const symptomCounts: Record<string, number> = {}
      for (const cp of checkInProducts) {
        for (const sym of cp.checkIn.symptoms) {
          symptomCounts[sym] = (symptomCounts[sym] ?? 0) + 1
        }
      }
      const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom, count]) => ({ symptom, count }))

      return {
        name,
        products,
        stats: {
          productCount: products.length,
          activeConsumerCount: activeConsumerIds.size,
          totalConsumerCount: uniqueConsumerIds.size,
          checkInCount: checkInProducts.length,
          avgRating,
        },
        topSymptoms,
      }
    }
  )

  // ── Brand Admin: consumer identity intelligence ───────────────────
  server.get(
    '/:brandId/intelligence',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const [allUsers, checkInCounts] = await Promise.all([
        prisma.endUser.findMany({
          where: { brandId },
          select: { id: true, email: true, createdAt: true },
        }),
        prisma.checkIn.groupBy({
          by: ['endUserId'],
          where: { endUser: { brandId } },
          _count: { id: true },
        }),
      ])

      // Cross-brand: two-step — find consumerIds at this brand, then count which appear elsewhere
      const usersWithConsumerId = await prisma.endUser.findMany({
        where: { brandId, consumerId: { not: null } },
        select: { consumerId: true },
      })
      const cids = [...new Set(usersWithConsumerId.map(u => u.consumerId as string))]
      const crossBrandCids = cids.length > 0
        ? (await prisma.endUser.findMany({
            where: { brandId: { not: brandId }, consumerId: { in: cids } },
            select: { consumerId: true },
            distinct: ['consumerId'],
          })).map(u => u.consumerId as string)
        : []
      const crossBrand = crossBrandCids.length

      const total = allUsers.length
      const identified = allUsers.filter(u => !!u.email).length
      const anonymous = total - identified
      const retained = checkInCounts.filter(c => c._count.id >= 3).length
      const identificationRate = total > 0 ? Math.round((identified / total) * 100) : 0
      const retentionRate = total > 0 ? Math.round((retained / total) * 100) : 0
      const crossBrandRate = identified > 0 ? Math.round((crossBrand / identified) * 100) : 0

      // 8-week cumulative trend
      const now = new Date()
      const weekMs = 7 * 24 * 60 * 60 * 1000
      const trend = Array.from({ length: 8 }, (_, i) => {
        const cutoff = new Date(now.getTime() - (7 - i) * weekMs)
        const usersToDate = allUsers.filter(u => u.createdAt <= cutoff)
        const t = usersToDate.length
        const id = usersToDate.filter(u => !!u.email).length
        return { week: i, total: t, identified: id, rate: t > 0 ? Math.round((id / t) * 100) : null }
      })

      return { total, identified, anonymous, crossBrand, retained, identificationRate, crossBrandRate, retentionRate, trend }
    }
  )

  // ── Cross-brand ingredient signals ────────────────────────────────
  server.get(
    '/:brandId/intelligence/ingredient-signals',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      // Identified consumers at this brand (by consumerId or email)
      const thisEndUsers = await prisma.endUser.findMany({
        where: { brandId, OR: [{ consumerId: { not: null } }, { email: { not: null } }] },
        select: { id: true, email: true, consumerId: true },
        take: 500,
      })
      if (thisEndUsers.length === 0) return { signals: [], crossBrandConsumerCount: 0 }

      const consumerIds = thisEndUsers.map(u => u.consumerId).filter((c): c is string => !!c)
      const emails = thisEndUsers.map(u => u.email).filter((e): e is string => !!e)
      const orClauses: any[] = []
      if (consumerIds.length > 0) orClauses.push({ consumerId: { in: consumerIds } })
      if (emails.length > 0) orClauses.push({ email: { in: emails } })

      // Match at partner brands
      const partnerEndUsers = await prisma.endUser.findMany({
        where: { brandId: { not: brandId }, OR: orClauses },
        select: { id: true, consumerId: true, email: true, brandId: true },
      })
      if (partnerEndUsers.length === 0) return { signals: [], crossBrandConsumerCount: 0 }

      // Build: partnerEndUserId → thisEndUserId (and track partner brandIds)
      const thisByConsumerId = new Map(thisEndUsers.filter(u => u.consumerId).map(u => [u.consumerId!, u.id]))
      const thisByEmail = new Map(thisEndUsers.filter(u => u.email).map(u => [u.email!, u.id]))
      const partnerToThis = new Map<string, string>()
      for (const pu of partnerEndUsers) {
        const tid = (pu.consumerId && thisByConsumerId.get(pu.consumerId))
          || (pu.email && thisByEmail.get(pu.email))
        if (tid) partnerToThis.set(pu.id, tid)
      }

      const crossBrandConsumerCount = new Set([...partnerToThis.values()]).size
      const partnerIds = [...partnerToThis.keys()]

      // Get partner-brand active routines with product ingredients
      const partnerRoutines = await prisma.routine.findMany({
        where: { endUserId: { in: partnerIds }, activeTo: null },
        select: {
          endUserId: true,
          steps: {
            select: {
              product: { select: { keyIngredients: true, category: true, brandId: true } },
            },
          },
        },
      })

      // Build: ingredient → { thisEndUserIds: Set, partnerBrandIds: Set }
      const ingredientMap = new Map<string, { thisIds: Set<string>; brandIds: Set<string> }>()
      for (const routine of partnerRoutines) {
        const thisId = partnerToThis.get(routine.endUserId)
        if (!thisId) continue
        for (const step of routine.steps) {
          for (const raw of step.product.keyIngredients) {
            const ing = raw.trim().replace(/\b\w/g, c => c.toUpperCase())
            if (!ing) continue
            if (!ingredientMap.has(ing)) ingredientMap.set(ing, { thisIds: new Set(), brandIds: new Set() })
            const entry = ingredientMap.get(ing)!
            entry.thisIds.add(thisId)
            entry.brandIds.add(step.product.brandId)
          }
        }
      }

      // Top 10 ingredients by cross-brand consumer count
      const topIngredients = [...ingredientMap.entries()]
        .sort((a, b) => b[1].thisIds.size - a[1].thisIds.size)
        .slice(0, 10)

      if (topIngredients.length === 0) return { signals: [], crossBrandConsumerCount }

      const allThisIds = [...new Set(topIngredients.flatMap(([, v]) => [...v.thisIds]))]

      // Our-brand routines for those consumers → which of our products they use
      const ourRoutines = await prisma.routine.findMany({
        where: { endUserId: { in: allThisIds }, activeTo: null, endUser: { brandId } },
        select: {
          endUserId: true,
          steps: {
            select: { product: { select: { id: true, name: true, category: true } } },
          },
        },
      })

      const ourProductsByUser = new Map<string, Map<string, { id: string; name: string; category: string }>>()
      for (const r of ourRoutines) {
        if (!ourProductsByUser.has(r.endUserId)) ourProductsByUser.set(r.endUserId, new Map())
        for (const s of r.steps) {
          ourProductsByUser.get(r.endUserId)!.set(s.product.id, s.product)
        }
      }

      // Check-ins at this brand for those consumers
      const checkIns = await prisma.checkIn.findMany({
        where: { endUserId: { in: allThisIds } },
        select: { endUserId: true, skinRating: true, symptoms: true, compliant: true },
      })

      const checkInsByUser = new Map<string, typeof checkIns>()
      for (const ci of checkIns) {
        if (!checkInsByUser.has(ci.endUserId)) checkInsByUser.set(ci.endUserId, [])
        checkInsByUser.get(ci.endUserId)!.push(ci)
      }

      // Build final signals
      const signals = topIngredients.map(([ingredient, { thisIds, brandIds }]) => {
        const ids = [...thisIds]

        // Our products used by these consumers — with per-product outcomes
        const productData = new Map<string, {
          id: string; name: string; category: string
          count: number; totalRating: number; ratingCount: number
          positiveCount: number; symptoms: Map<string, number>
        }>()

        for (const uid of ids) {
          const prods = ourProductsByUser.get(uid)
          const userCIs = checkInsByUser.get(uid) ?? []
          const avgUserRating = userCIs.length > 0
            ? userCIs.reduce((s, c) => s + c.skinRating, 0) / userCIs.length
            : null

          if (prods) {
            for (const [pid, prod] of prods) {
              if (!productData.has(pid)) {
                productData.set(pid, { ...prod, count: 0, totalRating: 0, ratingCount: 0, positiveCount: 0, symptoms: new Map() })
              }
              const pd = productData.get(pid)!
              pd.count++
              if (avgUserRating !== null) {
                pd.totalRating += avgUserRating
                pd.ratingCount++
                if (avgUserRating >= 4) pd.positiveCount++
              }
              for (const ci of userCIs) {
                for (const sym of (ci.symptoms ?? [])) {
                  pd.symptoms.set(sym, (pd.symptoms.get(sym) ?? 0) + 1)
                }
              }
            }
          }
        }

        const ourProducts = [...productData.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(p => ({
            id: p.id, name: p.name, category: p.category, count: p.count,
            avgRating: p.ratingCount > 0 ? Math.round((p.totalRating / p.ratingCount) * 10) / 10 : null,
            positiveRate: p.ratingCount > 0 ? Math.round((p.positiveCount / p.ratingCount) * 100) : null,
            topSymptoms: [...p.symptoms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s),
          }))

        // Aggregate outcomes across all consumers for this ingredient
        const allCIs = ids.flatMap(uid => checkInsByUser.get(uid) ?? [])
        const totalRating = allCIs.reduce((s, c) => s + c.skinRating, 0)
        const avgRating = allCIs.length > 0 ? Math.round((totalRating / allCIs.length) * 10) / 10 : null
        const positiveRate = allCIs.length > 0
          ? Math.round((allCIs.filter(c => c.skinRating >= 4).length / allCIs.length) * 100) : 0
        const symptomCounts = new Map<string, number>()
        for (const ci of allCIs) {
          for (const s of (ci.symptoms ?? [])) symptomCounts.set(s, (symptomCounts.get(s) ?? 0) + 1)
        }
        const topSymptoms = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s)

        return {
          ingredient,
          consumerCount: ids.length,
          partnerBrandCount: brandIds.size,
          ourProducts,
          outcomes: { avgRating, positiveRate, topSymptoms, checkInCount: allCIs.length },
        }
      })

      return { signals, crossBrandConsumerCount }
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
