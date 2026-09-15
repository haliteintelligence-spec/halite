import { prisma } from '@halite/db'
import type { BeautyArea } from '@halite/db'
import { hallieCategoriesFor, type HallieCategory } from './hallie-quiz.js'

/**
 * Reads the shopper's Hallie preference profile into signals a catalog can
 * be matched on.
 *
 * This is where a consumer's identity actually lives. Halite's own tables
 * only know what someone did inside a brand — quizzes taken there, products
 * logged there — so a shopper who built their profile in Hallie and then
 * walked into a brand looked, to Connect, like a blank page. Every product
 * scored the same base and the brand saw "35% match" on everything.
 *
 * Only the categories the grant covers are read. A skincare-and-body brand
 * never sees the hair, makeup or fragrance answers.
 */

/** What a concern is usually solved with. Drives "liked", and the reasons. */
const CONCERN_INGREDIENTS: Record<string, string[]> = {
  hyperpigmentation: ['niacinamide', 'vitamin c', 'tranexamic acid', 'alpha arbutin', 'kojic acid', 'azelaic acid'],
  dark_spots:        ['niacinamide', 'vitamin c', 'tranexamic acid', 'alpha arbutin'],
  acne:              ['salicylic acid', 'niacinamide', 'benzoyl peroxide', 'zinc', 'tea tree'],
  dehydration:       ['hyaluronic acid', 'glycerin', 'panthenol', 'squalane'],
  dryness:           ['shea butter', 'ceramides', 'squalane', 'glycerin', 'jojoba oil', 'urea'],
  dullness:          ['vitamin c', 'lactic acid', 'glycolic acid', 'niacinamide'],
  pores:             ['niacinamide', 'salicylic acid', 'zinc'],
  redness:           ['centella asiatica', 'azelaic acid', 'allantoin', 'panthenol'],
  texture:           ['lactic acid', 'glycolic acid', 'retinol', 'urea'],
  aging:             ['retinol', 'peptides', 'vitamin c', 'matrixyl'],
  fine_lines:        ['retinol', 'peptides', 'matrixyl'],
  uneven_tone:       ['niacinamide', 'vitamin c', 'alpha arbutin', 'lactic acid'],
  firmness:          ['peptides', 'collagen', 'retinol'],
  keratosis_pilaris: ['urea', 'lactic acid', 'salicylic acid'],
  ingrown_hairs:     ['salicylic acid', 'glycolic acid', 'witch hazel'],
  oiliness:          ['niacinamide', 'salicylic acid', 'clay'],
  damage:            ['bond builder', 'protein', 'ceramides'],
  frizz:             ['argan oil', 'shea butter', 'glycerin'],
  scalp:             ['tea tree', 'salicylic acid', 'peppermint'],
  thinning:          ['rosemary oil', 'caffeine', 'biotin'],
  large_pores:       ['niacinamide', 'salicylic acid'],
}

/** Hallie's concern vocabulary onto Halite's SkinConcern enum. */
const CONCERN_ENUM: Record<string, string> = {
  acne: 'ACNE', hyperpigmentation: 'HYPERPIGMENTATION', dark_spots: 'HYPERPIGMENTATION',
  aging: 'AGING', fine_lines: 'AGING', dryness: 'DRYNESS', dehydration: 'DEHYDRATION',
  oiliness: 'OILINESS', redness: 'REDNESS', dullness: 'DULLNESS', texture: 'UNEVEN_TEXTURE',
  pores: 'PORES', large_pores: 'PORES', uneven_tone: 'HYPERPIGMENTATION',
}

const FACE_TYPE_ENUM: Record<string, string> = {
  dry: 'DRY', oily: 'OILY', combination: 'COMBINATION', normal: 'NORMAL', sensitive: 'SENSITIVE',
}

/** Top of the band the shopper selected. "_plus" bands take their floor. */
function budgetCeiling(bands: string[]): number | null {
  let max: number | null = null
  for (const b of bands) {
    let value: number | null = null
    if (b.startsWith('under_')) value = Number(b.slice(6))
    else if (b.endsWith('_plus')) value = Number(b.slice(0, -5))
    else {
      const parts = b.split('_').map(Number)
      if (parts.length === 2 && parts.every(n => Number.isFinite(n))) value = parts[1]!
    }
    if (value != null && Number.isFinite(value) && (max == null || value > max)) max = value
  }
  return max
}

/**
 * Actives that work but tend to sting reactive skin. Not avoidances — the
 * shopper may well want them — so they are flagged on the card rather than
 * filtered out, and they cost a product some ground against a gentler one.
 */
const STRONG_ACTIVES = [
  'glycolic acid', 'lactic acid', 'salicylic acid', 'mandelic acid',
  'retinol', 'retinaldehyde', 'benzoyl peroxide', 'ascorbic acid',
]

