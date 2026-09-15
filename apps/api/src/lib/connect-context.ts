import { prisma } from '@halite/db'
import type { BeautyArea, ProductCategory, ProductReaction } from '@halite/db'
import { readHalliePreferences } from './hallie-preferences.js'

/**
 * Builds the permissioned context a partner brand receives for a consumer.
 *
 * Two rules govern everything here:
 *
 *  1. Category scope. Only the beauty areas the grant authorizes are read.
 *     A fragrance brand never sees a skincare profile, whatever it asks for.
 *
 *  2. Two sources, one profile. What the shopper stated in Hallie and what
 *     their logged outcomes revealed are merged here. Stated preferences are
 *     most of what a new shopper has — without them a consumer who built
 *     their profile in Hallie and walked into a brand reads as a blank page.
 *
 *  3. Cross-brand de-identification. A consumer's collection spans every
 *     brand they have ever used. The requesting brand sees its OWN products
 *     named in full — it sold them — and everything else as attributes only:
 *     notes, ingredients, category, outcome. No brand name, no product name,
 *     no price, no retailer. This is the line that makes a portable profile
 *     safe to carry into a competitor's storefront.
 */

export interface OwnedProductNamed {
  productId: string
  name: string
  sku: string | null
  category: ProductCategory
  outcome: ProductReaction | null
  firstSeenAt: string
}

export interface OwnedProductAnonymous {
  category: ProductCategory
  beautyArea: BeautyArea
  attributes: string[]
  outcome: ProductReaction | null
}

export interface ConnectContext {
  consumer_id: string
  /**
   * Contact details. Brands DO receive these — Connect is not an anonymous
   * channel; it is a permissioned one. What it withholds is other brands'
   * commercial relationships, not who the shopper is.
   */
  identity: {
    name: string | null
    email: string | null
    phone: string | null
  }
  categories: BeautyArea[]
  preferences: {
    liked: string[]
    /** The subset of `liked` inferred from a concern rather than stated. */
    liked_derived: string[]
    avoided: string[]
    /** Rankable, but flagged on the card — see hallie-preferences. */
    cautioned: string[]
    concerns: string[]
    /** Hallie's own words for the concerns, for explanations. */
    stated_concerns: string[]
    skin_type: string | null
    sensitivity: string | null
    texture: string | null
    routine_complexity: string | null
    intensity: string | null
  }
  /** Which of the two sources actually contributed. */
  sources: { hallie_preferences: boolean; logged_outcomes: boolean }
  collection: {
    /** Products in the requesting brand's own catalog — named in full. */
    yours: OwnedProductNamed[]
    /** Everything else — attributes only, never identity. */
    elsewhere: OwnedProductAnonymous[]
  }
  outcomes: {
    positive: string[]
    negative: string[]
  }
  intent: {
    budget_max: number | null
    currency: string
  }
  confidence: number
  generated_at: string
}

/** Beauty areas a product category belongs to, for scope filtering. */
function inScope(area: BeautyArea, categories: BeautyArea[]): boolean {
  return categories.includes(area)
}

/** Pulls the descriptive attributes that are safe to share for any product. */
function attributesOf(p: {
  keyIngredients: string[]
  ingredients: string[]
  concerns: string[]
  metadata: unknown
}): string[] {
  const out = new Set<string>()
  for (const k of p.keyIngredients) out.add(k.toLowerCase())
  // Fragrance notes live in metadata; the catalog processor writes them there.
  const meta = p.metadata as Record<string, unknown> | null
  const notes = meta?.['notes']
  if (Array.isArray(notes)) for (const n of notes) if (typeof n === 'string') out.add(n.toLowerCase())
  const family = meta?.['family']
  if (typeof family === 'string') out.add(family.toLowerCase())
  // Fall back to the general ingredient list only when nothing richer exists,
  // and cap it — a full INCI list is a fingerprint, not a preference signal.
  if (out.size === 0) for (const i of p.ingredients.slice(0, 6)) out.add(i.toLowerCase())
  return [...out].slice(0, 12)
}

