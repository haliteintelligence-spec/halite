import { prisma } from '@halite/db'
import type { BeautyArea, ConnectEventType } from '@halite/db'
import { buildConnectContext } from './connect-context.js'
import { matchCatalog } from './connect-match.js'

/**
 * Populates Halite Connect activity for a brand.
 *
 * Used to give demo environments something real to show, and to backfill a
 * brand that existed before Connect. Recommendations are produced by the
 * actual matcher against the actual catalog, so the explanations a prospect
 * reads in the dashboard are the ones the product would really generate —
 * only the consent and the storefront events are synthesised.
 *
 * Idempotent per brand: it skips consumers who already have a grant, so
 * running it twice does not double-count.
 */

// Where prompts get shown, and how well each placement converts. These
// mirror what the pilot design assumes: a product page earns its consent,
// checkout does not.
const SURFACES: Array<{ name: string; share: number; acceptance: number }> = [
  { name: 'pdp',        share: 0.48, acceptance: 0.68 },
  { name: 'quiz',       share: 0.20, acceptance: 0.75 },
  { name: 'collection', share: 0.22, acceptance: 0.51 },
  { name: 'checkout',   share: 0.10, acceptance: 0.20 },
]

// What happens after someone sees a ranked list.
const VIEW_RATE = 0.74
const CART_RATE = 0.26      // of viewers
const WISHLIST_RATE = 0.18  // of viewers
const PURCHASE_RATE = 0.36  // of carts
const RETURN_RATE = 0.04    // of purchases
const REVOKE_RATE = 0.03

export interface SeedConnectOptions {
  brandId: string
  /** How many consumers end up connected. Capped by how many the brand has. */
  grants?: number
  /** How far back activity is spread. */
  days?: number
  seed?: number
}

export interface SeedConnectResult {
  grants: number
  skipped: number
  prompts: number
  declines: number
  recommendations: number
  events: number
  revoked: number
}

