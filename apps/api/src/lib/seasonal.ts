import { prisma } from '@halite/db'
import type { BeautyArea, ClimateType } from '@halite/db'

/**
 * What the weather is asking of someone right now, and which way they are
 * already moving.
 *
 * Three sources, in order of how much they are trusted:
 *
 *  1. A prior. Hand-written, per beauty area — cold and dry asks for heavier
 *     textures and denser notes; hot and humid asks for lighter ones. It is a
 *     starting guess so the feature works on day one, not a rule.
 *
 *  2. The cohort. What people in the same climate actually did at this point
 *     in the year, learned from Hallie's logs. Silent until there are enough
 *     of them to mean anything.
 *
 *  3. The person. Their own shift, from their own logs — the last month
 *     against the three before it, and the same weeks a year ago when there
 *     is a year to look at.
 *
 * Where they disagree, the person wins. Someone who wears oud through August
 * keeps being shown oud: the prior is what we assume about strangers, and
 * they stop being a stranger the moment they log something.
 *
 * The read is driven by weather rather than the calendar. "Autumn" means
 * nothing in Lagos, but a humidity drop means the same thing everywhere, and
 * it also catches a warm spring in a city that should be cold.
 */

/** How the weather is leaning, independent of what month it is called. */
export type WeatherPhase =
  | 'COLD_DRY'      // heating season: barrier, occlusives, denser notes
  | 'COLD_HUMID'
  | 'MILD'
  | 'WARM_HUMID'    // sweat, shine, slip — lighter everything
  | 'WARM_DRY'      // high UV, dehydration without heaviness

export interface SeasonalRead {
  phase: WeatherPhase
  /** The calendar season, for copy. Hemisphere-aware; null in the tropics. */
  season: string | null
  climate: ClimateType | null
  /** Degrees and points of humidity against this person's own 12-month norm. */
  temp_delta_c: number | null
  humidity_delta: number | null
  /** Which way they are already moving, if their logs show it. */
  direction: 'HEAVIER' | 'LIGHTER' | 'STEADY' | 'UNKNOWN'
  /** Attributes to favour now, and by how much (0–1). */
  favour: Array<{ attribute: string; weight: number }>
  /** Attributes to ease off. Never a hard exclusion — this is timing, not fit. */
  damp: Array<{ attribute: string; weight: number }>
  /** Which of the three sources actually contributed. */
  sources: { prior: boolean; cohort: boolean; personal: boolean }
  /** 0–1. Personal evidence raises it; a bare prior keeps it low. */
  confidence: number
  /** Plain sentence for the product card. Null when there is nothing to say. */
  reason: string | null
  /** True when they are mid-turn — the window a nudge is worth sending in. */
  in_transition: boolean
}

/**
 * The prior.
 *
 * Deliberately short. These are the shifts almost everyone makes, not a
 * theory of skincare — anything subtler should be learned rather than
 * asserted.
 */
const PRIOR: Record<WeatherPhase, Partial<Record<BeautyArea, { favour: string[]; damp: string[] }>>> = {
  COLD_DRY: {
    SKINCARE: {
      favour: ['ceramides', 'shea butter', 'squalane', 'cream', 'balm', 'occlusive', 'urea', 'panthenol'],
      damp:   ['gel', 'clay', 'astringent', 'foaming'],
    },
    BODY: {
      favour: ['shea butter', 'body butter', 'cream', 'ceramides', 'urea'],
      damp:   ['gel', 'lotion'],
    },
    HAIR: { favour: ['oil', 'mask', 'bond builder', 'shea butter'], damp: ['clarifying', 'volumising'] },
    FRAGRANCE: {
      favour: ['oud', 'amber', 'vanilla', 'tonka', 'incense', 'patchouli', 'leather', 'benzoin', 'spicy amber', 'gourmand'],
      damp:   ['marine', 'aquatic', 'citrus', 'neroli', 'green'],
    },
  },
  COLD_HUMID: {
    SKINCARE: { favour: ['ceramides', 'cream', 'niacinamide'], damp: ['occlusive', 'heavy oil'] },
    BODY:     { favour: ['cream', 'shea butter'], damp: ['gel'] },
    FRAGRANCE:{ favour: ['amber', 'woody', 'vanilla', 'incense'], damp: ['aquatic', 'citrus'] },
  },
  MILD: {},
  WARM_HUMID: {
    SKINCARE: {
      favour: ['gel', 'niacinamide', 'salicylic acid', 'lightweight', 'lotion', 'clay'],
      damp:   ['balm', 'occlusive', 'shea butter', 'heavy oil', 'body butter'],
    },
    BODY:     { favour: ['gel', 'lotion', 'lightweight'], damp: ['body butter', 'heavy oil'] },
    HAIR:     { favour: ['clarifying', 'lightweight', 'anti-humidity'], damp: ['heavy oil', 'butter'] },
    FRAGRANCE:{
      favour: ['citrus', 'neroli', 'bergamot', 'marine', 'aquatic', 'green', 'floral', 'fresh'],
      damp:   ['oud', 'incense', 'leather', 'heavy amber'],
    },
  },
  WARM_DRY: {
    SKINCARE: {
      favour: ['hyaluronic acid', 'glycerin', 'spf', 'lotion', 'lightweight', 'antioxidant', 'vitamin c'],
      damp:   ['balm', 'occlusive'],
    },
    BODY:     { favour: ['lotion', 'glycerin', 'spf'], damp: ['body butter'] },
    FRAGRANCE:{ favour: ['citrus', 'floral', 'neroli', 'musk', 'fresh'], damp: ['oud', 'incense'] },
  },
}