export interface HalliePreferenceSignals {
  concerns: string[]        // Halite SkinConcern values, for catalog matching
  rawConcerns: string[]     // Hallie's own words, for explanations
  liked: string[]
  /**
   * The subset of `liked` inferred from a concern rather than stated.
   *
   * These are what usually solves the problem the shopper named, not
   * something they asked for — so they are evidence that a product
   * addresses a concern, not a second preference on top of it. The matcher
   * weights them lower to avoid paying twice for one fit.
   */
  likedDerived: string[]
  avoided: string[]
  /** Fine for most people, worth a word of warning for this one. */
  cautioned: string[]
  skinType: string | null
  sensitivity: 'yes' | 'somewhat' | 'no' | null
  texture: string | null
  routineComplexity: string | null
  budgetMax: number | null
  categories: HallieCategory[]
  /** True when a profile was actually found — otherwise nothing was read. */
  found: boolean
}

const EMPTY: HalliePreferenceSignals = {
  concerns: [], rawConcerns: [], liked: [], likedDerived: [], avoided: [], cautioned: [],
  skinType: null, sensitivity: null, texture: null, routineComplexity: null,
  budgetMax: null, categories: [], found: false,
}

export async function readHalliePreferences(args: {
  hallieUserId: string | null
  areas: BeautyArea[]
}): Promise<HalliePreferenceSignals> {
  if (!args.hallieUserId) return EMPTY

  const categories = hallieCategoriesFor(args.areas)
  if (categories.length === 0) return EMPTY

  try {
    const rows = await prisma.$queryRaw<Array<{ category: string; answers: string }>>`
      SELECT category, answers
      FROM hallie_testing.hallie_testing_preference_responses
      WHERE "userId" = ${args.hallieUserId}
        AND category = ANY(${categories})
    `
    if (rows.length === 0) return { ...EMPTY, categories }

    const rawConcerns = new Set<string>()
    const liked = new Set<string>()
    const avoided = new Set<string>()
    const budgets: string[] = []
    let skinType: string | null = null
    let sensitivity: HalliePreferenceSignals['sensitivity'] = null
    let texture: string | null = null
    let routineComplexity: string | null = null
    let wantsScent = false

    for (const row of rows) {
      let answers: Record<string, string[]>
      try {
        answers = JSON.parse(row.answers) as Record<string, string[]>
      } catch { continue }

      const take = (key: string): string[] => {
        const v = answers[key]
        return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
      }

      for (const key of [
        'primary_face_concern', 'secondary_face_concerns',
        'primary_body_concern', 'secondary_body_concerns',
        'primary_hair_concern', 'secondary_hair_concerns', 'concerns',
      ]) {
        for (const c of take(key)) if (c !== 'none') rawConcerns.add(c)
      }

      // Face type describes the face; body skin_type only stands in when
      // there is no face answer, otherwise "normal body, combination face"
      // resolves to normal and the face profile is lost.
      const face = take('face_type')[0]
      if (face) skinType = FACE_TYPE_ENUM[face] ?? skinType
      const body = take('skin_type')[0]
      if (body && !skinType) skinType = FACE_TYPE_ENUM[body] ?? null

      const s = take('sensitivity')[0]
      if (s === 'yes' || s === 'somewhat' || s === 'no') sensitivity = s

      const t = take('texture_preference')[0]
      if (t && !texture) texture = t

      const rc = take('routine_complexity')[0]
      if (rc && !routineComplexity) routineComplexity = rc

      if (take('scent_preference').includes('strongly_scented')) wantsScent = true

      budgets.push(...take('budget'))
    }

    // Concerns become the ingredients that answer them. This is the step that
    // turns a stated worry into something a catalog can be ranked against —
    // and it is tracked separately, because these are inferred from the
    // concern rather than asked for.
    const derived = new Set<string>()
    for (const c of rawConcerns) {
      for (const ing of CONCERN_INGREDIENTS[c] ?? []) {
        liked.add(ing)
        derived.add(ing)
      }
    }

    // Reactive skin is a constraint, not a preference. Fragrance is only an
    // avoidance when they have not asked for scent elsewhere — plenty of
    // people want a scented body lotion and a fragrance-free serum.
    const cautioned = new Set<string>()
    if (sensitivity === 'yes') {
      avoided.add('denatured alcohol')
      avoided.add('sd alcohol')
      if (!wantsScent) avoided.add('fragrance')
      // Keep them rankable — someone working on dark marks may want an acid
      // — but never recommend one to reactive skin without saying so.
      for (const a of STRONG_ACTIVES) cautioned.add(a)
    }

    const concerns = [...rawConcerns]
      .map(c => CONCERN_ENUM[c])
      .filter((c): c is string => Boolean(c))

    return {
      concerns: [...new Set(concerns)],
      rawConcerns: [...rawConcerns],
      liked: [...liked],
      likedDerived: [...derived],
      avoided: [...avoided],
      cautioned: [...cautioned],
      skinType,
      sensitivity,
      texture,
      routineComplexity,
      budgetMax: budgetCeiling(budgets),
      categories,
      found: true,
    }
  } catch (err) {
    console.warn('[hallie-preferences] read skipped:', err)
    return EMPTY
  }
}