export async function buildConnectContext(opts: {
  consumerId: string
  brandId: string
  categories: BeautyArea[]
}): Promise<ConnectContext> {
  const { consumerId, brandId, categories } = opts

  const consumer = await prisma.consumer.findUnique({
    where: { id: consumerId },
    select: {
      publicId: true,
      email: true,
      phone: true,
      hallieUserId: true,
      prefillAnswers: true,
      endUsers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          beautyProfile: true,
          checkIns: {
            orderBy: { date: 'desc' },
            take: 40,
            select: {
              date: true,
              products: {
                select: {
                  reaction: true,
                  product: {
                    select: {
                      id: true, brandId: true, name: true, externalId: true,
                      category: true, beautyArea: true, keyIngredients: true,
                      ingredients: true, concerns: true, metadata: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  if (!consumer) throw new Error(`Consumer ${consumerId} not found`)

  // ── What they told Hallie ───────────────────────────────────────────
  // Read first, because for most shoppers this is the whole profile.
  const stated = await readHalliePreferences({
    hallieUserId: consumer.hallieUserId,
    areas: categories,
  })

  // ── Preferences, pooled across every brand this consumer has used ───
  const liked = new Set<string>(stated.liked)
  const avoided = new Set<string>(stated.avoided)
  const concerns = new Set<string>(stated.concerns)
  let skinType: string | null = stated.skinType
  let budgetMax: number | null = stated.budgetMax
  let currency = 'USD'

  for (const eu of consumer.endUsers) {
    const p = eu.beautyProfile
    if (!p) continue
    if (inScope('SKINCARE', categories)) {
      if (p.skinType && !skinType) skinType = p.skinType
      for (const c of p.skinConcerns) concerns.add(c)
    }
    if (p.spendMax != null && (budgetMax == null || p.spendMax > budgetMax)) budgetMax = p.spendMax
    if (p.spendCurrency) currency = p.spendCurrency

    // Area-specific JSON profiles carry the liked/avoided vocabulary.
    const areaProfiles: Array<[BeautyArea, unknown]> = [
      ['FRAGRANCE', p.fragranceProfile],
      ['HAIR', p.hairProfile],
      ['MAKEUP', p.makeupProfile],
      ['BODY', p.bodyProfile],
      ['NAILS', p.nailsProfile],
      ['WELLNESS', p.wellnessProfile],
    ]
    for (const [area, raw] of areaProfiles) {
      if (!inScope(area, categories)) continue
      const prof = raw as Record<string, unknown> | null
      if (!prof) continue
      for (const key of ['liked', 'notes_liked', 'preferred_notes', 'preferences']) {
        const v = prof[key]
        if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') liked.add(x.toLowerCase())
      }
      for (const key of ['avoided', 'notes_avoided', 'avoidances', 'dislikes']) {
        const v = prof[key]
        if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') avoided.add(x.toLowerCase())
      }
    }
  }

  // ── Collection, split by who sold it ────────────────────────────────
  const yours = new Map<string, OwnedProductNamed>()
  const elsewhere: OwnedProductAnonymous[] = []

  // How often each attribute shows up in something that worked versus
  // something that did not. Counted rather than collected: one bad reaction
  // to a ten-ingredient serum is not evidence against all ten ingredients,
  // and treating it that way marks staples like niacinamide and ceramides as
  // avoidances, which then penalises almost every product in a catalog.
  const tally = new Map<string, { pos: number; neg: number }>()
  function record(attr: string, outcome: 'pos' | 'neg') {
    const row = tally.get(attr) ?? { pos: 0, neg: 0 }
    row[outcome]++
    tally.set(attr, row)
  }

  for (const eu of consumer.endUsers) {
    for (const ci of eu.checkIns) {
      for (const cp of ci.products) {
        const prod = cp.product
        if (!inScope(prod.beautyArea, categories)) continue

        const attrs = attributesOf(prod)
        if (cp.reaction === 'POSITIVE') for (const a of attrs) record(a, 'pos')
        if (cp.reaction === 'NEGATIVE') for (const a of attrs) record(a, 'neg')

        if (prod.brandId === brandId) {
          // The brand's own product. It already knows this one exists.
          const existing = yours.get(prod.id)
          if (!existing) {
            yours.set(prod.id, {
              productId: prod.id,
              name: prod.name,
              sku: prod.externalId,
              category: prod.category,
              outcome: cp.reaction ?? null,
              firstSeenAt: ci.date.toISOString(),
            })
          } else if (!existing.outcome && cp.reaction) {
            existing.outcome = cp.reaction
          }
        } else {
          // Someone else's product. Attributes travel; identity does not.
          elsewhere.push({
            category: prod.category,
            beautyArea: prod.beautyArea,
            attributes: attrs,
            outcome: cp.reaction ?? null,
          })
        }
      }
    }
  }

  // An attribute only becomes a signal when it recurs AND leans one way.
  // A single reaction is noise; an even split means the attribute is not
  // what drove the outcome.
  const MIN_OCCURRENCES = 2
  const LEAN = 1.5

  const positive: string[] = []
  const negative: string[] = []
  for (const [attr, { pos, neg }] of tally) {
    if (pos >= MIN_OCCURRENCES && pos > neg * LEAN) positive.push(attr)
    else if (neg >= MIN_OCCURRENCES && neg > pos * LEAN) negative.push(attr)
  }
  // Strongest evidence first, so a truncated list keeps the best signals.
  const strength = (a: string, k: 'pos' | 'neg') => {
    const t = tally.get(a)!
    return t[k] - t[k === 'pos' ? 'neg' : 'pos']
  }
  positive.sort((a, b) => strength(b, 'pos') - strength(a, 'pos'))
  negative.sort((a, b) => strength(b, 'neg') - strength(a, 'neg'))

  // What worked repeatedly is a preference; what failed repeatedly is an
  // avoidance. Anything the consumer stated outright already sits in these.
  for (const a of positive) liked.add(a)
  for (const a of negative) avoided.add(a)
  // A stated preference wins over an inferred avoidance.
  for (const a of liked) avoided.delete(a)

  // Confidence tracks how much the profile is actually built on. A stated
  // profile counts for more than a single logged reaction, because the
  // shopper said it about themselves on purpose.
  const signals =
    liked.size + avoided.size + concerns.size +
    yours.size + elsewhere.length + (skinType ? 1 : 0) + (budgetMax ? 1 : 0) +
    (stated.found ? 6 : 0)
  const confidence = Math.min(0.95, Math.round((signals / 20) * 100) / 100)

  const named = consumer.endUsers.find(e => e.firstName || e.lastName)
  const name = named
    ? [named.firstName, named.lastName].filter(Boolean).join(' ') || null
    : null

  return {
    consumer_id: consumer.publicId,
    identity: { name, email: consumer.email, phone: consumer.phone },
    categories,
    preferences: {
      liked: [...liked].slice(0, 20),
      // Anything the outcomes proved is a real preference, whatever its
      // origin — so a derived ingredient that then worked stops being
      // derived.
      liked_derived: stated.likedDerived.filter(a => !positive.includes(a)),
      avoided: [...avoided].slice(0, 20),
      cautioned: stated.cautioned,
      concerns: [...concerns],
      stated_concerns: stated.rawConcerns,
      skin_type: skinType,
      sensitivity: stated.sensitivity,
      texture: stated.texture,
      routine_complexity: stated.routineComplexity,
      intensity: null,
    },
    sources: {
      hallie_preferences: stated.found,
      logged_outcomes: tally.size > 0,
    },
    collection: {
      yours: [...yours.values()],
      // Collapse duplicates so a brand cannot count how many bottles of a
      // given shape someone owns — a small-N re-identification path.
      elsewhere: dedupeAnonymous(elsewhere),
    },
    outcomes: {
      positive: positive.slice(0, 20),
      negative: negative.slice(0, 20),
    },
    intent: { budget_max: budgetMax, currency },
    confidence,
    generated_at: new Date().toISOString(),
  }
}

function dedupeAnonymous(items: OwnedProductAnonymous[]): OwnedProductAnonymous[] {
  const seen = new Map<string, OwnedProductAnonymous>()
  for (const it of items) {
    const key = `${it.category}|${it.attributes.slice().sort().join(',')}|${it.outcome ?? ''}`
    if (!seen.has(key)) seen.set(key, it)
  }
  return [...seen.values()].slice(0, 40)
}
