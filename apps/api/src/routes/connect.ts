import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma, Prisma } from '@halite/db'
import type { BeautyArea, ConnectEventType } from '@halite/db'
import { ApiError } from '../lib/errors.js'
import { requireBrandKey, authorizedCategories } from '../lib/connect-auth.js'
import { buildConnectContext } from '../lib/connect-context.js'
import { SYNC_INTERVAL_DAYS, purgeMirrorFor } from '../lib/hallie-sync.js'
import { matchCatalog } from '../lib/connect-match.js'
import { mirrorToHallieCollection } from '../lib/hallie-collection.js'
import { provisionHallieTestingAccount } from '../lib/hallie-provisioning.js'
import { linkHallieAccount } from '../lib/hallie-identity.js'
import { quizFor, groupAnswers } from '../lib/hallie-quiz.js'
import { writeHallieProfile } from '../lib/hallie-profile.js'

/**
 * Halite Connect — the public, brand-facing API.
 *
 * Every route here is authenticated by a brand's API key. Consumer identity
 * arrives as the public `hl_…` id, and access is gated on a live
 * ConsentGrant — not on the key alone. A brand holding a valid key for a
 * consumer who has revoked gets a 403, not a stale profile.
 *
 * Pilot scope: a grant covers the brand's whole signup category set, has no
 * expiry, and runs until the consumer revokes it.
 */

const SURFACES = ['pdp', 'collection', 'quiz', 'search', 'checkout', 'account', 'agent'] as const

/**
 * A match score as a Hallie wishlist rating.
 *
 * Hallie rates out of 10 in half steps, so a 0-1 score rounds UP to the
 * nearest half point — which is the same as rounding the percentage up to
 * the nearest 5%. A 68% match is saved as 7/10. Rounding up, not to
 * nearest, because a saved product is something the shopper already wants;
 * the score is a hint, not a verdict.
 */
export function scoreToRating(score: number): number {
  const clamped = Math.max(0, Math.min(1, score))
  return Math.ceil(clamped * 20) / 2
}

/** Loads a live grant, or refuses with the reason the consumer would recognise. */
async function requireGrant(brandId: string, publicConsumerId: string) {
  const consumer = await prisma.consumer.findUnique({
    where: { publicId: publicConsumerId },
    select: { id: true, publicId: true, lastHallieSyncAt: true },
  })
  if (!consumer) throw new ApiError(404, 'Unknown consumer')

  const grant = await prisma.consentGrant.findUnique({
    where: { brandId_consumerId: { brandId, consumerId: consumer.id } },
  })
  if (!grant) throw new ApiError(403, 'No permission for this consumer')

  if (grant.status !== 'ACTIVE') {
    await prisma.consentAccessLog.create({
      data: {
        grantId: grant.id, brandId, consumerId: consumer.id,
        action: 'refused', detail: { reason: grant.status.toLowerCase() },
      },
    })
    throw new ApiError(403, `permission_${grant.status.toLowerCase()}`)
  }

  // expiresAt is unused in the pilot, but honour it the moment it is set.
  if (grant.expiresAt && grant.expiresAt < new Date()) {
    await prisma.consentGrant.update({ where: { id: grant.id }, data: { status: 'EXPIRED' } })
    await prisma.consentAccessLog.create({
      data: {
        grantId: grant.id, brandId, consumerId: consumer.id,
        action: 'refused', detail: { reason: 'expired' },
      },
    })
    throw new ApiError(403, 'permission_expired')
  }

  return { consumer, grant }
}

