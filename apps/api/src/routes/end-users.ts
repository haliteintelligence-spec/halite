import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin, requireEndUser } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { generateProgressNarrative, shouldGenerateNarrative } from '../lib/narrative-generator.js'
import { refineRoutine } from '../lib/routine-refiner.js'

export async function endUserRoutes(server: FastifyInstance) {
  // Brand admin: list end users
  server.get(
    '/:brandId/end-users',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const { page = 1, limit = 50 } = request.query as { page?: number; limit?: number }

      const [users, total] = await Promise.all([
        prisma.endUser.findMany({
          where: { brandId },
          include: {
            beautyProfile: true,
            _count: { select: { checkIns: true, routines: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.endUser.count({ where: { brandId } }),
      ])

      return { users, total, page, pages: Math.ceil(total / limit) }
    }
  )

  // End user: get own profile
  server.get(
    '/:brandId/me',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const user = await prisma.endUser.findUnique({
        where: { id: userId },
        include: {
          beautyProfile: true,
          routines: {
            where: { activeTo: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { steps: { include: { product: true }, orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }] } },
          },
        },
      })
      if (!user) throw new ApiError(404, 'User not found')
      return { user }
    }
  )

  // End user: log a check-in
  server.post(
    '/:brandId/me/check-ins',
    { preHandler: requireEndUser },
    async (request, reply) => {
      const userId = request.endUser!.userId
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        skinRating: z.number().int().min(1).max(5),
        symptoms: z.array(z.string()).default([]),
        notes: z.string().optional(),
        compliant: z.boolean().default(true),
        photoUrl: z.string().url().optional(),
        products: z.array(z.object({
          productId: z.string(),
          used: z.boolean().default(true),
          reaction: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).optional(),
        })).default([]),
      })

      const data = schema.parse(request.body)

      const checkIn = await prisma.checkIn.create({
        data: {
          endUserId: userId,
          skinRating: data.skinRating,
          symptoms: data.symptoms as any,
          notes: data.notes ?? null,
          compliant: data.compliant,
          photoUrl: data.photoUrl ?? null,
          products: {
            create: data.products.map((p) => ({
              productId: p.productId,
              used: p.used,
              ...(p.reaction !== undefined ? { reaction: p.reaction } : {}),
            })),
          },
        },
        include: { products: true },
      })

      // Async narrative generation — non-blocking
      shouldGenerateNarrative(userId).then(should => {
        if (should) generateProgressNarrative(userId, brandId).catch(console.error)
      })

      return reply.status(201).send({ checkIn })
    }
  )

  // End user: get check-in history
  server.get(
    '/:brandId/me/check-ins',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const { page = 1, limit = 30 } = request.query as { page?: number; limit?: number }

      const checkIns = await prisma.checkIn.findMany({
        where: { endUserId: userId },
        include: { products: { include: { product: { select: { id: true, name: true, imageUrl: true } } } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      })

      return { checkIns }
    }
  )

  // End user: get current routine
  server.get(
    '/:brandId/me/routine',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const routine = await prisma.routine.findFirst({
        where: { endUserId: userId, activeTo: null },
        include: {
          steps: {
            include: { product: true },
            orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!routine) throw new ApiError(404, 'No active routine found')
      return { routine }
    }
  )

  // End user: get AI progress narrative
  server.get(
    '/:brandId/me/narrative',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const { brandId } = request.params as { brandId: string }

      const profile = await prisma.userBeautyProfile.findUnique({
        where: { endUserId: userId },
        select: { progressNarrative: true, narrativeUpdatedAt: true },
      })

      if (!profile?.progressNarrative) {
        const count = await prisma.checkIn.count({ where: { endUserId: userId } })
        if (count >= 4) {
          await generateProgressNarrative(userId, brandId)
          const updated = await prisma.userBeautyProfile.findUnique({
            where: { endUserId: userId },
            select: { progressNarrative: true, narrativeUpdatedAt: true },
          })
          return { narrative: updated?.progressNarrative ?? null, generatedAt: updated?.narrativeUpdatedAt ?? null }
        }
        return { narrative: null, generatedAt: null, checkInsRequired: Math.max(0, 4 - count) }
      }

      return { narrative: profile.progressNarrative, generatedAt: profile.narrativeUpdatedAt }
    }
  )

  // End user: check-in streak (consecutive days)
  server.get(
    '/:brandId/me/check-ins/streak',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId

      const checkIns = await prisma.checkIn.findMany({
        where: { endUserId: userId },
        select: { date: true },
        orderBy: { date: 'desc' },
      })

      if (checkIns.length === 0) return { streak: 0, totalCheckIns: 0 }

      const DAY = 24 * 60 * 60 * 1000
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const days = new Set(
        checkIns.map(c => {
          const d = new Date(c.date)
          d.setHours(0, 0, 0, 0)
          return d.getTime()
        })
      )

      // Start from today; if no check-in today, allow yesterday as the streak start
      let cursor = today.getTime()
      if (!days.has(cursor) && days.has(cursor - DAY)) cursor -= DAY

      let streak = 0
      while (days.has(cursor)) {
        streak++
        cursor -= DAY
      }

      return { streak, totalCheckIns: checkIns.length }
    }
  )

  // End user: routine history (all versions, grouped by area)
  server.get(
    '/:brandId/me/routine/history',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const { area } = request.query as { area?: string }

      const routines = await prisma.routine.findMany({
        where: {
          endUserId: userId,
          ...(area ? { focusArea: area as any } : {}),
        },
        include: {
          steps: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true, category: true } },
            },
            orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }],
          },
        },
        orderBy: [{ focusArea: 'asc' }, { version: 'desc' }],
      })

      // Group by area, each with ordered version list
      const grouped: Record<string, typeof routines> = {}
      for (const r of routines) {
        const key = r.focusArea as string
        if (!grouped[key]) grouped[key] = []
        grouped[key]!.push(r)
      }

      return { history: grouped, total: routines.length }
    }
  )

  // End user: refine routine(s) based on check-in data
  server.post(
    '/:brandId/me/routine/refine',
    { preHandler: requireEndUser },
    async (request, reply) => {
      const userId = request.endUser!.userId
      const { brandId } = request.params as { brandId: string }
      const { area } = z.object({ area: z.string().optional() }).parse(request.body ?? {})

      const activeRoutines = await prisma.routine.findMany({
        where: {
          endUserId: userId,
          activeTo: null,
          ...(area ? { focusArea: area as any } : {}),
        },
      })

      if (activeRoutines.length === 0) throw new ApiError(404, 'No active routines found')

      const results = await Promise.all(
        activeRoutines.map(r => refineRoutine(userId, brandId, r.id))
      )

      const refinedCount = results.filter(r => r.refined).length

      return reply.status(200).send({
        results,
        refinedCount,
        message: refinedCount > 0
          ? `${refinedCount} routine(s) updated based on your check-in data`
          : 'Your routines are performing well — no changes needed',
      })
    }
  )

  // End user: get reorder reminders (routines due within 14 days)
  server.get(
    '/:brandId/me/reorder',
    { preHandler: requireEndUser },
    async (request) => {
      const userId = request.endUser!.userId
      const windowDays = 14
      const windowDate = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000)

      const routines = await prisma.routine.findMany({
        where: {
          endUserId: userId,
          activeTo: null,
          reorderDue: { lte: windowDate },
        },
        include: {
          steps: {
            include: {
              product: {
                select: {
                  id: true, name: true, price: true, currency: true,
                  imageUrl: true, productUrl: true, category: true,
                },
              },
            },
            orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }],
          },
        },
        orderBy: { reorderDue: 'asc' },
      })

      const items = routines.flatMap(r => {
        const daysUntil = r.reorderDue
          ? Math.ceil((r.reorderDue.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : null
        const seen = new Set<string>()
        return r.steps
          .filter(s => { if (seen.has(s.productId)) return false; seen.add(s.productId); return true })
          .map(s => ({
            product: s.product,
            routineArea: r.focusArea,
            reorderDue: r.reorderDue,
            daysUntil,
            urgency: daysUntil === null ? 'none' : daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'soon' : 'upcoming',
          }))
      })

      return { items, count: items.length }
    }
  )
}
