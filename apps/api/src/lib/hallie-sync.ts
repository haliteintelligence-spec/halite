import { prisma } from '@halite/db'
import type { BeautyArea, ProductCategory, AttributeSource } from '@halite/db'
import { extract } from './model-router.js'

/**
 * Mirrors the parts of Hallie a connected brand is allowed to see into
 * Halite's own tables.
 *
 * Connect reads its context live, so it is never stale. The dashboard is the
 * surface that goes stale: it aggregates, and aggregating across Hallie's
 * schema on every page load is neither fast nor safe to couple to. So this
 * job pulls the shelf and the logs across on a cadence, and the dashboard
 * reads only from the mirror.
 *
 * What crosses is deliberately narrow. A shelf product keeps its type and
 * its attributes — notes for fragrance, ingredients everywhere else. The
 * brand and product name the shopper typed stay in Hallie, because that is
 * the pair that would identify a competitor's customer.
 */

/** How long a consumer's mirror is allowed to go stale. */
export const SYNC_INTERVAL_DAYS = 3

/** Nothing is pulled for a consumer with no live grant. */
const LIVE = 'ACTIVE' as const

/** Hallie's category strings onto Halite's beauty areas. */
const CATEGORY_AREA: Record<string, BeautyArea> = {
  skin_care: 'SKINCARE',
  body_care: 'BODY',
  hair_care: 'HAIR',
  makeup: 'MAKEUP',
  perfume: 'FRAGRANCE',
  nails: 'NAILS',
  wellness: 'WELLNESS',
  // Older rows, and anything written before the _care suffix settled.
  skincare: 'SKINCARE',
  body: 'BODY',
  hair: 'HAIR',
}

type HallieProductRow = {
  id: string
  normalizedBrand: string | null
  normalizedName: string | null
  categories: string | null
  productTypes: string | null
  /** Hallie already looks these up. Free, and better than asking a model. */
  scentNotes: string | null
  productFacts: string | null
  rating: number | null
  feedbackRating: number | null
  wouldRepurchase: boolean | null
  feedbackOutcomeTags: string | null
  feedbackTextureTags: string | null
  feedbackReactionTags: string | null
  initialLevel: number | null
  currentLevelOverride: number | null
  currentLevelOverrideAt: Date | null
  isEmpty: boolean | null
  emptiedAt: Date | null
  sizeValue: number | null
  sizeUnit: string | null
}

type HallieLogRow = {
  id: string
  userId: string
  category: string | null
  date: Date | null
  createdAt: Date | null
}

/**
 * Hallie stores every tag family as JSON in a text column, so each one is
 * parsed rather than read straight through.
 */
type HallieItemRow = {
  id: string
  logEntryId: string
  productId: string | null
  rating: number | null
  wouldRepurchase: boolean | null
  outcomeTags: string | null
  reactionTags: string | null
  scentTags: string | null
  textureTags: string | null
  projectionTags: string | null
  feelingTags: string | null
  wearDuration: string | null
  endOfDayLook: string | null
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
    if (v && typeof v === 'object') return Object.values(v).filter((x): x is string => typeof x === 'string')
  } catch { /* Hallie writes these by hand; a bad row should not stop a sync. */ }
  return []
}

/**
 * Notes and ingredients Hallie already resolved for a shelf product.
 *
 * `scentNotes` is a JSON array for fragrance; `productFacts` carries
 * ingredient data for everything else. Both are fetched when the shopper
 * adds the product, so this is real sourced data rather than an inference —
 * it is marked CATALOG for that reason.
 */
function hallieAttributes(row: { scentNotes: string | null; productFacts: string | null }): string[] {
  const out = new Set<string>()
  for (const n of parseJsonArray(row.scentNotes)) out.add(n.toLowerCase())

  if (row.productFacts) {
    try {
      const facts = JSON.parse(row.productFacts) as Record<string, unknown>
      for (const key of ['keyIngredients', 'ingredients', 'actives', 'notes']) {
        const v = facts[key]
        if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.add(x.toLowerCase())
      }
    } catch { /* Written by a lookup that can fail; a bad row is not fatal. */ }
  }
  return [...out].slice(0, 12)
}