export async function connectRoutes(server: FastifyInstance) {
  // ── The consent screen's own content ────────────────────────────────
  // Called by the widget before it renders anything, so the screen always
  // shows the brand's real name and its real category scope rather than
  // whatever the embedding page claims.
  server.post('/v1/connect/session', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      surface: z.enum(SURFACES).optional(),
      visitorId: z.string().max(128).optional(),
    })
    const { surface, visitorId } = schema.parse(request.body ?? {})

    if (brand.focusAreas.length === 0) {
      throw new ApiError(400, 'This brand has no categories set. Add them in Settings before enabling Connect.')
    }

    const visitor = visitorId ?? randomBytes(8).toString('hex')

    await prisma.connectEvent.create({
      data: {
        brandId: brand.id,
        type: 'PROMPT_SHOWN',
        surface: surface ?? null,
        visitorId: visitor,
      },
    })

    return reply.send({
      visitorId: visitor,
      brand: {
        name: brand.name,
        logoUrl: brand.logoUrl,
        primaryColor: brand.primaryColor,
      },
      // What the consumer is being asked for. The pilot shares a category
      // as one set — there is no per-field choice yet.
      request: {
        categories: brand.focusAreas,
        purpose: 'product_recommendations',
        // Null means "until the consumer disconnects".
        durationDays: null,
        storage: 'recommendations_only',
      },
      disclosure: {
        receives: [
          'What you like and what you avoid',
          'Your collection, read as notes and ingredients',
          'How products have worked out for you',
          'What you are shopping for, and your budget',
        ],
        withheld: [
          'The brands and products you own, other than this one',
          'Where you shop, or what you paid',
          'Anything outside this brand’s categories',
        ],
      },
    })
  })

  // ── Consumer grants access ──────────────────────────────────────────
  server.post('/v1/connect/authorize', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().min(7).max(20).optional(),
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
      surface: z.enum(SURFACES).optional(),
      visitorId: z.string().max(128).optional(),
    }).refine(d => d.email || d.phone, { message: 'email or phone is required' })

    const { email, phone, firstName, lastName, surface, visitorId } = schema.parse(request.body)

    if (brand.focusAreas.length === 0) {
      throw new ApiError(400, 'This brand has no categories set.')
    }

    let consumer = await prisma.consumer.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      select: { id: true, publicId: true, email: true, phone: true },
    })

    if (!consumer) {
      consumer = await prisma.consumer.create({
        data: {
          email: email ?? null,
          phone: phone ?? null,
        },
        select: { id: true, publicId: true, email: true, phone: true },
      })
      // Same best-effort mirror the quiz does, so the person can claim a
      // Hallie account with the address they just used.
      void provisionHallieTestingAccount({
        email: email ?? null,
        phone: phone ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
      })
    }

    // A consumer's identity comes from Hallie, so adopt that account's id as
    // the one this brand will see. Provisioning above may have just created
    // the account, which is why this runs after it.
    const publicId = (await linkHallieAccount(consumer.id)) ?? consumer.publicId

    // The grant records the brand's categories as they stand right now. If
    // the brand adds a category later, this grant does not widen with it.
    const grant = await prisma.consentGrant.upsert({
      where: { brandId_consumerId: { brandId: brand.id, consumerId: consumer.id } },
      create: {
        brandId: brand.id,
        consumerId: consumer.id,
        categories: brand.focusAreas,
        purpose: 'product_recommendations',
        status: 'ACTIVE',
        surface: surface ?? null,
      },
      update: {
        status: 'ACTIVE',
        revokedAt: null,
        categories: brand.focusAreas,
        surface: surface ?? null,
      },
    })

    // Link the brand-scoped EndUser to the portable Consumer, so outcomes
    // logged here feed the same profile the next brand reads.
    if (email || firstName || lastName) {
      const existing = await prisma.endUser.findFirst({
        where: { brandId: brand.id, consumerId: consumer.id },
        select: { id: true },
      })
      if (existing) {
        const patch: { email?: string; firstName?: string; lastName?: string } = {}
        if (email) patch.email = email
        if (firstName) patch.firstName = firstName
        if (lastName) patch.lastName = lastName
        if (Object.keys(patch).length) {
          await prisma.endUser.update({ where: { id: existing.id }, data: patch })
        }
      } else {
        await prisma.endUser.create({
          data: {
            brandId: brand.id,
            consumerId: consumer.id,
            externalId: `hl-${consumer.publicId}`,
            email: email ?? null,
            firstName: firstName ?? null,
            lastName: lastName ?? null,
          },
        })
      }
    }

    await prisma.connectEvent.create({
      data: {
        brandId: brand.id,
        consumerId: consumer.id,
        type: 'CONNECT_ACCEPTED',
        surface: surface ?? null,
        visitorId: visitorId ?? null,
      },
    })

    return reply.send({
      consumer_id: publicId,
      grant: {
        id: grant.id,
        categories: grant.categories,
        purpose: grant.purpose,
        granted_at: grant.grantedAt.toISOString(),
        expires_at: null,
        revocable: true,
      },
    })
  })

  // ── The quiz, for shoppers with no Hallie profile yet ───────────────
  // Scoped to the brand's categories: a skincare and body brand asks the
  // skincare and body questions and nothing else.
  server.get('/v1/connect/quiz', async (request, reply) => {
    const { key } = z.object({ key: z.string().min(8) }).parse(request.query)
    const brand = await prisma.brand.findUnique({
      where: { apiKey: key },
      select: { name: true, active: true, focusAreas: true },
    })
    if (!brand || !brand.active) throw new ApiError(401, 'Invalid API key')
    if (brand.focusAreas.length === 0) throw new ApiError(400, 'This brand has no categories set.')

    const { categories, questions } = quizFor(brand.focusAreas)
    return reply.send({
      brand: { name: brand.name },
      categories,
      questions,
      // Said plainly because it is the point: the profile is the shopper's,
      // not the brand's, and it outlives this storefront.
      disclosure: 'Your answers create a Hallie profile you own. You can take it to any brand, change it anytime, and disconnect this one whenever you like.',
    })
  })

  // Answers come back here, create the Hallie profile, and connect in one go.
  server.post('/v1/connect/quiz', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      email: z.string().email(),
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
      answers: z.record(z.array(z.string().max(64)).max(20)),
      surface: z.enum(SURFACES).optional(),
      visitorId: z.string().max(128).optional(),
    })
    const body = schema.parse(request.body)

    if (brand.focusAreas.length === 0) throw new ApiError(400, 'This brand has no categories set.')

    const grouped = groupAnswers(brand.focusAreas, body.answers)
    if (grouped.length === 0) throw new ApiError(400, 'No usable answers were provided')

    // The Hallie account comes first — it is the identity everything else
    // hangs off, including the id this brand will be given.
    await provisionHallieTestingAccount({
      email: body.email,
      phone: null,
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
    })
    await writeHallieProfile({ email: body.email, responses: grouped })

    let consumer = await prisma.consumer.findFirst({
      where: { email: body.email },
      select: { id: true, publicId: true },
    })
    if (!consumer) {
      consumer = await prisma.consumer.create({
        data: { email: body.email },
        select: { id: true, publicId: true },
      })
    }

    const publicId = (await linkHallieAccount(consumer.id)) ?? consumer.publicId

    const grant = await prisma.consentGrant.upsert({
      where: { brandId_consumerId: { brandId: brand.id, consumerId: consumer.id } },
      create: {
        brandId: brand.id, consumerId: consumer.id,
        categories: brand.focusAreas, purpose: 'product_recommendations',
        status: 'ACTIVE', surface: body.surface ?? 'quiz',
      },
      update: { status: 'ACTIVE', revokedAt: null, categories: brand.focusAreas },
      select: { id: true, grantedAt: true },
    })

    await prisma.connectEvent.create({
      data: {
        brandId: brand.id, consumerId: consumer.id, type: 'CONNECT_ACCEPTED',
        surface: body.surface ?? 'quiz', visitorId: body.visitorId ?? null,
        metadata: { via: 'quiz', categories: grouped.map(g => g.category) },
      },
    })

    return reply.send({
      consumer_id: publicId,
      created_profile: true,
      categories: grouped.map(g => g.category),
      grant: {
        id: grant.id,
        granted_at: grant.grantedAt.toISOString(),
        expires_at: null,
        revocable: true,
      },
    })
  })

  // ── Consumer declines ───────────────────────────────────────────────
  server.post('/v1/connect/decline', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      surface: z.enum(SURFACES).optional(),
      visitorId: z.string().max(128).optional(),
    })
    const { surface, visitorId } = schema.parse(request.body ?? {})

    await prisma.connectEvent.create({
      data: {
        brandId: brand.id,
        type: 'CONNECT_DECLINED',
        surface: surface ?? null,
        visitorId: visitorId ?? null,
      },
    })
    return reply.send({ ok: true })
  })

  // ── Permissioned context ────────────────────────────────────────────
  server.get('/v1/context/:consumerId', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const { consumerId } = z.object({ consumerId: z.string() }).parse(request.params)
    const { consumer, grant } = await requireGrant(brand.id, consumerId)

    const categories = authorizedCategories(brand, grant.categories)
    const context = await buildConnectContext({
      consumerId: consumer.id,
      brandId: brand.id,
      categories,
      signals: grant.signals,
    })

    await prisma.consentAccessLog.create({
      data: { grantId: grant.id, brandId: brand.id, consumerId: consumer.id, action: 'context' },
    })

    return reply.send({
      ...context,
      permission: {
        purpose: grant.purpose,
        categories,
        signals: grant.signals,
        granted_at: grant.grantedAt.toISOString(),
        expires_at: grant.expiresAt?.toISOString() ?? null,
        last_synced_at: consumer.lastHallieSyncAt?.toISOString() ?? null,
        sync_interval_days: SYNC_INTERVAL_DAYS,
        raw_data_access: false,
      },
    })
  })

  // ── Ranked catalog ──────────────────────────────────────────────────
  server.post('/v1/recommendations', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      consumer_id: z.string(),
      surface: z.enum(SURFACES).optional(),
      limit: z.number().int().min(1).max(24).optional(),
      in_stock_only: z.boolean().optional(),
      max_price: z.number().positive().optional(),
      min_score: z.number().min(0).max(1).optional(),
    })
    const body = schema.parse(request.body)
    const { consumer, grant } = await requireGrant(brand.id, body.consumer_id)

    const categories = authorizedCategories(brand, grant.categories)
    const context = await buildConnectContext({
      consumerId: consumer.id,
      brandId: brand.id,
      categories,
      signals: grant.signals,
    })
    const { items, scored } = await matchCatalog({
      brandId: brand.id,
      context,
      categories,
      options: {
        ...(body.limit != null ? { limit: body.limit } : {}),
        ...(body.in_stock_only != null ? { inStockOnly: body.in_stock_only } : {}),
        ...(body.max_price != null ? { maxPrice: body.max_price } : {}),
        ...(body.min_score != null ? { minScore: body.min_score } : {}),
      },
    })

    const rec = await prisma.recommendation.create({
      data: {
        brandId: brand.id,
        consumerId: consumer.id,
        grantId: grant.id,
        context: context as unknown as object,
        items: items as unknown as object,
        surface: body.surface ?? null,
      },
      select: { id: true, createdAt: true },
    })

    await Promise.all([
      prisma.consentAccessLog.create({
        data: {
          grantId: grant.id, brandId: brand.id, consumerId: consumer.id,
          action: 'recommendations', scoped: scored,
          detail: { recommendationId: rec.id, returned: items.length },
        },
      }),
      prisma.connectEvent.create({
        data: {
          brandId: brand.id, consumerId: consumer.id, recommendationId: rec.id,
          type: 'RECOMMENDATION_SHOWN', surface: body.surface ?? null,
          metadata: { returned: items.length, scored },
        },
      }),
    ])

    return reply.send({
      recommendation_id: rec.id,
      consumer_id: consumer.publicId,
      scored,
      summary: {
        liked: context.preferences.liked.slice(0, 6),
        avoided: context.preferences.avoided.slice(0, 6),
        stated_concerns: context.preferences.stated_concerns.slice(0, 6),
        sensitivity: context.preferences.sensitivity,
        budget_max: context.intent.budget_max,
        confidence: context.confidence,
        sources: context.sources,
      },
      items: items.map(i => ({
        sku: i.sku,
        product_id: i.productId,
        name: i.name,
        price: i.price,
        currency: i.currency,
        image_url: i.imageUrl,
        product_url: i.productUrl,
        match_score: i.score,
        reasons: i.reasons,
        warnings: i.warnings,
      })),
      permission: {
        purpose: grant.purpose,
        categories,
        expires_at: grant.expiresAt?.toISOString() ?? null,
      },
    })
  })

  // ── Score the products on a page ────────────────────────────────────
  // The storefront calls this as the shopper browses, so a match score and
  // its reasons can sit on every product they see — not only the ones a
  // ranked list happened to return.
  server.post('/v1/match', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const schema = z.object({
      apiKey: z.string().optional(),
      consumer_id: z.string(),
      // Whatever the page tags its products with. A merchant's markup may
      // carry a SKU or an internal id, and the widget cannot know which —
      // so each ref is matched against both.
      refs: z.array(z.string().max(120)).max(100).optional(),
      skus: z.array(z.string().max(120)).max(100).optional(),
      product_ids: z.array(z.string().max(60)).max(100).optional(),
      surface: z.enum(SURFACES).optional(),
    }).refine(
      d => (d.refs?.length ?? 0) + (d.skus?.length ?? 0) + (d.product_ids?.length ?? 0) > 0,
      { message: 'refs, skus or product_ids is required' },
    )
    const body = schema.parse(request.body)
    const { consumer, grant } = await requireGrant(brand.id, body.consumer_id)

    const categories = authorizedCategories(brand, grant.categories)
    const context = await buildConnectContext({ consumerId: consumer.id, brandId: brand.id, categories, signals: grant.signals })
    const { items, scored } = await matchCatalog({
      brandId: brand.id, context, categories,
      options: {
        limit: 100,
        ...(body.skus || body.refs ? { skus: [...(body.skus ?? []), ...(body.refs ?? [])] } : {}),
        ...(body.product_ids || body.refs ? { productIds: [...(body.product_ids ?? []), ...(body.refs ?? [])] } : {}),
      },
    })

    // Echo the ref the caller used, so a page can look the result back up
    // without knowing whether it tagged by SKU or by id.
    const asked = new Set([...(body.refs ?? []), ...(body.skus ?? []), ...(body.product_ids ?? [])])

    await prisma.consentAccessLog.create({
      data: {
        grantId: grant.id, brandId: brand.id, consumerId: consumer.id,
        action: 'context', scoped: scored,
        detail: { kind: 'page_match', asked: (body.skus?.length ?? 0) + (body.product_ids?.length ?? 0) },
      },
    })

    return reply.send({
      consumer_id: consumer.publicId,
      matches: items.map(i => ({
        ref: asked.has(i.productId) ? i.productId : (i.sku ?? i.productId),
        product_id: i.productId,
        sku: i.sku,
        match_score: i.score,
        reasons: i.reasons,
        warnings: i.warnings,
      })),
    })
  })

  // ── Outcomes back from the storefront ───────────────────────────────
  server.post('/v1/events', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const one = z.object({
      // Three names for the same button, because storefronts call it three
      // things. They stay distinct on the wire and in ConnectEvent — a like
      // and a save-for-later may yet turn out to mean different things — and
      // land in the same Hallie collection.
      event: z.enum([
        'product_viewed', 'add_to_cart',
        'wishlisted', 'save_for_later', 'liked', 'favourited', 'favorited',
        'purchase', 'returned', 'rated',
      ]),
      consumer_id: z.string().optional(),
      recommendation_id: z.string().optional(),
      sku: z.string().optional(),
      product_id: z.string().optional(),
      surface: z.enum(SURFACES).optional(),
      value: z.number().optional(),
      currency: z.string().length(3).optional(),
      visitor_id: z.string().max(128).optional(),
      occurred_at: z.string().datetime().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    const schema = z.object({
      apiKey: z.string().optional(),
      events: z.array(one).min(1).max(100).optional(),
    }).passthrough()

    const parsed = schema.parse(request.body)
    const batch = parsed.events ?? [one.parse(request.body)]

    const TYPES: Record<
      'product_viewed' | 'add_to_cart' | 'wishlisted' | 'save_for_later' | 'liked'
      | 'favourited' | 'favorited' | 'purchase' | 'returned' | 'rated',
      ConnectEventType
    > = {
      product_viewed: 'PRODUCT_VIEWED',
      add_to_cart: 'ADD_TO_CART',
      wishlisted: 'WISHLISTED',
      save_for_later: 'WISHLISTED',
      liked: 'WISHLISTED',
      favourited: 'WISHLISTED',
      favorited: 'WISHLISTED',
      purchase: 'PURCHASE',
      returned: 'RETURNED',
      rated: 'RATED',
    }

    const accepted: string[] = []
    for (const e of batch) {
      // An event naming a consumer only counts if that consumer still
      // permits this brand — otherwise it is dropped, not stored anonymously.
      let consumerId: string | null = null
      if (e.consumer_id) {
        try {
          const { consumer } = await requireGrant(brand.id, e.consumer_id)
          consumerId = consumer.id
        } catch {
          continue
        }
      }

      // A storefront tags products with whatever identifier it already has,
      // so try both rather than making the merchant know which we hold.
      const refs = [e.product_id, e.sku].filter((v): v is string => Boolean(v))
      const productWhere = refs.length
        ? { brandId: brand.id, OR: [{ id: { in: refs } }, { externalId: { in: refs } }] }
        : null
      const product = productWhere
        ? await prisma.product.findFirst({
            where: productWhere,
            select: {
              id: true, name: true, beautyArea: true, category: true,
              price: true, currency: true, imageUrl: true,
            },
          })
        : null

      const row = await prisma.connectEvent.create({
        data: {
          brandId: brand.id,
          consumerId,
          recommendationId: e.recommendation_id ?? null,
          productId: product?.id ?? null,
          sku: e.sku ?? null,
          type: TYPES[e.event],
          surface: e.surface ?? null,
          value: e.value ?? null,
          currency: e.currency ?? 'USD',
          visitorId: e.visitor_id ?? null,
          ...(e.metadata ? { metadata: e.metadata as Prisma.InputJsonValue } : {}),
          occurredAt: e.occurred_at ? new Date(e.occurred_at) : new Date(),
        },
        select: { id: true },
      })
      accepted.push(row.id)

      // What they do on the storefront belongs in their Hallie collection:
      // a save goes to the wishlist, a purchase to the shelf. This is what
      // makes a profile started on a brand page worth having later — they
      // open Hallie and their shelf is already theirs.
      const SAVES = ['wishlisted', 'save_for_later', 'liked', 'favourited', 'favorited']
      const toCollection =
        SAVES.includes(e.event) ? 'wishlist' as const :
        e.event === 'purchase' ? 'shelf' as const :
        e.event === 'returned' ? 'returned' as const : null

      // A purchase whose SKU is not in the brand's catalog used to mirror
      // nothing at all, which loses exactly the thing worth keeping. The
      // event's own details stand in: a poorer row, correctly on their
      // shelf, beats a correct row that does not exist. The sync enriches
      // it once the catalog catches up.
      const named = product ?? (
        typeof e.metadata?.['product_name'] === 'string'
          ? {
              name: e.metadata['product_name'] as string,
              beautyArea: brand.focusAreas[0] ?? 'SKINCARE' as const,
              category: 'OTHER' as const,
              price: e.value ?? null,
              currency: e.currency ?? 'USD',
              imageUrl: null,
              id: null,
            }
          : null
      )

      if (toCollection && consumerId && named) {
        const c = await prisma.consumer.findUnique({
          where: { id: consumerId },
          select: { email: true },
        })

        // The match score becomes the wishlist rating, so the shopper opens
        // Hallie and sees how well the thing they saved actually suits them.
        // Scored here rather than taken from the request: the storefront
        // should not be able to write its own rating into someone's profile.
        // A purchase gets none — they own it, and rating it is theirs to do.
        let rating: number | null = null
        if (toCollection === 'wishlist' && product) try {
          const grant = await prisma.consentGrant.findUnique({
            where: { brandId_consumerId: { brandId: brand.id, consumerId } },
            select: { categories: true, status: true },
          })
          if (grant?.status === 'ACTIVE') {
            const cats = authorizedCategories(brand, grant.categories)
            const ctx = await buildConnectContext({ consumerId, brandId: brand.id, categories: cats })
            const { items } = await matchCatalog({
              brandId: brand.id, context: ctx, categories: cats,
              options: { limit: 1, productIds: [product.id] },
            })
            const score = items[0]?.score
            if (score != null) rating = scoreToRating(score)
          }
        } catch { /* a save without a rating is still a save */ }

        void mirrorToHallieCollection({
          email: c?.email ?? null,
          brandName: brand.name,
          productName: named.name,
          beautyArea: named.beautyArea,
          category: named.category,
          price: e.value ?? named.price,
          currency: e.currency ?? named.currency,
          imageUrl: named.imageUrl,
          collection: toCollection,
          rating,
          // Resolution is a fact about our catalog, not about them: an
          // unresolved row is still their product, and the next sync fills
          // in what we could not name today.
          unresolved: product == null,
        })
      }
    }

    return reply.send({ accepted: accepted.length, ids: accepted })
  })

  // ── Permission state and revocation ─────────────────────────────────
  server.get('/v1/permissions/:consumerId', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const { consumerId } = z.object({ consumerId: z.string() }).parse(request.params)

    const consumer = await prisma.consumer.findUnique({
      where: { publicId: consumerId },
      select: { id: true, publicId: true },
    })
    if (!consumer) throw new ApiError(404, 'Unknown consumer')

    const grant = await prisma.consentGrant.findUnique({
      where: { brandId_consumerId: { brandId: brand.id, consumerId: consumer.id } },
    })
    if (!grant) return reply.send({ consumer_id: consumer.publicId, status: 'none' })

    return reply.send({
      consumer_id: consumer.publicId,
      status: grant.status.toLowerCase(),
      categories: grant.categories as BeautyArea[],
      purpose: grant.purpose,
      granted_at: grant.grantedAt.toISOString(),
      revoked_at: grant.revokedAt?.toISOString() ?? null,
      expires_at: grant.expiresAt?.toISOString() ?? null,
    })
  })

  // A brand may hand back access it no longer needs. It can never grant
  // itself more — only the consumer does that.
  server.delete('/v1/permissions/:consumerId', async (request, reply) => {
    const brand = await requireBrandKey(request)
    const { consumerId } = z.object({ consumerId: z.string() }).parse(request.params)

    const consumer = await prisma.consumer.findUnique({
      where: { publicId: consumerId },
      select: { id: true },
    })
    if (!consumer) throw new ApiError(404, 'Unknown consumer')

    await prisma.consentGrant.updateMany({
      where: { brandId: brand.id, consumerId: consumer.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    })

    // The mirror exists to serve connected brands. With none left, there is
    // nothing it is for, so it goes rather than sitting on disk.
    const stillConnected = await prisma.consentGrant.count({
      where: { consumerId: consumer.id, status: 'ACTIVE' },
    })
    if (stillConnected === 0) await purgeMirrorFor(consumer.id)

    return reply.send({ ok: true })
  })
}