/** Weather onto a phase. Thresholds are deliberately coarse. */
function phaseOf(tempC: number | null, humidity: number | null): WeatherPhase {
  if (tempC == null) return 'MILD'
  const humid = (humidity ?? 55) >= 65
  if (tempC <= 12) return humid ? 'COLD_HUMID' : 'COLD_DRY'
  if (tempC >= 24) return humid ? 'WARM_HUMID' : 'WARM_DRY'
  return 'MILD'
}

/** Hemisphere-aware, and null where the four-season frame does not apply. */
function seasonName(lat: number | null, climate: ClimateType | null): string | null {
  if (lat == null) return null
  if (climate === 'TROPICAL') return null
  const m = new Date().getMonth()
  const north = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter']
  const south = ['Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer']
  return (lat < 0 ? south : north)[m]!
}

/** Attributes that read as heavier, for calling the direction of a shift. */
const HEAVY = new Set([
  'balm', 'butter', 'body butter', 'occlusive', 'cream', 'shea butter', 'ceramides',
  'oil', 'heavy oil', 'urea', 'oud', 'incense', 'leather', 'amber', 'patchouli',
])
const LIGHT = new Set([
  'gel', 'lotion', 'lightweight', 'serum', 'mist', 'water', 'foaming', 'clarifying',
  'citrus', 'neroli', 'bergamot', 'marine', 'aquatic', 'green', 'fresh',
])

type Window = { attrs: Map<string, number>; items: number }

/** Attribute counts across a slice of the shopper's own logs. */
async function windowFor(consumerId: string, fromDays: number, toDays: number, areas: BeautyArea[]): Promise<Window> {
  const now = Date.now()
  const from = new Date(now - fromDays * 864e5)
  const to = new Date(now - toDays * 864e5)
  const rows = await prisma.hallieLogItem.findMany({
    where: {
      log: { consumerId, loggedAt: { gte: from, lt: to } },
      ...(areas.length ? { shelfProduct: { beautyArea: { in: areas } } } : {}),
    },
    select: { shelfProduct: { select: { attributes: true } } },
  })
  const attrs = new Map<string, number>()
  for (const r of rows) {
    for (const a of r.shelfProduct?.attributes ?? []) attrs.set(a, (attrs.get(a) ?? 0) + 1)
  }
  return { attrs, items: rows.length }
}

/** Share of a window's logged attributes that read heavy, minus light. */
function heaviness(w: Window): number | null {
  let heavy = 0
  let light = 0
  for (const [a, n] of w.attrs) {
    if (HEAVY.has(a)) heavy += n
    if (LIGHT.has(a)) light += n
  }
  const total = heavy + light
  return total < 3 ? null : (heavy - light) / total
}

