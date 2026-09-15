import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { ApiError } from '../lib/errors.js'
import { requireBrandAdmin } from '../lib/auth.js'
import { buildConnectContext } from '../lib/connect-context.js'
import { matchCatalog } from '../lib/connect-match.js'

/**
 * Brand-admin views over Connect: the performance dashboard, the roster of
 * connected consumers, and one consumer's permissioned profile.
 *
 * These read the same grant state the public API enforces, so the dashboard
 * can never show a brand something its API key would be refused.
 */

const ONE_DAY = 24 * 60 * 60 * 1000

function windowFrom(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * ONE_DAY)
  const prevFrom = new Date(from.getTime() - days * ONE_DAY)
  return { from, to, prevFrom }
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

function delta(now: number, before: number): number | null {
  if (before === 0) return null
  return Math.round(((now - before) / before) * 1000) / 10
}

export async function connectAdminRoutes(server: FastifyInstance) {
  // ── Performance ─────────────────────────────────────────────────────
  server.get(
    '/:brandId/connect/analytics',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const { days } = z.object({
        days: z.coerce.number().int().min(1).max(365).optional(),
      }).parse(request.query ?? {})
      const window = days ?? 30
      const { from, prevFrom } = windowFrom(window)

      const [events, prevEvents, activeGrants, newGrants, prevNewGrants, revoked] = await Promise.all([
        prisma.connectEvent.findMany({
          where: { brandId, occurredAt: { gte: from } },
          select: { type: true, surface: true, value: true, consumerId: true, recommendationId: true, productId: true },
        }),
        prisma.connectEvent.findMany({
          where: { brandId, occurredAt: { gte: prevFrom, lt: from } },
          select: { type: true, value: true, consumerId: true },
        }),
        prisma.consentGrant.count({ where: { brandId, status: 'ACTIVE' } }),
        prisma.consentGrant.count({ where: { brandId, grantedAt: { gte: from } } }),
        prisma.consentGrant.count({ where: { brandId, grantedAt: { gte: prevFrom, lt: from } } }),
        prisma.consentGrant.count({ where: { brandId, status: 'REVOKED', revokedAt: { gte: from } } }),
      ])

      const count = (t: string, src: typeof events = events) => src.filter(e => e.type === t).length
      const shown = count('PROMPT_SHOWN')
      const accepted = count('CONNECT_ACCEPTED')
      const declined = count('CONNECT_DECLINED')

      const purchases = events.filter(e => e.type === 'PURCHASE')
      const connectedPurchases = purchases.filter(e => e.consumerId)
      const revenue = connectedPurchases.reduce((sum, e) => sum + (e.value ?? 0), 0)
      const prevRevenue = prevEvents
        .filter(e => e.type === 'PURCHASE' && e.consumerId)
        .reduce((sum, e) => sum + (e.value ?? 0), 0)

      // Funnel over connected shoppers only. The unconnected comparison
      // needs the merchant's own site analytics, so it is not invented here.
      const recShown = count('RECOMMENDATION_SHOWN')
      const viewed = events.filter(e => e.type === 'PRODUCT_VIEWED' && e.consumerId).length
      const carts = events.filter(e => e.type === 'ADD_TO_CART' && e.consumerId).length
      const saves = events.filter(e => e.type === 'WISHLISTED' && e.consumerId).length
      const returns = events.filter(e => e.type === 'RETURNED' && e.consumerId).length

      // Acceptance by placement.
      const surfaces = new Map<string, { shown: number; accepted: number }>()
      for (const e of events) {
        if (e.type !== 'PROMPT_SHOWN' && e.type !== 'CONNECT_ACCEPTED') continue
        const key = e.surface ?? 'unspecified'
        const row = surfaces.get(key) ?? { shown: 0, accepted: 0 }
        if (e.type === 'PROMPT_SHOWN') row.shown++
        else row.accepted++
        surfaces.set(key, row)
      }

      // Products that were recommended, and what happened next.
      const recs = await prisma.recommendation.findMany({
        where: { brandId, createdAt: { gte: from } },
        select: { id: true, items: true },
      })
      const perProduct = new Map<string, {
        name: string; sku: string | null; shown: number; scoreSum: number
        carts: number; purchases: number; revenue: number
      }>()
      for (const r of recs) {
        const items = (r.items ?? []) as Array<{ productId: string; name: string; sku: string | null; score: number }>
        for (const i of items) {
          const row = perProduct.get(i.productId) ?? {
            name: i.name, sku: i.sku, shown: 0, scoreSum: 0, carts: 0, purchases: 0, revenue: 0,
          }
          row.shown++
          row.scoreSum += i.score
          perProduct.set(i.productId, row)
        }
      }
      for (const e of events) {
        if (!e.productId) continue
        const row = perProduct.get(e.productId)
        if (!row) continue
        if (e.type === 'ADD_TO_CART') row.carts++
        if (e.type === 'PURCHASE') { row.purchases++; row.revenue += e.value ?? 0 }
      }

      const topProducts = [...perProduct.entries()]
        .map(([productId, r]) => ({
          productId,
          name: r.name,
          sku: r.sku,
          shown: r.shown,
          avgMatch: r.shown ? Math.round((r.scoreSum / r.shown) * 100) / 100 : 0,
          addToCartRate: pct(r.carts, r.shown),
          purchases: r.purchases,
          revenue: Math.round(r.revenue * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue || b.shown - a.shown)
        .slice(0, 10)

      return {
        window: { days: window, from: from.toISOString() },
        summary: {
          connectedConsumers: activeGrants,
          newConnections: newGrants,
          newConnectionsDelta: delta(newGrants, prevNewGrants),
          promptsShown: shown,
          accepted,
          declined,
          acceptanceRate: pct(accepted, shown),
          revenueInfluenced: Math.round(revenue * 100) / 100,
          revenueDelta: delta(revenue, prevRevenue),
          orders: connectedPurchases.length,
          averageOrderValue: connectedPurchases.length
            ? Math.round((revenue / connectedPurchases.length) * 100) / 100
            : 0,
          revoked,
        },
        funnel: {
          recommendationsShown: recShown,
          productViews: viewed,
          addToCart: carts,
          saved: saves,
          purchases: connectedPurchases.length,
          returns,
          viewToCartRate: pct(carts, viewed),
          cartToPurchaseRate: pct(connectedPurchases.length, carts),
          returnRate: pct(returns, connectedPurchases.length),
        },
        surfaces: [...surfaces.entries()]
          .map(([surface, r]) => ({
            surface,
            shown: r.shown,
            accepted: r.accepted,
            acceptanceRate: pct(r.accepted, r.shown),
          }))
          .sort((a, b) => b.shown - a.shown),
        topProducts,
      }
    }
  )

  // ── Connected consumers ─────────────────────────────────────────────
  server.get(
    '/:brandId/connect/consumers',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const { status, limit } = z.object({
        status: z.enum(['active', 'revoked', 'all']).optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
      }).parse(request.query ?? {})

      const grants = await prisma.consentGrant.findMany({
        where: {
          brandId,
          ...(status === 'revoked' ? { status: 'REVOKED' as const }
            : status === 'all' ? {}
            : { status: 'ACTIVE' as const }),
        },
        orderBy: { grantedAt: 'desc' },
        take: limit ?? 50,
        select: {
          id: true, status: true, categories: true, surface: true,
          grantedAt: true, revokedAt: true, expiresAt: true,
          consumer: {
            select: {
              id: true, publicId: true, email: true, phone: true,
              endUsers: {
                where: { brandId },
                select: { firstName: true, lastName: true },
                take: 1,
              },
            },
          },
        },
      })

      const ids = grants.map(g => g.consumer.id)
      const [lastReads, purchases] = await Promise.all([
        prisma.consentAccessLog.groupBy({
          by: ['consumerId'],
          where: { brandId, consumerId: { in: ids } },
          _max: { createdAt: true },
        }),
        prisma.connectEvent.groupBy({
          by: ['consumerId'],
          where: { brandId, type: 'PURCHASE', consumerId: { in: ids } },
          _count: { _all: true },
          _sum: { value: true },
        }),
      ])
      const lastReadBy = new Map(lastReads.map(r => [r.consumerId, r._max.createdAt]))
      const purchaseBy = new Map(purchases.map(r => [r.consumerId, r]))

      return {
        consumers: grants.map(g => {
          const eu = g.consumer.endUsers[0]
          const p = purchaseBy.get(g.consumer.id)
          return {
            consumerId: g.consumer.publicId,
            name: eu ? [eu.firstName, eu.lastName].filter(Boolean).join(' ') || null : null,
            email: g.consumer.email,
            phone: g.consumer.phone,
            status: g.status.toLowerCase(),
            categories: g.categories,
            connectedVia: g.surface,
            connectedAt: g.grantedAt.toISOString(),
            disconnectedAt: g.revokedAt?.toISOString() ?? null,
            expiresAt: g.expiresAt?.toISOString() ?? null,
            lastReadAt: lastReadBy.get(g.consumer.id)?.toISOString() ?? null,
            orders: p?._count._all ?? 0,
            revenue: Math.round((p?._sum.value ?? 0) * 100) / 100,
          }
        }),
      }
    }
  )

  // ── One connected consumer ──────────────────────────────────────────
  server.get(
    '/:brandId/connect/consumers/:publicId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, publicId } = request.params as { brandId: string; publicId: string }

      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { focusAreas: true },
      })
      const consumer = await prisma.consumer.findUnique({
        where: { publicId },
        select: {
          id: true, publicId: true, email: true, phone: true,
          endUsers: { where: { brandId }, select: { firstName: true, lastName: true }, take: 1 },
        },
      })
      if (!consumer || !brand) throw new ApiError(404, 'Not found')

      const grant = await prisma.consentGrant.findUnique({
        where: { brandId_consumerId: { brandId, consumerId: consumer.id } },
      })
      if (!grant) throw new ApiError(403, 'No permission for this consumer')

      const categories = grant.categories.filter(c => brand.focusAreas.includes(c))

      // Revoked grants keep their audit trail visible, but not the profile.
      if (grant.status !== 'ACTIVE') {
        return {
          consumerId: consumer.publicId,
          permission: {
            status: grant.status.toLowerCase(),
            categories,
            purpose: grant.purpose,
            grantedAt: grant.grantedAt.toISOString(),
            revokedAt: grant.revokedAt?.toISOString() ?? null,
          },
          context: null,
          recommendations: [],
          activity: [],
        }
      }

      const context = await buildConnectContext({ consumerId: consumer.id, brandId, categories })
      const { items } = await matchCatalog({ brandId, context, categories, options: { limit: 5 } })

      const activity = await prisma.connectEvent.findMany({
        where: { brandId, consumerId: consumer.id },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        select: { type: true, sku: true, value: true, currency: true, surface: true, occurredAt: true, recommendationId: true },
      })

      const eu = consumer.endUsers[0]
      return {
        consumerId: consumer.publicId,
        identity: {
          name: eu ? [eu.firstName, eu.lastName].filter(Boolean).join(' ') || null : null,
          email: consumer.email,
          phone: consumer.phone,
        },
        permission: {
          status: 'active',
          categories,
          purpose: grant.purpose,
          grantedAt: grant.grantedAt.toISOString(),
          // Null throughout the pilot: access runs until the consumer revokes.
          expiresAt: grant.expiresAt?.toISOString() ?? null,
          storage: 'recommendations_only',
        },
        context: {
          preferences: context.preferences,
          outcomes: context.outcomes,
          intent: context.intent,
          confidence: context.confidence,
          collection: context.collection,
        },
        recommendations: items,
        activity: activity.map(a => ({
          type: a.type,
          sku: a.sku,
          value: a.value,
          currency: a.currency,
          surface: a.surface,
          recommendationId: a.recommendationId,
          at: a.occurredAt.toISOString(),
        })),
      }
    }
  )

  // ── Permission ledger ───────────────────────────────────────────────
  server.get(
    '/:brandId/connect/permissions',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const [grants, logs, counts] = await Promise.all([
        prisma.consentGrant.findMany({
          where: { brandId },
          orderBy: { grantedAt: 'desc' },
          take: 100,
          select: {
            id: true, status: true, categories: true, purpose: true,
            grantedAt: true, revokedAt: true, expiresAt: true,
            consumer: { select: { publicId: true } },
          },
        }),
        prisma.consentAccessLog.findMany({
          where: { brandId },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { action: true, scoped: true, detail: true, createdAt: true, consumerId: true },
        }),
        prisma.consentGrant.groupBy({
          by: ['status'],
          where: { brandId },
          _count: { _all: true },
        }),
      ])

      const publicIdOf = new Map(grants.map(g => [g.id, g.consumer.publicId]))

      return {
        counts: Object.fromEntries(counts.map(c => [c.status.toLowerCase(), c._count._all])),
        grants: grants.map(g => ({
          consumerId: g.consumer.publicId,
          status: g.status.toLowerCase(),
          categories: g.categories,
          purpose: g.purpose,
          grantedAt: g.grantedAt.toISOString(),
          revokedAt: g.revokedAt?.toISOString() ?? null,
          expiresAt: g.expiresAt?.toISOString() ?? null,
        })),
        accessLog: logs.map(l => ({
          action: l.action,
          scoped: l.scoped,
          detail: l.detail,
          at: l.createdAt.toISOString(),
        })),
        _publicIds: publicIdOf.size,
      }
    }
  )
}
