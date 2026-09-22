import { prisma } from '@halite/db'
import type { BeautyArea, ProductCategory, ProductReaction, AttributeSource, ConsentSignal } from '@halite/db'
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

/** How one of the brand's own products has actually performed for them. */
export interface ProductFeedback {
  productId: string
  name: string
  sku: string | null
  category: ProductCategory
  /** Mean of every rating they have given it, on Hallie's scale. */
  avg_rating: number | null
  rating_scale: number
  ratings_count: number
  would_repurchase: boolean | null
  outcome: ProductReaction | null
  outcome_tags: string[]
  /** Makeup only, and null everywhere else. */
  wear_duration: string | null
  end_of_day_look: string | null
  first_logged: string
  last_logged: string
}

/**
 * How everything else they own has performed, with the products stripped out.
 *
 * One row per product type plus attribute set, never per product: a brand
 * learns that vanilla-and-tonka eau de parfum averages 4.6 for this person
 * across three bottles, and cannot learn which three.
 */
export interface OutcomeAggregate {
  beautyArea: BeautyArea
  category: ProductCategory | null
  product_type: string | null
  attributes: string[]
  /** CATALOG attributes are verified; INFERRED were looked up from a name. */
  attribute_source: AttributeSource
  avg_rating: number | null
  rating_scale: number
  ratings_count: number
  products_count: number
  repurchase_rate: number | null
  outcome_tags: string[]
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
    /** How strongly they wear fragrance: light | moderate | strong. */
    intensity: string | null
    /** Whether a scent should hold or evolve. */
    longevity: string | null
    /** Fragrance families, in the shopper's own picks. */
    families: string[]
  }
  /** When they wear it, and how fast they get through it. */
  usage: {
    occasions: string[]
    usage_intensity: string | null
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
  /** Per-product, for the brand's own catalog. */
  product_feedback: ProductFeedback[]
  /** De-identified, across everything else they own. */
  outcome_aggregates: OutcomeAggregate[]
  /** Which signal groups this grant actually carried. */
  signals: ConsentSignal[]
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

/** Everything except RETAILERS, which only the shopper can add. */
const DEFAULT_SIGNALS: ConsentSignal[] = [
  'PREFERENCES', 'COLLECTION', 'PRODUCT_FEEDBACK', 'CROSS_BRAND', 'SENSITIVITIES', 'INTENT',
]

/** Hallie rates out of 5. Sent alongside every average so a brand never guesses. */
const RATING_SCALE = 5

export async function buildConnectContext(opts: {
  consumerId: string
  brandId: string
  categories: BeautyArea[]
  /** Omitted by callers that predate signal-level consent; they get the default. */
  signals?: ConsentSignal[]
}): Promise<ConnectContext> {
  const { consumerId, brandId, categories } = opts
  // Named apart from the confidence tally's own `signals` further down.
  const grantSignals = opts.signals?.length ? opts.signals : DEFAULT_SIGNALS
  const allows = (s: ConsentSignal) => grantSignals.includes(s)

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

  // ── The Hallie mirror ───────────────────────────────────────────────
  // Ratings and outcomes, synced across on a cadence. Cross-brand rows span
  // every category the shopper logs, by design: the aggregate is stripped of
  // the products, so widening it costs no identity. The brand's own products
  // stay inside the granted categories, because those are named.
  const shelf = (allows('PRODUCT_FEEDBACK') || allows('CROSS_BRAND'))
    ? await prisma.hallieShelfProduct.findMany({
        where: { consumerId },
        select: {
          id: true, productId: true, beautyArea: true, category: true, productType: true,
          attributes: true, attributeSource: true,
          product: { select: { id: true, name: true, externalId: true, brandId: true, category: true } },
          logItems: {
            select: {
              rating: true, wouldRepurchase: true, outcomeTags: true,
              wearDuration: true, endOfDayLook: true,
              log: { select: { loggedAt: true, beautyArea: true } },
            },
          },
        },
      })
    : []

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

  // ── Per-product feedback, for this brand's own catalog ──────────────
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

  const product_feedback: ProductFeedback[] = []
  if (allows('PRODUCT_FEEDBACK')) {
    for (const sp of shelf) {
      const prod = sp.product
      if (!prod || prod.brandId !== brandId) continue
      if (sp.beautyArea && !inScope(sp.beautyArea, categories)) continue

      const ratings = sp.logItems.map(i => i.rating).filter((r): r is number => typeof r === 'number')
      const dates = sp.logItems.map(i => i.log.loggedAt).sort((a, b) => a.getTime() - b.getTime())
      if (dates.length === 0) continue

      // The most recent answer wins: someone who repurchased once and then
      // said no has changed their mind, and the brand should see the latter.
      const repurchase = [...sp.logItems].reverse().find(i => i.wouldRepurchase !== null)?.wouldRepurchase ?? null
      const avg = mean(ratings)

      product_feedback.push({
        productId: prod.id,
        name: prod.name,
        sku: prod.externalId,
        category: prod.category,
        avg_rating: avg,
        rating_scale: RATING_SCALE,
        ratings_count: ratings.length,
        would_repurchase: repurchase,
        // Derived from the rating rather than stored twice, so the two can
        // never disagree.
        outcome: avg == null ? null : avg >= 4 ? 'POSITIVE' : avg <= 2 ? 'NEGATIVE' : 'NEUTRAL',
        outcome_tags: [...new Set(sp.logItems.flatMap(i => i.outcomeTags))].slice(0, 10),
        wear_duration: [...sp.logItems].reverse().find(i => i.wearDuration)?.wearDuration ?? null,
        end_of_day_look: [...sp.logItems].reverse().find(i => i.endOfDayLook)?.endOfDayLook ?? null,
        first_logged: dates[0]!.toISOString(),
        last_logged: dates[dates.length - 1]!.toISOString(),
      })
    }
    product_feedback.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
  }

  // ── Cross-brand aggregates, with the products stripped out ──────────
  // Grouped by type plus attribute set so a brand reads a pattern rather than
  // a shelf. A group of one still reports products_count: 1, which is the
  // honest thing to say — it just is not much evidence.
  const outcome_aggregates: OutcomeAggregate[] = []
  if (allows('CROSS_BRAND')) {
    type Bucket = {
      beautyArea: BeautyArea
      category: ProductCategory | null
      product_type: string | null
      attributes: string[]
      attribute_source: AttributeSource
      ratings: number[]
      repurchase: boolean[]
      tags: Set<string>
      products: number
    }
    const buckets = new Map<string, Bucket>()

    for (const sp of shelf) {
      // Anything this brand sold is already named above; counting it again
      // here would let a brand subtract one list from the other.
      if (sp.product?.brandId === brandId) continue
      const area = sp.beautyArea ?? sp.logItems[0]?.log.beautyArea ?? null
      if (!area) continue

      const attrs = [...sp.attributes].sort()
      const key = `${area}|${sp.category ?? ''}|${sp.productType ?? ''}|${attrs.join(',')}`
      const bucket = buckets.get(key) ?? {
        beautyArea: area,
        category: sp.category,
        product_type: sp.productType,
        attributes: attrs.slice(0, 12),
        attribute_source: sp.attributeSource,
        ratings: [], repurchase: [], tags: new Set<string>(), products: 0,
      }
      bucket.products++
      for (const it of sp.logItems) {
        if (typeof it.rating === 'number') bucket.ratings.push(it.rating)
        if (it.wouldRepurchase !== null) bucket.repurchase.push(it.wouldRepurchase)
        for (const t of it.outcomeTags) bucket.tags.add(t)
      }
      // A mixed bucket is only as trustworthy as its weakest attribution.
      if (bucket.attribute_source === 'CATALOG' && sp.attributeSource !== 'CATALOG') {
        bucket.attribute_source = sp.attributeSource
      }
      buckets.set(key, bucket)
    }

    for (const b of buckets.values()) {
      outcome_aggregates.push({
        beautyArea: b.beautyArea,
        category: b.category,
        product_type: b.product_type,
        attributes: b.attributes,
        attribute_source: b.attribute_source,
        avg_rating: mean(b.ratings),
        rating_scale: RATING_SCALE,
        ratings_count: b.ratings.length,
        products_count: b.products,
        repurchase_rate: b.repurchase.length
          ? Math.round((b.repurchase.filter(Boolean).length / b.repurchase.length) * 100) / 100
          : null,
        outcome_tags: [...b.tags].slice(0, 10),
      })
    }
    outcome_aggregates.sort((a, b) => b.ratings_count - a.ratings_count)
  }

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
      intensity: stated.intensity,
      longevity: stated.longevity,
      families: stated.families,
    },
    usage: {
      occasions: stated.occasions,
      usage_intensity: stated.usageIntensity,
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
    product_feedback,
    outcome_aggregates,
    signals: grantSignals,
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