/** What this climate's other users were logging around now, a year over. */
async function cohortShift(climate: ClimateType | null, areas: BeautyArea[]): Promise<Map<string, number> | null> {
  if (!climate) return null
  const week = 7 * 864e5
  const now = Date.now()
  const rows = await prisma.hallieLogItem.findMany({
    where: {
      log: {
        loggedAt: { gte: new Date(now - 3 * week), lt: new Date(now + 1 * week) },
        consumer: { endUsers: { some: { beautyProfile: { climateTag: climate } } } },
      },
      ...(areas.length ? { shelfProduct: { beautyArea: { in: areas } } } : {}),
    },
    select: { shelfProduct: { select: { attributes: true } } },
    take: 5000,
  })
  // Below this the "cohort" is a handful of people and says nothing.
  const MIN_COHORT_ITEMS = 120
  if (rows.length < MIN_COHORT_ITEMS) return null

  const counts = new Map<string, number>()
  for (const r of rows) for (const a of r.shelfProduct?.attributes ?? []) counts.set(a, (counts.get(a) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  const max = top[0]?.[1] ?? 1
  return new Map(top.map(([a, n]) => [a, n / max]))
}

export async function readSeasonal(opts: {
  consumerId: string
  areas: BeautyArea[]
}): Promise<SeasonalRead> {
  const { consumerId, areas } = opts

  // ── Where they are, and what it is doing ────────────────────────────
  const profile = await prisma.userBeautyProfile.findFirst({
    where: { endUser: { consumerId } },
    select: { lat: true, climateTag: true, climateSnapshot: true },
    orderBy: { updatedAt: 'desc' },
  })
  const snap = profile?.climateSnapshot as Record<string, unknown> | null
  const tempC = typeof snap?.['tempAvgC'] === 'number' ? (snap['tempAvgC'] as number) : null
  const humidity = typeof snap?.['humidityAvg'] === 'number' ? (snap['humidityAvg'] as number) : null

  const phase = phaseOf(tempC, humidity)
  const climate = profile?.climateTag ?? null
  const season = seasonName(profile?.lat ?? null, climate)

  const favour = new Map<string, number>()
  const damp = new Map<string, number>()
  const bump = (m: Map<string, number>, a: string, w: number) =>
    m.set(a, Math.min(1, (m.get(a) ?? 0) + w))

  // ── 1. Prior ────────────────────────────────────────────────────────
  let usedPrior = false
  for (const area of areas) {
    const rule = PRIOR[phase][area]
    if (!rule) continue
    usedPrior = true
    for (const a of rule.favour) bump(favour, a, 0.35)
    for (const a of rule.damp) bump(damp, a, 0.3)
  }

  // ── 2. Cohort ───────────────────────────────────────────────────────
  const cohort = await cohortShift(climate, areas)
  if (cohort) for (const [a, w] of cohort) bump(favour, a, w * 0.3)

  // ── 3. The person ───────────────────────────────────────────────────
  const recent = await windowFor(consumerId, 30, 0, areas)
  const before = await windowFor(consumerId, 120, 30, areas)
  const lastYear = await windowFor(consumerId, 395, 335, areas)

  const hRecent = heaviness(recent)
  const hBefore = heaviness(before)

  let direction: SeasonalRead['direction'] = 'UNKNOWN'
  let personal = false

  if (hRecent != null && hBefore != null) {
    personal = true
    const delta = hRecent - hBefore
    direction = delta > 0.18 ? 'HEAVIER' : delta < -0.18 ? 'LIGHTER' : 'STEADY'

    // Their own move outranks the prior, including when it contradicts it.
    if (direction !== 'STEADY') {
      for (const [a, n] of recent.attrs) {
        const was = before.attrs.get(a) ?? 0
        if (n > was) {
          bump(favour, a, 0.5)
          damp.delete(a)
        }
      }
    }
  } else if (hRecent != null) {
    personal = true
    direction = 'STEADY'
  }

  // A year of history: what they reached for at this point last time.
  if (lastYear.items >= 5) {
    personal = true
    for (const [a, n] of lastYear.attrs) {
      if (n >= 2) { bump(favour, a, 0.4); damp.delete(a) }
    }
  }

  // ── Confidence and copy ─────────────────────────────────────────────
  let confidence = 0
  if (usedPrior) confidence += 0.25
  if (cohort) confidence += 0.2
  if (personal) confidence += 0.35
  if (lastYear.items >= 5) confidence += 0.2
  confidence = Math.round(Math.min(0.95, confidence) * 100) / 100

  const inTransition = direction === 'HEAVIER' || direction === 'LIGHTER'

  let reason: string | null = null
  if (direction === 'HEAVIER') {
    reason = season
      ? `You have been reaching for heavier textures since ${season.toLowerCase()} set in`
      : 'You have been reaching for heavier textures this past month'
  } else if (direction === 'LIGHTER') {
    reason = season
      ? `You have been moving lighter as ${season.toLowerCase()} came in`
      : 'You have been moving lighter this past month'
  } else if (usedPrior && phase !== 'MILD') {
    const where = climate === 'TROPICAL' ? 'where you are' : season ? season.toLowerCase() : 'right now'
    reason = phase === 'COLD_DRY' || phase === 'COLD_HUMID'
      ? `Cold and dry ${where} — this sits in what that asks for`
      : `Warm ${where} — this sits in what that asks for`
  }

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([attribute, weight]) => ({
      attribute, weight: Math.round(weight * 100) / 100,
    }))

  return {
    phase,
    season,
    climate,
    temp_delta_c: tempC,
    humidity_delta: humidity,
    direction,
    favour: top(favour, 20),
    damp: top(damp, 12),
    sources: { prior: usedPrior, cohort: cohort !== null, personal },
    confidence,
    reason,
    in_transition: inTransition,
  }
}
