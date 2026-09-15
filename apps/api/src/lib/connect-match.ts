import { prisma } from '@halite/db'
import type { BeautyArea } from '@halite/db'
import type { ConnectContext } from './connect-context.js'

/**
 * Ranks a brand's catalog against a permissioned context.
 *
 * The score is deliberately explainable rather than clever: every point it
 * awards or removes comes back as a sentence a shopper can read on the
 * product card. A black-box similarity score is worth less here than a
 * reason a merchandiser can argue with.
 *
 * Two different starting points, because they mean different things. With a
 * profile to work from, a product starts low and earns its way up on what it
 * matches. With no profile at all — a brand-new account — there is nothing
 * to earn against, and showing "35% match" on a whole catalog reads as a
 * verdict on the range when it is really a statement about how little we
 * know. An unprofiled shopper sees a neutral, unpromising-nothing default
 * instead, with the reason saying plainly why.
 */

/** A product's starting point when we know something about the shopper. */
const BASE_WITH_PROFILE = 0.35

/** And when we know nothing at all. */
const BASE_WITHOUT_PROFILE = 0.8

export interface MatchItem {
  productId: string
  sku: string | null
  name: string
  price: number
  currency: string
  imageUrl: string | null
  productUrl: string | null
  inStock: boolean
  score: number
  reasons: string[]
  warnings: string[]
}

export interface MatchOptions {
  limit?: number | undefined
  inStockOnly?: boolean | undefined
  maxPrice?: number | undefined
  minScore?: number | undefined
  /** Score only these products — used to decorate a page the shopper is on. */
  skus?: string[] | undefined
  productIds?: string[] | undefined
}

function attrsOf(p: {
  keyIngredients: string[]
  ingredients: string[]
  metadata: unknown
}): string[] {
  const out = new Set<string>()
  for (const k of p.keyIngredients) out.add(k.toLowerCase())
  const meta = p.metadata as Record<string, unknown> | null
  const notes = meta?.['notes']
  if (Array.isArray(notes)) for (const n of notes) if (typeof n === 'string') out.add(n.toLowerCase())
  const family = meta?.['family']
  if (typeof family === 'string') out.add(family.toLowerCase())
  for (const i of p.ingredients.slice(0, 10)) out.add(i.toLowerCase())
  return [...out]
}