/** Deterministic PRNG so a demo seeded twice looks the same. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pickSurface(r: number): typeof SURFACES[number] {
  let acc = 0
  for (const s of SURFACES) {
    acc += s.share
    if (r <= acc) return s
  }
  return SURFACES[SURFACES.length - 1]!
}

export async function seedConnectActivity(opts: SeedConnectOptions): Promise<SeedConnectResult> {
  const { brandId } = opts
  const wanted = opts.grants ?? 60
  const days = opts.days ?? 30
  const random = rng(opts.seed ?? 42)

  const out: SeedConnectResult = {
    grants: 0, skipped: 0, prompts: 0, declines: 0,
    recommendations: 0, events: 0, revoked: 0,
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, focusAreas: true },
  })
  if (!brand) throw new Error(`Brand ${brandId} not found`)
  if (brand.focusAreas.length === 0) {
    throw new Error('Brand has no categories — Connect cannot request anything for it')
  }

  const categories = brand.focusAreas as BeautyArea[]

  // Consumers who have actually used this brand, and do not already have a
  // grant. Ordered by how much they have logged, so the seeded profiles are
  // the ones with something to say.
  const candidates = await prisma.endUser.findMany({
    where: {
      brandId,
      consumerId: { not: null },
      consumer: { consentGrants: { none: { brandId } } },
    },
    select: { consumerId: true, _count: { select: { checkIns: true } } },
    orderBy: { checkIns: { _count: 'desc' } },
    take: wanted * 2,
  })

  const existing = await prisma.consentGrant.count({ where: { brandId } })
  out.skipped = existing

  const chosen = candidates.slice(0, wanted)
  const now = Date.now()
  const spread = days * 24 * 60 * 60 * 1000
  const events: Array<{
    brandId: string
    consumerId?: string | null
    recommendationId?: string | null
    productId?: string | null
    sku?: string | null
    type: ConnectEventType
    surface: string
    value?: number | null
    currency?: string
    visitorId?: string | null
    occurredAt: Date
  }> = []

  for (const cand of chosen) {
    const consumerId = cand.consumerId!
    const surface = pickSurface(random())
    const at = new Date(now - random() * spread)
    const visitorId = Math.floor(random() * 1e16).toString(16)

    events.push({ brandId, type: 'PROMPT_SHOWN', surface: surface.name, visitorId, occurredAt: at })
    out.prompts++

    // Not everyone who sees the prompt connects.
    if (random() > surface.acceptance) {
      events.push({ brandId, type: 'CONNECT_DECLINED', surface: surface.name, visitorId, occurredAt: at })
      out.declines++
      continue
    }

    const revoked = random() < REVOKE_RATE
    const grant = await prisma.consentGrant.create({
      data: {
        brandId,
        consumerId,
        categories,
        purpose: 'product_recommendations',
        status: revoked ? 'REVOKED' : 'ACTIVE',
        surface: surface.name,
        grantedAt: at,
        ...(revoked ? { revokedAt: new Date(at.getTime() + spread * 0.3 * random()) } : {}),
      },
      select: { id: true },
    })
    out.grants++
    if (revoked) out.revoked++

    events.push({
      brandId, consumerId, type: 'CONNECT_ACCEPTED',
      surface: surface.name, visitorId, occurredAt: at,
    })

    // A revoked grant leaves its history behind but gets no new activity.
    if (revoked) continue

    // Real context, real ranking — only the browsing is invented.
    const context = await buildConnectContext({ consumerId, brandId, categories })
    const { items, scored } = await matchCatalog({
      brandId, context, categories, options: { limit: 4 },
    })
    if (items.length === 0) continue

    const shownAt = new Date(at.getTime() + 60_000)
    const rec = await prisma.recommendation.create({
      data: {
        brandId, consumerId, grantId: grant.id,
        context: context as unknown as object,
        items: items as unknown as object,
        surface: surface.name,
        createdAt: shownAt,
      },
      select: { id: true },
    })
    out.recommendations++

    await prisma.consentAccessLog.createMany({
      data: [
        { grantId: grant.id, brandId, consumerId, action: 'context', createdAt: at },
        {
          grantId: grant.id, brandId, consumerId, action: 'recommendations',
          scoped: scored, detail: { recommendationId: rec.id, returned: items.length },
          createdAt: shownAt,
        },
      ],
    })

    events.push({
      brandId, consumerId, recommendationId: rec.id, type: 'RECOMMENDATION_SHOWN',
      surface: surface.name, occurredAt: shownAt,
    })

    const top = items[0]!
    if (random() > VIEW_RATE) continue

    const viewedAt = new Date(shownAt.getTime() + 2 * 60_000)
    events.push({
      brandId, consumerId, recommendationId: rec.id, productId: top.productId,
      sku: top.sku, type: 'PRODUCT_VIEWED', surface: surface.name, occurredAt: viewedAt,
    })

    if (random() < WISHLIST_RATE) {
      events.push({
        brandId, consumerId, recommendationId: rec.id, productId: top.productId,
        sku: top.sku, type: 'WISHLISTED', surface: surface.name,
        occurredAt: new Date(viewedAt.getTime() + 60_000),
      })
    }

    if (random() > CART_RATE) continue

    const cartAt = new Date(viewedAt.getTime() + 4 * 60_000)
    events.push({
      brandId, consumerId, recommendationId: rec.id, productId: top.productId,
      sku: top.sku, type: 'ADD_TO_CART', surface: surface.name, occurredAt: cartAt,
    })

    if (random() > PURCHASE_RATE) continue

    const boughtAt = new Date(cartAt.getTime() + 9 * 60_000)
    events.push({
      brandId, consumerId, recommendationId: rec.id, productId: top.productId,
      sku: top.sku, type: 'PURCHASE', surface: surface.name,
      value: top.price, currency: top.currency, occurredAt: boughtAt,
    })

    if (random() < RETURN_RATE) {
      events.push({
        brandId, consumerId, recommendationId: rec.id, productId: top.productId,
        sku: top.sku, type: 'RETURNED', surface: surface.name,
        value: top.price, currency: top.currency,
        occurredAt: new Date(boughtAt.getTime() + 6 * 24 * 60 * 60 * 1000),
      })
    }
  }

  if (events.length) {
    await prisma.connectEvent.createMany({ data: events })
    out.events = events.length
  }

  return out
}
