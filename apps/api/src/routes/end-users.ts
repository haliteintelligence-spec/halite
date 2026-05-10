import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin, requireEndUser } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'

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
            skinProfile: true,
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
          skinProfile: true,
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
          notes: data.notes,
          compliant: data.compliant,
          photoUrl: data.photoUrl,
          products: {
            create: data.products.map((p) => ({
              productId: p.productId,
              used: p.used,
              reaction: p.reaction,
            })),
          },
        },
        include: { products: true },
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
}