/** Human list: ["a", "b", "c"] -> "a, b and c" */
function phrase(items: string[]): string {
  const parts = items.filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`
}

export async function matchCatalog(opts: {
  brandId: string
  context: ConnectContext
  categories: BeautyArea[]
  options?: MatchOptions
}): Promise<{ items: MatchItem[]; scored: number }> {
  const { brandId, context, categories } = opts
  const { limit = 6, inStockOnly = true, maxPrice, minScore = 0, skus, productIds } = opts.options ?? {}

  // When specific products are named, the page is asking about those — do not
  // hide an out-of-stock one it is already showing.
  const named = (skus?.length ?? 0) > 0 || (productIds?.length ?? 0) > 0

  const products = await prisma.product.findMany({
    where: {
      brandId,
      beautyArea: { in: categories },
      ...(inStockOnly && !named ? { inStock: true } : {}),
      ...(named
        ? {
            OR: [
              ...(productIds?.length ? [{ id: { in: productIds } }] : []),
              ...(skus?.length ? [{ externalId: { in: skus } }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true, externalId: true, name: true, price: true, currency: true,
      imageUrl: true, productUrl: true, inStock: true, concerns: true,
      keyIngredients: true, ingredients: true, metadata: true,
    },
  })

  const liked = new Set(context.preferences.liked)
  const avoided = new Set(context.preferences.avoided)
  const cautioned = new Set(context.preferences.cautioned ?? [])
  const positive = new Set(context.outcomes.positive)
  const negative = new Set(context.outcomes.negative)
  const concerns = new Set(context.preferences.concerns)
  const budget = maxPrice ?? context.intent.budget_max ?? null

  // What the shopper's own collection looks like, in attribute terms. Used
  // to say "built like something you finished" without naming the thing.
  const ownedAttrs = new Map<string, number>()
  for (const item of context.collection.elsewhere) {
    if (item.outcome === 'NEGATIVE') continue
    for (const a of item.attributes) ownedAttrs.set(a, (ownedAttrs.get(a) ?? 0) + 1)
  }

  // Is there anything at all to rank against?
  const hasProfile =
    liked.size > 0 || avoided.size > 0 || positive.size > 0 || negative.size > 0 ||
    concerns.size > 0 || ownedAttrs.size > 0 ||
    context.collection.yours.length > 0 || budget != null
  const base = hasProfile ? BASE_WITH_PROFILE : BASE_WITHOUT_PROFILE

  const scored: MatchItem[] = products.map(p => {
    const attrs = attrsOf(p)
    const reasons: string[] = []
    const warnings: string[] = []
    let score = base

    const hitsLiked = attrs.filter(a => liked.has(a))
    if (hitsLiked.length) {
      // Diminishing returns: a product with six matching ingredients is not
      // twice the answer of one with three, and a flat cap makes everything
      // relevant tie at the ceiling.
      score += Math.min(0.26, 0.13 * Math.sqrt(hitsLiked.length))
      reasons.push(`Built on ${phrase(hitsLiked.slice(0, 3))}, which you gravitate to`)
    }

    const hitsPositive = attrs.filter(a => positive.has(a) && !liked.has(a))
    if (hitsPositive.length) {
      score += Math.min(0.15, hitsPositive.length * 0.07)
      reasons.push(`Shares ${phrase(hitsPositive.slice(0, 2))} with something that worked for you`)
    }

    const familiar = attrs.filter(a => (ownedAttrs.get(a) ?? 0) >= 2 && !liked.has(a) && !positive.has(a))
    if (familiar.length) {
      score += 0.08
      reasons.push(`Built like more than one thing already in your collection`)
    }

    const hitsAvoided = attrs.filter(a => avoided.has(a))
    if (hitsAvoided.length) {
      score -= Math.min(0.45, hitsAvoided.length * 0.22)
      warnings.push(`Contains ${phrase(hitsAvoided.slice(0, 2))}, which you avoid`)
    }

    const hitsCautioned = attrs.filter(a => cautioned.has(a) && !avoided.has(a))
    if (hitsCautioned.length) {
      score -= 0.12
      warnings.push(`Contains ${phrase(hitsCautioned.slice(0, 2))} — strong, and you said your skin reacts easily`)
    }

    const hitsNegative = attrs.filter(a => negative.has(a) && !avoided.has(a))
    if (hitsNegative.length) {
      score -= Math.min(0.25, hitsNegative.length * 0.12)
      warnings.push(`Has ${phrase(hitsNegative.slice(0, 2))}, which has not worked for you before`)
    }

    const hitsConcerns = p.concerns.filter(c => concerns.has(c))
    if (hitsConcerns.length) {
      // A stated concern is worth more than an inferred one — the shopper
      // told Hallie this is what they are trying to change.
      score += Math.min(0.28, hitsConcerns.length * 0.14)
      reasons.push(`Targets ${phrase(hitsConcerns.map(c => c.toLowerCase().replace(/_/g, ' ')))}, which you said you're working on`)
    }

    if (budget != null) {
      if (p.price <= budget) {
        score += 0.06
        reasons.push(`Within the ${context.intent.currency} ${budget} you tend to spend`)
      } else {
        score -= 0.18
        warnings.push(`Above the ${context.intent.currency} ${budget} you tend to spend`)
      }
    }

    if (!warnings.length && hitsLiked.length) {
      reasons.push('None of your avoidances are in it')
    }

    // Say why the number is what it is, rather than letting a shopper read
    // an identical score across the range as a judgement on the products.
    if (!hasProfile) {
      reasons.push('Ranked evenly for now — tell Hallie what you like and these will separate')
    }

    return {
      productId: p.id,
      sku: p.externalId,
      name: p.name,
      price: p.price,
      currency: p.currency,
      imageUrl: p.imageUrl,
      productUrl: p.productUrl,
      inStock: p.inStock,
      score: Math.max(0, Math.min(1, Math.round(score * 100) / 100)),
      reasons: reasons.slice(0, 3),
      warnings: warnings.slice(0, 2),
    }
  })

  const items = scored
    .filter(i => i.score >= minScore)
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, limit)

  return { items, scored: products.length }
}
