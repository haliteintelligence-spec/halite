import { prisma } from '@halite/db'
import type { BeautyArea, ProductCategory } from '@halite/db'

/**
 * What the shopper actually wears together, and how much of it is left.
 *
 * Two things a rating alone cannot tell a brand: what their product gets
 * layered with, and when it will run out. Both come from the mirror.
 *
 * The de-identification rule holds throughout. A brand's own products are
 * named; every other product in the same routine is a position, a type and
 * its attributes — notes for fragrance, ingredients everywhere else. Whose
 * it is never travels, which is what makes it safe to say "yours is worn
 * over a vanilla-tonka body cream" inside a competitor's storefront.
 */

/** One product inside a routine, named or not depending on who sold it. */
export interface RoutineStep {
  position: number
  /** Present only when the requesting brand sold it. */
  productId: string | null
  name: string | null
  yours: boolean
  category: ProductCategory | null
  product_type: string | null
  attributes: string[]
}

export interface RoutineView {
  name: string | null
  time_of_day: string | null
  everyday: boolean
  /** True when one of the brand's own products is in it. */
  includes_yours: boolean
  steps: RoutineStep[]
}

/** A dated combination the shopper actually put on, with their own reason. */
export interface LayeringView {
  day: string
  slot: string | null
  why: string | null
  moods: string[]
  occasions: string[]
  includes_yours: boolean
  steps: RoutineStep[]
}

/**
 * How one of the brand's products performs alongside something else.
 *
 * Only pairings that recur, because a pairing seen once says nothing — the
 * same threshold the attribute tally uses.
 */
export interface CoUse {
  /** The brand's own product, named. */
  productId: string
  name: string
  /** What it was worn with, described rather than identified. */
  with_type: string | null
  with_category: ProductCategory | null
  with_attributes: string[]
  times_together: number
  /** Mean of both sides, on the five-point scale. */
  pair_avg_rating: number | null
  rating_scale: number
}

export interface ReplenishmentItem {
  productId: string
  name: string
  sku: string | null
  /** 0–100. `stated` when the shopper set it, `estimated` when we worked it out. */
  level: number | null
  level_source: 'stated' | 'estimated' | 'empty' | 'unknown'
  /** Null when there is no burn rate to project from. */
  days_remaining: number | null
  runs_out_on: string | null
  uses_per_week: number | null
  is_empty: boolean
  emptied_on: string | null
  repurchased: boolean
  /** Unopened spares. A reorder is not due while these are above zero. */
  backups: number
}

/** Cadence for everything the brand did not sell, with the products removed. */
export interface ReplenishmentCadence {
  beautyArea: BeautyArea | null
  product_type: string | null
  /** How often a product of this type gets replaced, in weeks. */
  replace_every_weeks: number | null
  uses_per_week: number | null
  products_count: number
  /** Only counts products that have actually been finished. */
  emptied_count: number
}

const RATING_SCALE = 5
const MIN_TOGETHER = 2

/**
 * Shelf rating on one five-point scale.
 *
 * Hallie keeps two: `rating` is the quick star out of ten, `feedbackRating`
 * the considered answer out of five, given alongside outcome tags. The
 * feedback form wins where they disagree, because it is the more deliberate
 * of the two and it comes with the tags that explain it.
 */
function ratingOf(sp: { rating: number | null; feedbackRating: number | null }): number | null {
  if (sp.feedbackRating != null) return sp.feedbackRating
  return sp.rating != null ? sp.rating / 2 : null
}

type ShelfRow = {
  id: string
  productId: string | null
  beautyArea: BeautyArea | null
  category: ProductCategory | null
  productType: string | null
  attributes: string[]
  rating: number | null
  feedbackRating: number | null
  initialLevel: number | null
  statedLevel: number | null
  statedLevelAt: Date | null
  isEmpty: boolean
  emptiedAt: Date | null
  repurchasedAt: Date | null
  backupCount: number
  wasReturned: boolean
  product: { id: string; name: string; externalId: string | null; brandId: string } | null
}

function stepFor(sp: ShelfRow | undefined, position: number, brandId: string): RoutineStep {
  const yours = sp?.product?.brandId === brandId
  return {
    position,
    productId: yours ? sp!.product!.id : null,
    name: yours ? sp!.product!.name : null,
    yours,
    category: sp?.category ?? null,
    product_type: sp?.productType ?? null,
    // Attributes travel for everyone. That is the whole point: a brand
    // learns what theirs sits next to without learning whose it is.
    attributes: (sp?.attributes ?? []).slice(0, 8),
  }
}

