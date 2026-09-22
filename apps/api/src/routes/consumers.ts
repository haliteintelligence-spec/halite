import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@halite/db'
import { requireConsumer, requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { purgeMirrorFor } from '../lib/hallie-sync.js'

// Questions that are about the person (brand-agnostic) — safe to pre-fill
const PREFILL_QUESTION_IDS = new Set([
  'S1', 'S2', 'S3', 'S4', 'S5',         // Skincare biology
  'B1', 'B2', 'B3', 'B4',               // Body skin
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',  // Hair biology
  'M1', 'M2', 'M3',                     // Makeup skin base
  'SH0',                                 // Age range
  'SH1_location', 'SH1_climate', 'SH1_currency', // Location
  'SH4', 'SH5', 'SH6',                  // Lifestyle (water, sleep, stress)
])

export async function consumerRoutes(server: FastifyInstance) {
  // ── Identify (lookup or create) ──────────────────────────────────────
  // Called from quiz intro — consumer must provide email or phone (or both).
  // Returns a platform token + any pre-fill answers from prior quizzes.
  server.post(
    '/consumers/identify',
    async (request, reply) => {
      const schema = z.object({
        email: z.string().email().optional(),
        phone: z.string().min(7).max(20).optional(),
      }).refine(d => d.email || d.phone, { message: 'email or phone is required' })

      const { email, phone } = schema.parse(request.body)

      // Look up existing consumer by email or phone
      let consumer = await prisma.consumer.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      })

      if (consumer) {
        // Merge any newly provided contact info (e.g. first time email, now also has phone)
        const updates: Record<string, string> = {}
        if (email && !consumer.email) updates.email = email
        if (phone && !consumer.phone) updates.phone = phone
        if (Object.keys(updates).length > 0) {
          try {
            consumer = await prisma.consumer.update({ where: { id: consumer.id }, data: updates })
          } catch (err) {
            // The newly-provided email/phone belongs to a different existing
            // consumer (email and phone matched two separate profiles) —
            // don't let the unique constraint surface as a 500.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
              throw new ApiError(409, 'This email or phone number is already associated with a different profile.')
            }
            throw err
          }
        }
      } else {
        try {
          consumer = await prisma.consumer.create({
            data: { email: email ?? null, phone: phone ?? null },
          })
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            throw new ApiError(409, 'This email or phone number is already associated with a different profile.')
          }
          throw err
        }
      }

      const token = server.jwt.sign(
        { role: 'consumer', consumerId: consumer.id },
        { expiresIn: '365d' }
      )

      return reply.send({
        token,
        consumerId: consumer.id,
        prefillAnswers: consumer.prefillAnswers ?? {},
        isReturning: Object.keys(consumer.prefillAnswers as object).length > 0,
      })
    }
  )

  // ── Get platform profile ─────────────────────────────────────────────
  server.get(
    '/consumers/me',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const consumer = await prisma.consumer.findUnique({
        where: { id: consumerId },
        include: {
          endUsers: {
            select: {
              id: true,
              brandId: true,
              brand: { select: { name: true, slug: true, logoUrl: true } },
              createdAt: true,
            },
          },
        },
      })
      if (!consumer) throw new ApiError(404, 'Consumer not found')
      return { consumer }
    }
  )

  // ── Update pre-fill answers after quiz completion ─────────────────────
  // Called by the quiz client on completion — merges new answers into the
  // consumer's stored profile, keeping only brand-agnostic question IDs.
  server.patch(
    '/consumers/me/answers',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const { answers } = z.object({
        answers: z.record(z.unknown()),
      }).parse(request.body)

      // Only persist answers for brand-agnostic questions
      const filtered = Object.fromEntries(
        Object.entries(answers).filter(([k]) => PREFILL_QUESTION_IDS.has(k))
      )

      const consumer = await prisma.consumer.findUnique({
        where: { id: consumerId },
        select: { prefillAnswers: true },
      })
      if (!consumer) throw new ApiError(404, 'Consumer not found')

      const merged = {
        ...(consumer.prefillAnswers as object),
        ...filtered,
      }

      const updated = await prisma.consumer.update({
        where: { id: consumerId },
        data: { prefillAnswers: merged as Prisma.InputJsonValue },
        select: { id: true, email: true, prefillAnswers: true, updatedAt: true },
      })

      return { consumer: updated }
    }
  )

  // ── Connected brands (Hallie's permission centre) ────────────────────
  // What the consumer sees: who is reading their profile, what each brand
  // can read, and the switch that stops it.
  server.get(
    '/consumers/me/connections',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!

      const grants = await prisma.consentGrant.findMany({
        where: { consumerId },
        orderBy: [{ status: 'asc' }, { grantedAt: 'desc' }],
        select: {
          id: true, status: true, categories: true, purpose: true,
          grantedAt: true, revokedAt: true, expiresAt: true,
          brand: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
        },
      })

      // How many of the consumer's own products each brand can actually
      // name — everything else it only ever sees as ingredients.
      const namedCounts = new Map<string, number>()
      for (const g of grants) {
        const n = await prisma.checkInProduct.count({
          where: {
            product: { brandId: g.brand.id },
            checkIn: { endUser: { consumerId } },
          },
        })
        namedCounts.set(g.brand.id, n)
      }

      return {
        connections: grants.map(g => ({
          grantId: g.id,
          brand: g.brand,
          status: g.status.toLowerCase(),
          categories: g.categories,
          purpose: g.purpose,
          connectedAt: g.grantedAt.toISOString(),
          disconnectedAt: g.revokedAt?.toISOString() ?? null,
          // Null means "until you disconnect" — the pilot sets no expiry.
          expiresAt: g.expiresAt?.toISOString() ?? null,
          namedProducts: namedCounts.get(g.brand.id) ?? 0,
        })),
      }
    }
  )

  // ── Disconnect a brand ───────────────────────────────────────────────
  // Takes effect on the brand's very next call: requireGrant in the Connect
  // routes reads status, so there is no cache to wait out.
  server.post(
    '/consumers/me/connections/:brandId/revoke',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const { brandId } = z.object({ brandId: z.string() }).parse(request.params)

      const grant = await prisma.consentGrant.findUnique({
        where: { brandId_consumerId: { brandId, consumerId } },
        select: { id: true, status: true },
      })
      if (!grant) throw new ApiError(404, 'Not connected to this brand')
      if (grant.status !== 'ACTIVE') return { ok: true, status: grant.status.toLowerCase() }

      const updated = await prisma.consentGrant.update({
        where: { id: grant.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
        select: { status: true, revokedAt: true },
      })
      await prisma.consentAccessLog.create({
        data: {
          grantId: grant.id, brandId, consumerId,
          action: 'refused', detail: { reason: 'revoked_by_consumer' },
        },
      })


      // The mirror exists to serve connected brands. With none left, there is
      // nothing it is for, so it goes rather than sitting on disk.
      const stillConnected = await prisma.consentGrant.count({
        where: { consumerId: consumerId, status: 'ACTIVE' },
      })
      if (stillConnected === 0) await purgeMirrorFor(consumerId)

      return { ok: true, status: updated.status.toLowerCase(), revokedAt: updated.revokedAt?.toISOString() }
    }
  )

  // ── Access log ───────────────────────────────────────────────────────
  // Every read a brand actually made, in the consumer's own words.
  server.get(
    '/consumers/me/access-log',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const { limit } = z.object({
        limit: z.coerce.number().int().min(1).max(100).optional(),
      }).parse(request.query ?? {})

      const logs = await prisma.consentAccessLog.findMany({
        where: { consumerId },
        orderBy: { createdAt: 'desc' },
        take: limit ?? 30,
        select: {
          id: true, action: true, scoped: true, detail: true, createdAt: true,
          grant: { select: { brand: { select: { name: true, slug: true } } } },
        },
      })

      return {
        entries: logs.map(l => ({
          id: l.id,
          brand: l.grant.brand.name,
          action: l.action,
          scoped: l.scoped,
          detail: l.detail,
          at: l.createdAt.toISOString(),
        })),
      }
    }
  )

  // ── Brand admin: consumer identity intelligence ───────────────────
  // Returns aggregated, anonymised cross-brand signals for a brand's consumers.
  server.get(
    '/:brandId/intelligence',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const endUsers = await prisma.endUser.findMany({
        where: { brandId },
        select: {
          id: true,
          consumerId: true,
          createdAt: true,
          _count: { select: { checkIns: true } },
          consumer: {
            select: {
              id: true,
              _count: { select: { endUsers: true } },
            },
          },
        },
      })

      const total = endUsers.length
      const identified = endUsers.filter(u => u.consumerId != null).length
      const crossBrand = endUsers.filter(u => u.consumer && u.consumer._count.endUsers > 1).length
      const retained = endUsers.filter(u => u._count.checkIns >= 3).length

      // Weekly identification rate over last 8 weeks
      const now = Date.now()
      const weeklyIdentified = Array(8).fill(0) as number[]
      const weeklyTotal = Array(8).fill(0) as number[]
      endUsers.forEach(u => {
        const weeks = Math.floor((now - new Date(u.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeks < 8) {
          weeklyTotal[7 - weeks]!++
          if (u.consumerId) weeklyIdentified[7 - weeks]!++
        }
      })

      const trend = weeklyTotal.map((t, i) => ({
        week: i,
        total: t,
        identified: weeklyIdentified[i]!,
        rate: t > 0 ? Math.round((weeklyIdentified[i]! / t) * 100) : null,
      }))

      return {
        total,
        identified,
        anonymous: total - identified,
        crossBrand,
        retained,
        identificationRate: total > 0 ? Math.round((identified / total) * 100) : 0,
        crossBrandRate: identified > 0 ? Math.round((crossBrand / identified) * 100) : 0,
        retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
        trend,
      }
    }
  )
}