/** Loose match key: lowercase, punctuation stripped, runs of space collapsed. */
function matchKey(brand: string | null, name: string | null): string {
  return `${brand ?? ''} ${name ?? ''}`
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Attributes for products no Halite brand sells.
 *
 * Returns them marked INFERRED so a brand can weigh them lower — the lookup
 * can be wrong, and a wrong attribute that recurs twice becomes a signal
 * under the tally rule. Batched, because this is the only step that costs
 * money and a shelf is mostly products we have already resolved.
 */
async function enrichAttributes(
  items: Array<{ brand: string | null; name: string | null; area: BeautyArea | null }>,
): Promise<string[][]> {
  if (items.length === 0) return []
  try {
    const result = await extract<{ products: Array<{ attributes: string[] }> }>({
      task: 'STRUCTURED_EXTRACTION',
      maxTokens: 2048,
      systemPrompt:
        'You identify beauty products. For each product in the input array, return its ' +
        'defining attributes: fragrance notes for perfumes and scented products, key active ' +
        'ingredients for everything else. Lowercase, at most 8 per product, no marketing ' +
        'words. Return an empty array for any product you do not recognise \u2014 a guess is ' +
        'worse than nothing here, because a wrong attribute that recurs twice becomes a ' +
        'signal. Reply as JSON: { "products": [{ "attributes": ["..."] }] }, one entry per ' +
        'input product, in the same order.',
      userPrompt: JSON.stringify({
        products: items.map(i => ({ brand: i.brand, name: i.name, area: i.area })),
      }),
    })
    return items.map((_, i) => (result?.products?.[i]?.attributes ?? []).slice(0, 8))
  } catch (err) {
    // Enrichment is a bonus, never a reason to fail a sync. An unenriched
    // product still contributes its type.
    console.warn('[hallie-sync] enrichment skipped:', err)
    return items.map(() => [])
  }
}

/** Pulls one consumer's shelf and logs across. */
export async function syncConsumerFromHallie(consumerId: string): Promise<{
  logsPulled: number
  itemsPulled: number
  productsResolved: number
  productsEnriched: number
}> {
  const run = await prisma.hallieSyncRun.create({ data: { consumerId } })
  const counts = { logsPulled: 0, itemsPulled: 0, productsResolved: 0, productsEnriched: 0 }

  try {
    const consumer = await prisma.consumer.findUnique({
      where: { id: consumerId },
      select: { id: true, hallieUserId: true },
    })
    if (!consumer?.hallieUserId) throw new Error('consumer has no linked Hallie account')
    const hallieUserId = consumer.hallieUserId

    // ── Shelf ───────────────────────────────────────────────────────
    const shelfRows = await prisma.$queryRaw<HallieProductRow[]>`
      SELECT id, "normalizedBrand", "normalizedName", categories, "productTypes",
             "scentNotes", "productFacts", rating, "feedbackRating", "wouldRepurchase",
             "feedbackOutcomeTags", "feedbackTextureTags", "feedbackReactionTags",
             "initialLevel", "currentLevelOverride", "currentLevelOverrideAt",
             "isEmpty", "emptiedAt", "sizeValue", "sizeUnit"
      FROM hallie_testing.hallie_testing_products
      WHERE "userId" = ${hallieUserId} AND "removedAt" IS NULL
    `

    // Resolve against every brand catalog Halite holds. A match gives real
    // ingredient data and tells Connect which brand sold it.
    const keys = shelfRows.map(r => matchKey(r.normalizedBrand, r.normalizedName)).filter(Boolean)
    const catalog = keys.length
      ? await prisma.product.findMany({
          select: {
            id: true, name: true, brandId: true, beautyArea: true, category: true,
            keyIngredients: true, ingredients: true, metadata: true,
            brand: { select: { name: true } },
          },
        })
      : []
    const byKey = new Map<string, (typeof catalog)[number]>()
    for (const p of catalog) {
      const k = matchKey(p.brand?.name ?? null, p.name)
      if (k && !byKey.has(k)) byKey.set(k, p)
    }

    const needEnrich: Array<{ row: HallieProductRow; area: BeautyArea | null }> = []
    const resolved: Array<{
      row: HallieProductRow
      area: BeautyArea | null
      category: ProductCategory | null
      productType: string | null
      productId: string | null
      attributes: string[]
      source: AttributeSource
    }> = []

    for (const row of shelfRows) {
      const cats = parseJsonArray(row.categories)
      const area = CATEGORY_AREA[cats[0] ?? ''] ?? null
      const productType = parseJsonArray(row.productTypes)[0] ?? null
      const hit = byKey.get(matchKey(row.normalizedBrand, row.normalizedName))

      if (hit) {
        const meta = hit.metadata as Record<string, unknown> | null
        const notes = Array.isArray(meta?.['notes'])
          ? (meta!['notes'] as unknown[]).filter((n): n is string => typeof n === 'string')
          : []
        const attrs = [...new Set([...notes, ...hit.keyIngredients, ...hit.ingredients.slice(0, 6)])]
          .map(a => a.toLowerCase())
          .slice(0, 12)
        resolved.push({
          row, area: hit.beautyArea ?? area, category: hit.category,
          productType, productId: hit.id, attributes: attrs, source: 'CATALOG',
        })
        counts.productsResolved++
        continue
      }

      // Hallie fetches notes and facts when a product is added. Reading them
      // costs nothing and is better sourced than a model's guess, so it is
      // tried before falling back to one.
      const known = hallieAttributes(row)
      if (known.length > 0) {
        resolved.push({
          row, area, category: null, productType,
          productId: null, attributes: known, source: 'CATALOG',
        })
        counts.productsResolved++
        continue
      }

      needEnrich.push({ row, area })
    }

    // Only enrich what we have not enriched before — a shelf barely changes
    // between syncs, and this is the one step with a per-call cost.
    const alreadyEnriched = await prisma.hallieShelfProduct.findMany({
      where: { consumerId, hallieProductId: { in: needEnrich.map(n => n.row.id) }, attributeSource: 'INFERRED' },
      select: { hallieProductId: true, attributes: true },
    })
    const enrichedBefore = new Map(alreadyEnriched.map(e => [e.hallieProductId, e.attributes]))
    const fresh = needEnrich.filter(n => !enrichedBefore.has(n.row.id))

    const enrichedAttrs = await enrichAttributes(
      fresh.map(n => ({ brand: n.row.normalizedBrand, name: n.row.normalizedName, area: n.area })),
    )
    const freshByo = new Map(fresh.map((n, i) => [n.row.id, enrichedAttrs[i] ?? []]))

    for (const n of needEnrich) {
      const attrs = enrichedBefore.get(n.row.id) ?? freshByo.get(n.row.id) ?? []
      if (freshByo.has(n.row.id) && attrs.length > 0) counts.productsEnriched++
      resolved.push({
        row: n.row, area: n.area, category: null,
        productType: parseJsonArray(n.row.productTypes)[0] ?? null,
        productId: null, attributes: attrs,
        source: attrs.length > 0 ? 'INFERRED' : 'NONE',
      })
    }

    const shelfIds = new Map<string, string>()
    for (const r of resolved) {
      const feedback = {
        rating: r.row.rating,
        feedbackRating: r.row.feedbackRating,
        wouldRepurchase: r.row.wouldRepurchase,
        outcomeTags: [...new Set([
          ...parseJsonArray(r.row.feedbackOutcomeTags),
          ...parseJsonArray(r.row.feedbackTextureTags),
          ...parseJsonArray(r.row.feedbackReactionTags),
        ].map(t => t.toLowerCase()))].slice(0, 20),
        initialLevel: r.row.initialLevel,
        statedLevel: r.row.currentLevelOverride,
        statedLevelAt: r.row.currentLevelOverrideAt,
        isEmpty: r.row.isEmpty ?? false,
        emptiedAt: r.row.emptiedAt,
        sizeValue: r.row.sizeValue,
        sizeUnit: r.row.sizeUnit,
      }

      const saved = await prisma.hallieShelfProduct.upsert({
        where: { consumerId_hallieProductId: { consumerId, hallieProductId: r.row.id } },
        create: {
          consumerId, hallieProductId: r.row.id,
          beautyArea: r.area, category: r.category, productType: r.productType,
          productId: r.productId, attributes: r.attributes, attributeSource: r.source,
          enrichedAt: r.source === 'INFERRED' ? new Date() : null,
          ...feedback,
        },
        update: {
          beautyArea: r.area, category: r.category, productType: r.productType,
          productId: r.productId, attributes: r.attributes, attributeSource: r.source,
          lastSeenAt: new Date(),
          ...feedback,
        },
        select: { id: true },
      })
      shelfIds.set(r.row.id, saved.id)
    }

    // ── Logs ────────────────────────────────────────────────────────
    const logRows = await prisma.$queryRaw<HallieLogRow[]>`
      SELECT id, "userId", category, date, "createdAt"
      FROM hallie_testing.hallie_testing_log_entries
      WHERE "userId" = ${hallieUserId}
      ORDER BY date DESC
      LIMIT 400
    `
    const itemRows = logRows.length
      ? await prisma.$queryRaw<HallieItemRow[]>`
          SELECT id, "logEntryId", "productId", rating, "wouldRepurchase",
                 "outcomeTags", "reactionTags", "scentTags", "textureTags",
                 "projectionTags", "feelingTags", "wearDuration", "endOfDayLook"
          FROM hallie_testing.hallie_testing_log_items
          WHERE "logEntryId" = ANY(${logRows.map(l => l.id)})
        `
      : []
    const itemsByLog = new Map<string, HallieItemRow[]>()
    for (const it of itemRows) {
      const list = itemsByLog.get(it.logEntryId) ?? []
      list.push(it)
      itemsByLog.set(it.logEntryId, list)
    }

    for (const log of logRows) {
      const when = log.date ?? log.createdAt ?? new Date()
      const saved = await prisma.hallieLog.upsert({
        where: { consumerId_hallieEntryId: { consumerId, hallieEntryId: log.id } },
        create: {
          consumerId, hallieEntryId: log.id,
          category: log.category ?? 'unknown',
          beautyArea: CATEGORY_AREA[log.category ?? ''] ?? null,
          loggedAt: when,
        },
        update: { loggedAt: when },
        select: { id: true },
      })
      counts.logsPulled++

      for (const it of itemsByLog.get(log.id) ?? []) {
        const tags = [...new Set([
          ...parseJsonArray(it.outcomeTags),
          ...parseJsonArray(it.reactionTags),
          ...parseJsonArray(it.scentTags),
          ...parseJsonArray(it.textureTags),
          ...parseJsonArray(it.projectionTags),
          ...parseJsonArray(it.feelingTags),
        ].map(t => t.toLowerCase()))].slice(0, 20)
        // Also JSON in a text column, and single-valued in practice.
        const endOfDay = parseJsonArray(it.endOfDayLook)[0] ?? null

        await prisma.hallieLogItem.upsert({
          where: { logId_hallieItemId: { logId: saved.id, hallieItemId: it.id } },
          create: {
            logId: saved.id, hallieItemId: it.id,
            shelfProductId: it.productId ? shelfIds.get(it.productId) ?? null : null,
            rating: it.rating, wouldRepurchase: it.wouldRepurchase,
            outcomeTags: tags,
            wearDuration: it.wearDuration, endOfDayLook: endOfDay,
          },
          update: {
            shelfProductId: it.productId ? shelfIds.get(it.productId) ?? null : null,
            rating: it.rating, wouldRepurchase: it.wouldRepurchase,
            outcomeTags: tags,
            wearDuration: it.wearDuration, endOfDayLook: endOfDay,
          },
        })
        counts.itemsPulled++
      }
    }

    // ── Routines the shopper built ──────────────────────────────────
    // Their own stacks only. hallie_testing_routine_shown holds what we
    // suggested to them, and that is not what a brand should be reading.
    const stacks = await prisma.$queryRaw<Array<{
      id: string; name: string | null; timeOfDay: string | null; isEveryday: boolean | null
    }>>`
      SELECT id, name, "timeOfDay", "isEveryday"
      FROM hallie_testing.hallie_testing_stacks
      WHERE "userId" = ${hallieUserId}
    `
    for (const st of stacks) {
      const saved = await prisma.hallieRoutine.upsert({
        where: { consumerId_hallieStackId: { consumerId, hallieStackId: st.id } },
        create: {
          consumerId, hallieStackId: st.id,
          name: st.name, timeOfDay: st.timeOfDay, isEveryday: st.isEveryday ?? false,
        },
        update: { name: st.name, timeOfDay: st.timeOfDay, isEveryday: st.isEveryday ?? false },
        select: { id: true },
      })
      const items = await prisma.$queryRaw<Array<{ productId: string | null; position: number }>>`
        SELECT "productId", position
        FROM hallie_testing.hallie_testing_stack_items
        WHERE "stackId" = ${st.id}
        ORDER BY position
      `
      // Rewritten wholesale: a routine reordered in Hallie should not leave
      // a stale step behind here.
      await prisma.hallieRoutineItem.deleteMany({ where: { routineId: saved.id } })
      for (const it of items) {
        await prisma.hallieRoutineItem.create({
          data: {
            routineId: saved.id,
            position: it.position,
            shelfProductId: it.productId ? shelfIds.get(it.productId) ?? null : null,
          },
        })
      }
    }

    // ── What they actually put on, on a given day ───────────────────
    const layerings = await prisma.$queryRaw<Array<{
      id: string; dayKey: string | null; slot: string | null; productIds: string | null
      why: string | null; moods: string | null; occasions: string | null
    }>>`
      SELECT id, "dayKey", slot, "productIds", why, moods, occasions
      FROM hallie_testing.hallie_testing_layering_choices
      WHERE "userId" = ${hallieUserId} AND "dismissedAt" IS NULL
    `
    for (const ly of layerings) {
      const ids = parseJsonArray(ly.productIds)
        .map(id => shelfIds.get(id))
        .filter((id): id is string => Boolean(id))
      await prisma.hallieLayering.upsert({
        where: { consumerId_hallieChoiceId: { consumerId, hallieChoiceId: ly.id } },
        create: {
          consumerId, hallieChoiceId: ly.id,
          dayKey: ly.dayKey ?? '', slot: ly.slot,
          shelfProductIds: ids,
          why: ly.why,
          moods: parseJsonArray(ly.moods),
          occasions: parseJsonArray(ly.occasions),
        },
        update: {
          slot: ly.slot, shelfProductIds: ids, why: ly.why,
          moods: parseJsonArray(ly.moods),
          occasions: parseJsonArray(ly.occasions),
        },
      })
    }

    // ── Empties, which are what calibrate a burn rate ────────────────
    const empties = await prisma.$queryRaw<Array<{
      productId: string; emptiedAt: Date | null; repurchasedAt: Date | null
    }>>`
      SELECT "productId", "emptiedAt", "repurchasedAt"
      FROM hallie_testing.hallie_testing_product_empty_events
      WHERE "userId" = ${hallieUserId}
    `
    for (const e of empties) {
      const id = shelfIds.get(e.productId)
      if (!id) continue
      await prisma.hallieShelfProduct.update({
        where: { id },
        data: { isEmpty: true, emptiedAt: e.emptiedAt, repurchasedAt: e.repurchasedAt },
      })
    }

    await prisma.consumer.update({
      where: { id: consumerId },
      data: { lastHallieSyncAt: new Date() },
    })
    await prisma.hallieSyncRun.update({
      where: { id: run.id },
      data: { ...counts, ok: true, finishedAt: new Date() },
    })
    return counts
  } catch (err) {
    await prisma.hallieSyncRun.update({
      where: { id: run.id },
      data: { ...counts, ok: false, finishedAt: new Date(), error: String(err) },
    })
    throw err
  }
}

/**
 * Every consumer whose mirror is older than the interval and who still has
 * a live grant somewhere.
 *
 * Revocation is the point of that second condition: the moment a shopper
 * disconnects their last brand, nothing further is pulled. Their existing
 * mirror is a separate question — see `purgeMirrorFor`.
 */
export async function findConsumersDueForSync(limit = 200): Promise<string[]> {
  const cutoff = new Date(Date.now() - SYNC_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
  const rows = await prisma.consumer.findMany({
    where: {
      hallieUserId: { not: null },
      consentGrants: { some: { status: LIVE } },
      OR: [{ lastHallieSyncAt: null }, { lastHallieSyncAt: { lt: cutoff } }],
    },
    orderBy: { lastHallieSyncAt: { sort: 'asc', nulls: 'first' } },
    take: limit,
    select: { id: true },
  })
  return rows.map(r => r.id)
}

/** Runs the mirror for everyone due, and keeps going past a single failure. */
export async function runDueSyncs(limit = 200): Promise<{
  attempted: number
  succeeded: number
  failed: number
}> {
  const due = await findConsumersDueForSync(limit)
  let succeeded = 0
  let failed = 0
  for (const consumerId of due) {
    try {
      await syncConsumerFromHallie(consumerId)
      succeeded++
    } catch (err) {
      failed++
      console.warn(`[hallie-sync] ${consumerId} failed:`, err)
    }
  }
  return { attempted: due.length, succeeded, failed }
}

/**
 * Drops a consumer's mirror.
 *
 * Called when the last grant is revoked. The mirror only exists to serve
 * brands; with no brand left to serve, keeping it is data we have no reason
 * to hold.
 */
export async function purgeMirrorFor(consumerId: string): Promise<void> {
  await prisma.hallieLog.deleteMany({ where: { consumerId } })
  await prisma.hallieShelfProduct.deleteMany({ where: { consumerId } })
  await prisma.consumer.update({
    where: { id: consumerId },
    data: { lastHallieSyncAt: null },
  })
}
