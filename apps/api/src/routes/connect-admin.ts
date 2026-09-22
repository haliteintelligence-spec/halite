import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { ApiError } from '../lib/errors.js'
import { requireBrandAdmin } from '../lib/auth.js'
import { buildConnectContext } from '../lib/connect-context.js'
import { matchCatalog } from '../lib/connect-match.js'
import { readSeasonal } from '../lib/seasonal.js'

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

      const context = await buildConnectContext({ consumerId: consumer.id, brandId, categories, signals: grant.signals })
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


  // ── Setup ───────────────────────────────────────────────────────────
  // Everything a brand needs to get Connect live, and an honest reading of
  // how far along it is.
  server.get(
    '/:brandId/connect/setup',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: {
          id: true, name: true, apiKey: true, focusAreas: true, primaryColor: true,
          shopifyShop: true, shopifyTokenEncrypted: true, shopifyToken: true,
        },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')

      const [products, lastUpload, grants, events, surfaces] = await Promise.all([
        prisma.product.findMany({
          where: { brandId, beautyArea: { in: brand.focusAreas } },
          select: { inStock: true, keyIngredients: true, ingredients: true, concerns: true, price: true, metadata: true },
        }),
        prisma.catalogUpload.findFirst({
          where: { brandId },
          orderBy: { createdAt: 'desc' },
          select: { fileName: true, source: true, status: true, rowCount: true, createdAt: true },
        }),
        prisma.consentGrant.count({ where: { brandId, status: 'ACTIVE' } }),
        prisma.connectEvent.groupBy({
          by: ['type'],
          where: { brandId },
          _count: { _all: true },
        }),
        prisma.connectEvent.groupBy({
          by: ['surface'],
          where: { brandId, type: 'PROMPT_SHOWN' },
          _count: { _all: true },
        }),
      ])

      const total = products.length
      const has = (fn: (p: typeof products[number]) => boolean) => products.filter(fn).length
      const noteCount = has(p => {
        const meta = p.metadata as Record<string, unknown> | null
        return Array.isArray(meta?.['notes']) && (meta!['notes'] as unknown[]).length > 0
      })

      const eventCounts = Object.fromEntries(events.map(e => [e.type, e._count._all]))
      const hasPurchases = (eventCounts['PURCHASE'] ?? 0) > 0

      // The four things that have to be true, in the order they unblock
      // each other.
      const steps = [
        {
          key: 'categories',
          label: 'Set your categories',
          done: brand.focusAreas.length > 0,
          detail: brand.focusAreas.length
            ? brand.focusAreas.join(', ').toLowerCase()
            : 'Connect cannot ask a shopper for anything until at least one is set',
        },
        {
          key: 'catalog',
          label: 'Connect your catalog',
          done: total > 0,
          detail: total
            ? `${total} products in your categories${brand.shopifyShop ? ` · Shopify (${brand.shopifyShop})` : lastUpload ? ` · ${lastUpload.fileName}` : ''}`
            : 'No products to rank yet',
        },
        {
          key: 'prompt',
          label: 'Place the Connect prompt',
          done: (eventCounts['PROMPT_SHOWN'] ?? 0) > 0,
          detail: (eventCounts['PROMPT_SHOWN'] ?? 0) > 0
            ? `${eventCounts['PROMPT_SHOWN']} prompts shown · ${grants} connected`
            : 'No prompt has been shown yet',
        },
        {
          key: 'events',
          label: 'Send outcomes back',
          done: hasPurchases,
          detail: hasPurchases
            ? `${eventCounts['PURCHASE']} purchases attributed`
            : 'Without purchase events there is no conversion reporting',
        },
      ]

      return {
        brand: {
          name: brand.name,
          apiKey: brand.apiKey,
          accentColor: brand.primaryColor ?? '#450F2A',
          categories: brand.focusAreas,
        },
        steps,
        catalog: {
          total,
          inStock: has(p => p.inStock),
          source: brand.shopifyShop
            ? { kind: 'shopify' as const, label: brand.shopifyShop, connected: Boolean(brand.shopifyTokenEncrypted ?? brand.shopifyToken) }
            : lastUpload
              ? { kind: 'upload' as const, label: lastUpload.fileName, connected: lastUpload.status === 'DONE' }
              : { kind: 'none' as const, label: 'Nothing connected', connected: false },
          lastSyncAt: lastUpload?.createdAt?.toISOString() ?? null,
          // What Halite could actually read off the catalog. Thin coverage
          // here is the usual reason matches come back weak.
          coverage: [
            { field: 'Key ingredients', filled: has(p => p.keyIngredients.length > 0), total },
            { field: 'Full ingredient list', filled: has(p => p.ingredients.length > 0), total },
            { field: 'Concerns targeted', filled: has(p => p.concerns.length > 0), total },
            { field: 'Notes / scent profile', filled: noteCount, total },
            { field: 'Price', filled: has(p => p.price > 0), total },
          ],
        },
        placements: surfaces.map(s => ({ surface: s.surface ?? 'unspecified', shown: s._count._all })),
        events: eventCounts,
      }
    }
  )

  // ── Audience insights ───────────────────────────────────────────────
  // Aggregated across consumers who granted this brand access. Individual
  // profiles never appear here, and the whole view is withheld until the
  // group is large enough that a row cannot be traced back to one person.
  server.get(
    '/:brandId/connect/insights',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const MIN_COHORT = 20

      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { focusAreas: true },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')

      // One context per consumer — the most recent ranking we built for them.
      const recs = await prisma.recommendation.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        select: { consumerId: true, context: true },
      })
      const latest = new Map<string, unknown>()
      for (const r of recs) if (!latest.has(r.consumerId)) latest.set(r.consumerId, r.context)

      const cohort = latest.size
      if (cohort < MIN_COHORT) {
        return {
          cohort,
          minimumCohort: MIN_COHORT,
          suppressed: true,
          demand: [], unmet: [], outcomes: [], budget: null,
        }
      }

      // What connected shoppers want, counted per person.
      const wanted = new Map<string, number>()
      const avoided = new Map<string, number>()
      const concerns = new Map<string, number>()
      const budgets: number[] = []
      for (const ctx of latest.values()) {
        const c = ctx as {
          preferences?: { liked?: string[]; avoided?: string[]; concerns?: string[] }
          intent?: { budget_max?: number | null }
        }
        for (const a of new Set(c.preferences?.liked ?? [])) wanted.set(a, (wanted.get(a) ?? 0) + 1)
        for (const a of new Set(c.preferences?.avoided ?? [])) avoided.set(a, (avoided.get(a) ?? 0) + 1)
        for (const a of new Set(c.preferences?.concerns ?? [])) concerns.set(a, (concerns.get(a) ?? 0) + 1)
        const b = c.intent?.budget_max
        if (typeof b === 'number' && b > 0) budgets.push(b)
      }

      // What the catalog actually offers.
      const products = await prisma.product.findMany({
        where: { brandId, beautyArea: { in: brand.focusAreas } },
        select: { id: true, name: true, keyIngredients: true, ingredients: true, concerns: true, price: true, metadata: true },
      })
      const catalogAttr = new Map<string, number>()
      for (const p of products) {
        const attrs = new Set<string>()
        for (const k of p.keyIngredients) attrs.add(k.toLowerCase())
        for (const i of p.ingredients) attrs.add(i.toLowerCase())
        const meta = p.metadata as Record<string, unknown> | null
        const notes = meta?.['notes']
        if (Array.isArray(notes)) for (const n of notes) if (typeof n === 'string') attrs.add(n.toLowerCase())
        for (const a of attrs) catalogAttr.set(a, (catalogAttr.get(a) ?? 0) + 1)
      }

      const pctOf = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10)

      const demand = [...wanted.entries()]
        .map(([attribute, people]) => ({
          attribute,
          wantedPct: pctOf(people, cohort),
          stockedPct: pctOf(catalogAttr.get(attribute) ?? 0, products.length),
          people,
          products: catalogAttr.get(attribute) ?? 0,
        }))
        .sort((a, b) => (b.wantedPct - b.stockedPct) - (a.wantedPct - a.stockedPct))
        .slice(0, 12)

      // Wanted by a real share of the audience, and barely stocked.
      const unmet = demand
        .filter(d => d.wantedPct >= 10 && d.stockedPct < d.wantedPct / 2)
        .slice(0, 6)

      // Over-stocked relative to demand — the other half of an assortment gap.
      const overstocked = [...catalogAttr.entries()]
        .map(([attribute, count]) => ({
          attribute,
          stockedPct: pctOf(count, products.length),
          wantedPct: pctOf(wanted.get(attribute) ?? 0, cohort),
        }))
        .filter(x => x.stockedPct >= 20 && x.wantedPct < x.stockedPct / 2)
        .sort((a, b) => (b.stockedPct - b.wantedPct) - (a.stockedPct - a.wantedPct))
        .slice(0, 6)

      // What actually happened to what we recommended.
      const [purchases, returns, carts] = await Promise.all([
        prisma.connectEvent.groupBy({ by: ['productId'], where: { brandId, type: 'PURCHASE', productId: { not: null } }, _count: { _all: true }, _sum: { value: true } }),
        prisma.connectEvent.groupBy({ by: ['productId'], where: { brandId, type: 'RETURNED', productId: { not: null } }, _count: { _all: true } }),
        prisma.connectEvent.groupBy({ by: ['productId'], where: { brandId, type: 'ADD_TO_CART', productId: { not: null } }, _count: { _all: true } }),
      ])
      const nameOf = new Map(products.map(p => [p.id, p.name]))
      const returnBy = new Map(returns.map(r => [r.productId, r._count._all]))
      const cartBy = new Map(carts.map(r => [r.productId, r._count._all]))

      const outcomes = purchases
        .map(p => ({
          productId: p.productId!,
          name: nameOf.get(p.productId!) ?? 'Unknown product',
          purchases: p._count._all,
          revenue: Math.round((p._sum.value ?? 0) * 100) / 100,
          addedToCart: cartBy.get(p.productId!) ?? 0,
          returns: returnBy.get(p.productId!) ?? 0,
          keptPct: pctOf(p._count._all - (returnBy.get(p.productId!) ?? 0), p._count._all),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)

      budgets.sort((a, b) => a - b)
      const median = budgets.length ? budgets[Math.floor(budgets.length / 2)]! : null

      return {
        cohort,
        minimumCohort: MIN_COHORT,
        suppressed: false,
        catalogSize: products.length,
        demand,
        unmet,
        overstocked,
        avoided: [...avoided.entries()]
          .map(([attribute, people]) => ({ attribute, pct: pctOf(people, cohort), people }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 8),
        concerns: [...concerns.entries()]
          .map(([concern, people]) => ({ concern, pct: pctOf(people, cohort), people }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 8),
        budget: median != null ? { median, sample: budgets.length } : null,
        outcomes,
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

  // ── Who is mid-turn ─────────────────────────────────────────────────
  // The dashboard's "time to reach out" list. Seasonality is a timing
  // signal, and timing is only useful before the moment passes — so this
  // surfaces the shoppers whose own logs show them changing what they
  // reach for, while the change is still happening.
  //
  // Brand-facing only. Nothing here sends anything to anyone.
  server.get(
    '/:brandId/connect/transitions',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() })
        .parse(request.query ?? {})

      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { focusAreas: true },
      })
      if (!brand) throw new ApiError(404, 'Not found')

      const grants = await prisma.consentGrant.findMany({
        where: { brandId, status: 'ACTIVE' },
        select: {
          categories: true,
          consumer: {
            select: {
              id: true, publicId: true, email: true, lastHallieSyncAt: true,
              endUsers: { where: { brandId }, select: { firstName: true, lastName: true }, take: 1 },
            },
          },
        },
        take: limit ?? 100,
      })

      const rows = []
      for (const g of grants) {
        const areas = g.categories.filter(c => brand.focusAreas.includes(c))
        if (areas.length === 0) continue
        const read = await readSeasonal({ consumerId: g.consumer.id, areas })
        if (!read.in_transition) continue

        const eu = g.consumer.endUsers[0]
        rows.push({
          consumerId: g.consumer.publicId,
          name: eu ? [eu.firstName, eu.lastName].filter(Boolean).join(' ') || null : null,
          email: g.consumer.email,
          direction: read.direction,
          phase: read.phase,
          season: read.season,
          reason: read.reason,
          confidence: read.confidence,
          // What they are moving toward, so a merchandiser can act on it
          // without opening the profile.
          favour: read.favour.slice(0, 5).map(f => f.attribute),
          lastSyncedAt: g.consumer.lastHallieSyncAt?.toISOString() ?? null,
        })
      }

      rows.sort((a, b) => b.confidence - a.confidence)
      return { transitions: rows, count: rows.length }
    },
  )
}
