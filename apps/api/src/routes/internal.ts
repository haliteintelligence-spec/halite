import type { FastifyInstance } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { prisma, Prisma } from '@halite/db'

const eventSchema = z.object({
  userId: z.string(),
  brandId: z.string(),
  type: z.enum(['OUTCOME_LOGGED', 'TRANSACTION_COMPLETED', 'PREFERENCE_UPDATED', 'PRODUCT_TRACKED']),
  data: z.record(z.unknown()),
  occurredAt: z.string().datetime().optional(),
})

export async function internalRoutes(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    const provided = Buffer.from((request.headers['x-internal-secret'] as string) ?? '')
    const expected = Buffer.from(process.env.INTERNAL_API_SECRET ?? '')
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // Aura pushes consumer activity here for brand-level aggregation
  server.post('/internal/events', async (request, reply) => {
    const event = eventSchema.parse(request.body)

    await prisma.consumerEvent.create({
      data: {
        auraUserId: event.userId,
        brandId: event.brandId,
        type: event.type,
        data: event.data as Prisma.InputJsonValue,
        occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
        source: 'AURA',
      },
    })

    return { ok: true }
  })
}