export async function buildRoutines(opts: {
  consumerId: string
  brandId: string
  areas: BeautyArea[]
}): Promise<{
  routines: RoutineView[]
  layerings: LayeringView[]
  co_use: CoUse[]
  replenishment: { yours: ReplenishmentItem[]; cadence: ReplenishmentCadence[] }
}> {
  const { consumerId, brandId, areas } = opts

  const shelf = await prisma.hallieShelfProduct.findMany({
    where: { consumerId },
    select: {
      id: true, productId: true, beautyArea: true, category: true, productType: true,
      attributes: true, rating: true, feedbackRating: true,
      initialLevel: true, statedLevel: true, statedLevelAt: true,
      isEmpty: true, emptiedAt: true, repurchasedAt: true,
      backupCount: true, wasReturned: true,
      product: { select: { id: true, name: true, externalId: true, brandId: true } },
    },
  })
  const byId = new Map(shelf.map(s => [s.id, s as ShelfRow]))

  // ── How often each product is actually used ────────────────────────
  // Counted over the window it has been logged in, not since it was added:
  // something bought in January and started in June is used weekly, not
  // monthly.
  const logs = await prisma.hallieLogItem.findMany({
    where: { log: { consumerId } },
    select: { shelfProductId: true, log: { select: { loggedAt: true } } },
  })
  const uses = new Map<string, Date[]>()
  for (const l of logs) {
    if (!l.shelfProductId) continue
    const list = uses.get(l.shelfProductId) ?? []
    list.push(l.log.loggedAt)
    uses.set(l.shelfProductId, list)
  }
  function usesPerWeek(shelfId: string): number | null {
    const dates = (uses.get(shelfId) ?? []).sort((a, b) => a.getTime() - b.getTime())
    if (dates.length < 2) return null
    const spanDays = (dates[dates.length - 1]!.getTime() - dates[0]!.getTime()) / 864e5
    if (spanDays < 7) return null
    return Math.round((dates.length / (spanDays / 7)) * 10) / 10
  }

  // ── Routines ───────────────────────────────────────────────────────
  const routineRows = await prisma.hallieRoutine.findMany({
    where: { consumerId },
    select: {
      name: true, timeOfDay: true, isEveryday: true,
      items: { select: { position: true, shelfProductId: true }, orderBy: { position: 'asc' } },
    },
  })

  const inScope = (sp: ShelfRow | undefined) =>
    !sp?.beautyArea || areas.length === 0 || areas.includes(sp.beautyArea)

  const routines: RoutineView[] = routineRows.map(r => {
    const steps = r.items.map((i, idx) => stepFor(byId.get(i.shelfProductId ?? ''), idx + 1, brandId))
    return {
      name: r.name,
      time_of_day: r.timeOfDay,
      everyday: r.isEveryday,
      includes_yours: steps.some(s => s.yours),
      steps,
    }
  })

  const layeringRows = await prisma.hallieLayering.findMany({
    where: { consumerId },
    orderBy: { dayKey: 'desc' },
    take: 60,
    select: { dayKey: true, slot: true, why: true, moods: true, occasions: true, shelfProductIds: true },
  })
  const layerings: LayeringView[] = layeringRows.map(l => {
    const steps = l.shelfProductIds.map((id, i) => stepFor(byId.get(id), i + 1, brandId))
    return {
      day: l.dayKey,
      slot: l.slot,
      why: l.why,
      moods: l.moods,
      occasions: l.occasions,
      includes_yours: steps.some(s => s.yours),
      steps,
    }
  })

  // ── Co-use ─────────────────────────────────────────────────────────
  // Every combination the brand's product appeared in, whether that came
  // from a saved routine or a single day's choice.
  const combos: string[][] = [
    ...routineRows.map(r => r.items.map(i => i.shelfProductId).filter((x): x is string => Boolean(x))),
    ...layeringRows.map(l => l.shelfProductIds),
  ]
  const pairs = new Map<string, { mine: ShelfRow; other: ShelfRow; n: number }>()
  for (const combo of combos) {
    const rows = combo.map(id => byId.get(id)).filter((r): r is ShelfRow => Boolean(r))
    const mine = rows.filter(r => r.product?.brandId === brandId)
    const others = rows.filter(r => r.product?.brandId !== brandId)
    for (const m of mine) {
      for (const o of others) {
        const key = `${m.id}|${o.id}`
        const hit = pairs.get(key) ?? { mine: m, other: o, n: 0 }
        hit.n++
        pairs.set(key, hit)
      }
    }
  }

  const co_use: CoUse[] = []
  for (const { mine, other, n } of pairs.values()) {
    // One pairing is a coincidence, the same way one reaction is.
    if (n < MIN_TOGETHER) continue
    const rm = ratingOf(mine)
    const ro = ratingOf(other)
    const both = [rm, ro].filter((x): x is number => x != null)
    co_use.push({
      productId: mine.product!.id,
      name: mine.product!.name,
      with_type: other.productType,
      with_category: other.category,
      with_attributes: other.attributes.slice(0, 8),
      times_together: n,
      pair_avg_rating: both.length
        ? Math.round((both.reduce((a, b) => a + b, 0) / both.length) * 10) / 10
        : null,
      rating_scale: RATING_SCALE,
    })
  }
  co_use.sort((a, b) => b.times_together - a.times_together)

  // ── Replenishment ──────────────────────────────────────────────────
  // Stated truth first. Only where the shopper has not told us does the
  // burn rate get to guess, and a guess is labelled as one.
  function levelFor(sp: ShelfRow): { level: number | null; source: ReplenishmentItem['level_source']; perWeek: number | null; days: number | null } {
    const perWeek = usesPerWeek(sp.id)
    if (sp.isEmpty) return { level: 0, source: 'empty', perWeek, days: 0 }

    const anchor = sp.statedLevel ?? sp.initialLevel
    const anchoredAt = sp.statedLevel != null ? sp.statedLevelAt : null
    if (anchor == null) return { level: null, source: 'unknown', perWeek, days: null }

    // With no usage history there is nothing to project, so the anchor
    // stands on its own and is reported as what it is.
    if (perWeek == null) {
      return {
        level: anchor,
        source: sp.statedLevel != null ? 'stated' : 'unknown',
        perWeek: null,
        days: null,
      }
    }

    // Roughly 1.5% of a container per use. Crude, and corrected the moment
    // the shopper states a level or marks it empty — which is what makes
    // the estimate converge rather than drift.
    const PER_USE = 1.5
    const since = anchoredAt ?? sp.statedLevelAt
    const weeksSince = since ? (Date.now() - since.getTime()) / (7 * 864e5) : 0
    const burned = weeksSince > 0 ? weeksSince * perWeek * PER_USE : 0
    const level = Math.max(0, Math.round(anchor - burned))
    const days = perWeek > 0 ? Math.round((level / (perWeek * PER_USE)) * 7) : null
    return { level, source: sp.statedLevel != null ? 'stated' : 'estimated', perWeek, days }
  }

  const yoursItems: ReplenishmentItem[] = []
  for (const sp of shelf as ShelfRow[]) {
    if (sp.product?.brandId !== brandId) continue
    if (!inScope(sp)) continue
    const { level, source, perWeek, days } = levelFor(sp)
    yoursItems.push({
      productId: sp.product.id,
      name: sp.product.name,
      sku: sp.product.externalId,
      level,
      level_source: source,
      days_remaining: days,
      runs_out_on: days != null ? new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) : null,
      uses_per_week: perWeek,
      is_empty: sp.isEmpty,
      emptied_on: sp.emptiedAt?.toISOString().slice(0, 10) ?? null,
      repurchased: sp.repurchasedAt != null,
      backups: sp.backupCount,
    })
  }
  // Someone with a spare in the cupboard is not due a reorder, however low
  // the current bottle is — so they sort behind everyone who is.
  yoursItems.sort((a, b) =>
    (a.backups > 0 ? 1 : 0) - (b.backups > 0 ? 1 : 0) ||
    (a.days_remaining ?? 1e9) - (b.days_remaining ?? 1e9))

  // Everything else becomes a rhythm rather than a calendar: how often a
  // product of this type gets replaced, which is what a subscription needs
  // without handing over a dated inventory of one person's shelf.
  type Bucket = { area: BeautyArea | null; type: string | null; perWeek: number[]; weeks: number[]; n: number; emptied: number }
  const buckets = new Map<string, Bucket>()
  for (const sp of shelf as ShelfRow[]) {
    if (sp.product?.brandId === brandId) continue
    const key = `${sp.beautyArea ?? ''}|${sp.productType ?? ''}`
    const b = buckets.get(key) ?? { area: sp.beautyArea, type: sp.productType, perWeek: [], weeks: [], n: 0, emptied: 0 }
    b.n++
    const pw = usesPerWeek(sp.id)
    if (pw != null) b.perWeek.push(pw)
    // A return is not a finished bottle, so it teaches nothing about how
    // long one lasts and is left out of the replacement interval.
    if (sp.isEmpty && sp.emptiedAt && !sp.wasReturned) {
      b.emptied++
      // Only a finished product tells us how long one lasts.
      const dates = (uses.get(sp.id) ?? []).sort((a, b2) => a.getTime() - b2.getTime())
      const start = dates[0]
      if (start) b.weeks.push((sp.emptiedAt.getTime() - start.getTime()) / (7 * 864e5))
    }
    buckets.set(key, b)
  }
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)
  const cadence: ReplenishmentCadence[] = [...buckets.values()].map(b => ({
    beautyArea: b.area,
    product_type: b.type,
    replace_every_weeks: mean(b.weeks),
    uses_per_week: mean(b.perWeek),
    products_count: b.n,
    emptied_count: b.emptied,
  }))
  cadence.sort((a, b) => b.products_count - a.products_count)

  return { routines, layerings, co_use, replenishment: { yours: yoursItems, cadence } }
}
