import type { FastifyInstance } from 'fastify'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { prisma, Prisma } from '@halite/db'
import { runDueSyncs, syncConsumerFromHallie, findConsumersDueForSync, SYNC_INTERVAL_DAYS } from '../lib/hallie-sync.js'

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

  // ── Hallie mirror ───────────────────────────────────────────────────
  // There is no scheduler in the process on purpose: the API runs more than
  // one instance, and two instances on a timer means two syncs. An external
  // cron (Railway, GitHub Actions) hits this daily; the three-day interval
  // lives in the query, so calling it more often is harmless and calling it
  // less just means a staler mirror.
  server.post('/internal/sync/hallie', async (request) => {
    const { limit } = z.object({ limit: z.number().int().min(1).max(1000).optional() })
      .parse(request.body ?? {})
    const started = Date.now()
    const result = await runDueSyncs(limit ?? 200)
    return {
      ...result,
      intervalDays: SYNC_INTERVAL_DAYS,
      elapsedMs: Date.now() - started,
    }
  })

  // How much work the next cron tick would pick up. Cheap enough to poll.
  server.get('/internal/sync/hallie/due', async () => {
    const due = await findConsumersDueForSync(1000)
    return { due: due.length, intervalDays: SYNC_INTERVAL_DAYS }
  })

  // One consumer, now — for support, and for the dashboard's "refresh" button.
  server.post('/internal/sync/hallie/:consumerId', async (request) => {
    const { consumerId } = z.object({ consumerId: z.string() }).parse(request.params)
    const counts = await syncConsumerFromHallie(consumerId)
    return { ok: true, ...counts }
  })
}
