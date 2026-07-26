import type { FastifyInstance } from 'fastify'
import { prisma } from '@halite/db'
import { requireHaliteAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { tryFernetDecrypt } from '../lib/fernet.js'

// Hallie Testing (hal.haliteintelligence.com) is a separate Next.js app,
// not part of this monorepo — but its Postgres tables live in the same
// database, under a dedicated `hallie_testing` schema (table names are
// additionally prefixed `hallie_testing_`, so every reference here is
// fully schema-qualified: hallie_testing.hallie_testing_<table>). These
// are internal analytics endpoints for the "Hallie Test" admin dashboard —
// a consolidated view of Hallie Testing's users for traction/compliance
// reporting, not part of the brand/consumer product surface.
//
// Given the expected scale (dozens–low hundreds of test users), the
// insights endpoints return row-level facts rather than pre-aggregated
// crosstabs — the admin frontend groups/filters/sorts client-side, which
// is what makes its filters "auto-update" instantly with no extra
// round-trips.

// Mirrors hallie-api's actual consent gate (save_consent_gate in
// app/domains/users/service.py) — these 4 are the only types the app ever
// hard-requires before letting a user through onboarding. "ai_personalization"
// was previously listed here too, but hallie-api has never recorded a
// consent type by that name (see app/domains/shared/consent.py's
// CONSENT_TYPES) — its presence meant no user could ever show as fully
// compliant, permanently capped at 4/5.
const REQUIRED_CONSENT_TYPES = [
  'terms_of_service',
  'privacy_policy_ack',
  'partner_brand_sharing',
  'sensitive_info',
]

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// hallie_testing_products stores a product's category/type as JSON text, not
// plain columns — `categories` is a JSON array (a product can span more than
// one, e.g. a 2-in-1), and `productTypes` is a JSON object keyed by category
// (each category gets its own type, e.g. {"makeup": "lip", "skincare": "spf"}).
// This normalizes both into flat arrays plus a best-guess current fill level
// (the app only stores a manual override when the user corrects it — absent
// that, initialLevel is the best available estimate, and an emptied product
// is always 0 regardless of any stale override).
function parseProductRow(p: Record<string, unknown>) {
  const categories = safeJsonParse<string[]>(p.categories, [])
  const productTypesByCategory = safeJsonParse<Record<string, string>>(p.productTypes, {})
  const currentLevel = p.isEmpty
    ? 0
    : ((p.currentLevelOverride as number | null) ?? (p.initialLevel as number | null))
  return {
    ...p,
    categories,
    productTypes: Object.values(productTypesByCategory),
    currentLevel,
  }
}

export async function hallieTestRoutes(server: FastifyInstance) {
  // ── Top-line traction/compliance/engagement summary ──────────────────
  server.get('/summary', { preHandler: requireHaliteAdmin }, async () => {
    const [userTotals = { totalUsers: 0n, newUsers7d: 0n, newUsers30d: 0n, profileCompleteUsers: 0n, haliteLinkedUsers: 0n }] = await prisma.$queryRaw<
      Array<{ totalUsers: bigint; newUsers7d: bigint; newUsers30d: bigint; profileCompleteUsers: bigint; haliteLinkedUsers: bigint }>
    >`
      SELECT
        COUNT(*)::bigint AS "totalUsers",
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::bigint AS "newUsers7d",
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '30 days')::bigint AS "newUsers30d",
        COUNT(*) FILTER (WHERE phone IS NOT NULL AND birthday IS NOT NULL AND city IS NOT NULL AND country IS NOT NULL)::bigint AS "profileCompleteUsers",
        COUNT(*) FILTER (WHERE "haliteConsumerId" IS NOT NULL)::bigint AS "haliteLinkedUsers"
      FROM hallie_testing.hallie_testing_users
    `

    const [loginTotals] = await prisma.$queryRaw<
      Array<{ totalLogins: bigint; uniqueUsers7d: bigint; uniqueUsers30d: bigint }>
    >`
      SELECT
        COUNT(*)::bigint AS "totalLogins",
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= now() - interval '7 days')::bigint AS "uniqueUsers7d",
        COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= now() - interval '30 days')::bigint AS "uniqueUsers30d"
      FROM hallie_testing.hallie_testing_login_events
    `

    const [logTotals] = await prisma.$queryRaw<
      Array<{ totalLogs: bigint; logs7d: bigint; logs30d: bigint }>
    >`
      SELECT
        COUNT(*)::bigint AS "totalLogs",
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::bigint AS "logs7d",
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '30 days')::bigint AS "logs30d"
      FROM hallie_testing.hallie_testing_log_entries
    `

    const [productTotals] = await prisma.$queryRaw<
      Array<{ totalProducts: bigint; usersWithProducts: bigint }>
    >`
      SELECT COUNT(*)::bigint AS "totalProducts", COUNT(DISTINCT "userId")::bigint AS "usersWithProducts"
      FROM hallie_testing.hallie_testing_products
    `

    const consentByType = await prisma.$queryRaw<Array<{ type: string; grantedCount: bigint }>>`
      SELECT type, COUNT(*) FILTER (WHERE granted)::bigint AS "grantedCount"
      FROM (
        SELECT DISTINCT ON ("userId", type) "userId", type, granted
        FROM hallie_testing.hallie_testing_consent_records
        ORDER BY "userId", type, "createdAt" DESC
      ) latest
      GROUP BY type
    `

    const [compliant] = await prisma.$queryRaw<Array<{ compliantUsers: bigint }>>`
      SELECT COUNT(*)::bigint AS "compliantUsers"
      FROM (
        SELECT "userId"
        FROM (
          SELECT DISTINCT ON ("userId", type) "userId", type, granted
          FROM hallie_testing.hallie_testing_consent_records
          WHERE type = ANY(${REQUIRED_CONSENT_TYPES})
          ORDER BY "userId", type, "createdAt" DESC
        ) latest
        GROUP BY "userId"
        HAVING COUNT(*) FILTER (WHERE granted) = ${REQUIRED_CONSENT_TYPES.length}
      ) c
    `

    const [pointsTotals] = await prisma.$queryRaw<Array<{ pointsAwarded: bigint }>>`
      SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::bigint AS "pointsAwarded"
      FROM hallie_testing.hallie_testing_points_transactions
    `

    const [payoutTotals] = await prisma.$queryRaw<Array<{ payoutCount: bigint; payoutCentsRequested: bigint }>>`
      SELECT COUNT(*)::bigint AS "payoutCount", COALESCE(SUM("amountCents"), 0)::bigint AS "payoutCentsRequested"
      FROM hallie_testing.hallie_testing_reward_requests
    `

    const [repurchaseTotals] = await prisma.$queryRaw<
      Array<{ answeredCount: bigint; yesCount: bigint }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE "wouldRepurchase" IS NOT NULL)::bigint AS "answeredCount",
        COUNT(*) FILTER (WHERE "wouldRepurchase" = true)::bigint AS "yesCount"
      FROM hallie_testing.hallie_testing_log_items
    `

    const toNum = (v: bigint | number) => Number(v)

    return {
      totalUsers: toNum(userTotals.totalUsers),
      newUsers7d: toNum(userTotals.newUsers7d),
      newUsers30d: toNum(userTotals.newUsers30d),
      profileCompleteUsers: toNum(userTotals.profileCompleteUsers),
      haliteLinkedUsers: toNum(userTotals.haliteLinkedUsers),
      totalLogins: toNum(loginTotals?.totalLogins ?? 0n),
      uniqueLoginUsers7d: toNum(loginTotals?.uniqueUsers7d ?? 0n),
      uniqueLoginUsers30d: toNum(loginTotals?.uniqueUsers30d ?? 0n),
      totalLogs: toNum(logTotals?.totalLogs ?? 0n),
      logs7d: toNum(logTotals?.logs7d ?? 0n),
      logs30d: toNum(logTotals?.logs30d ?? 0n),
      totalProducts: toNum(productTotals?.totalProducts ?? 0n),
      usersWithProducts: toNum(productTotals?.usersWithProducts ?? 0n),
      compliantUsers: toNum(compliant?.compliantUsers ?? 0n),
      consentByType: Object.fromEntries(consentByType.map((r) => [r.type, toNum(r.grantedCount)])),
      pointsAwarded: toNum(pointsTotals?.pointsAwarded ?? 0n),
      payoutCount: toNum(payoutTotals?.payoutCount ?? 0n),
      payoutCentsRequested: toNum(payoutTotals?.payoutCentsRequested ?? 0n),
      repurchaseAnsweredCount: toNum(repurchaseTotals?.answeredCount ?? 0n),
      repurchaseRate:
        toNum(repurchaseTotals?.answeredCount ?? 0n) > 0
          ? Math.round((toNum(repurchaseTotals!.yesCount) / toNum(repurchaseTotals!.answeredCount)) * 100)
          : null,
    }
  })

  // ── Full user list with per-user aggregates ───────────────────────────
  server.get('/users', { preHandler: requireHaliteAdmin }, async () => {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        email: string
        phone: string | null
        city: string | null
        country: string | null
        createdAt: Date
        pointsBalance: number
        haliteConsumerId: string | null
        productCount: bigint
        logCount: bigint
        loginCount: bigint
        lastLoginAt: Date | null
        grantedRequiredConsents: bigint
      }>
    >`
      SELECT
        u.id, u.name, u.email, u.phone, u.city, u.country, u."createdAt", u."pointsBalance", u."haliteConsumerId",
        COALESCE(p.cnt, 0) AS "productCount",
        COALESCE(l.cnt, 0) AS "logCount",
        COALESCE(le.cnt, 0) AS "loginCount",
        le.last_login AS "lastLoginAt",
        COALESCE(c.granted_count, 0) AS "grantedRequiredConsents"
      FROM hallie_testing.hallie_testing_users u
      LEFT JOIN (
        SELECT "userId", COUNT(*) AS cnt FROM hallie_testing.hallie_testing_products GROUP BY "userId"
      ) p ON p."userId" = u.id
      LEFT JOIN (
        SELECT "userId", COUNT(*) AS cnt FROM hallie_testing.hallie_testing_log_entries GROUP BY "userId"
      ) l ON l."userId" = u.id
      LEFT JOIN (
        SELECT "userId", COUNT(*) AS cnt, MAX("createdAt") AS last_login
        FROM hallie_testing.hallie_testing_login_events GROUP BY "userId"
      ) le ON le."userId" = u.id
      LEFT JOIN (
        SELECT "userId", COUNT(*) FILTER (WHERE granted) AS granted_count
        FROM (
          SELECT DISTINCT ON ("userId", type) "userId", type, granted
          FROM hallie_testing.hallie_testing_consent_records
          WHERE type = ANY(${REQUIRED_CONSENT_TYPES})
          ORDER BY "userId", type, "createdAt" DESC
        ) latest
        GROUP BY "userId"
      ) c ON c."userId" = u.id
      ORDER BY u."createdAt" DESC
    `

    return {
      users: rows.map((r) => ({
        ...r,
        productCount: Number(r.productCount),
        logCount: Number(r.logCount),
        loginCount: Number(r.loginCount),
        grantedRequiredConsents: Number(r.grantedRequiredConsents),
      })),
    }
  })

  // ── Per-user drill-down ────────────────────────────────────────────────
  server.get('/users/:userId', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const [user] = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, name, email, phone, city, country, timezone, birthday, "pointsBalance", "createdAt", "haliteConsumerId"
      FROM hallie_testing.hallie_testing_users WHERE id = ${userId}
    `
    if (!user) throw new ApiError(404, 'User not found')
    return { user }
  })

  server.get('/users/:userId/products', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const products = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM hallie_testing.hallie_testing_products WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
    `
    return { products: products.map(parseProductRow) }
  })

  server.get('/users/:userId/logs', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const logs = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT le.id, le.category, le.date, le."createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', li.id, 'productId', li."productId", 'productBrand', pr."normalizedBrand", 'productName', pr."normalizedName",
              'rating', li.rating, 'outcomeTags', li."outcomeTags", 'wearDuration', li."wearDuration", 'endOfDayLook', li."endOfDayLook",
              'wouldRepurchase', li."wouldRepurchase"
            ) ORDER BY li.id
          ) FILTER (WHERE li.id IS NOT NULL),
          '[]'
        ) AS items
      FROM hallie_testing.hallie_testing_log_entries le
      LEFT JOIN hallie_testing.hallie_testing_log_items li ON li."logEntryId" = le.id
      LEFT JOIN hallie_testing.hallie_testing_products pr ON pr.id = li."productId"
      WHERE le."userId" = ${userId}
      GROUP BY le.id
      ORDER BY le.date DESC
    `
    return { logs }
  })

  server.get('/users/:userId/preferences', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const rows = await prisma.$queryRaw<Array<{ category: string; answers: string; updatedAt: Date }>>`
      SELECT category, answers, "updatedAt" FROM hallie_testing.hallie_testing_preference_responses WHERE "userId" = ${userId}
    `
    return {
      preferences: rows.map((r) => ({
        category: r.category,
        answers: JSON.parse(r.answers),
        updatedAt: r.updatedAt,
      })),
    }
  })

  server.get('/users/:userId/feedback', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const feedback = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM hallie_testing.hallie_testing_app_feedback WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
    `
    return { feedback }
  })

  server.get('/users/:userId/activity', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    const [consentHistory, loginEvents, pointsTransactions, milestoneAwards, rewardRequests, activeDays] =
      await Promise.all([
        prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT * FROM hallie_testing.hallie_testing_consent_records WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT * FROM hallie_testing.hallie_testing_login_events WHERE "userId" = ${userId} ORDER BY "createdAt" DESC LIMIT 100
        `,
        prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT * FROM hallie_testing.hallie_testing_points_transactions WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT * FROM hallie_testing.hallie_testing_milestone_awards WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<Record<string, unknown>>>`
          SELECT * FROM hallie_testing.hallie_testing_reward_requests WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count FROM hallie_testing.hallie_testing_daily_activity WHERE "userId" = ${userId}
        `,
      ])
    return {
      consentHistory,
      loginEvents,
      pointsTransactions,
      milestoneAwards,
      rewardRequests,
      activeDayCount: Number(activeDays[0]?.count ?? 0),
    }
  })

  // ── Product-type usage insights ────────────────────────────────────────
  server.get('/insights/products', { preHandler: requireHaliteAdmin }, async () => {
    const products = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT id, "userId", categories, "productTypes", "normalizedBrand" AS brand, "normalizedName" AS name,
        shade, rating, "initialLevel", "currentLevelOverride", "isEmpty", "routineTags", "occasionTags", "createdAt"
      FROM hallie_testing.hallie_testing_products
      ORDER BY "createdAt" DESC
    `
    return { products: products.map(parseProductRow) }
  })

  // ── Real-world usage: city / time-of-year view ─────────────────────────
  server.get('/insights/usage', { preHandler: requireHaliteAdmin }, async () => {
    const usage = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        li.id, li.rating, li."outcomeTags", li."wearDuration", li."wouldRepurchase",
        le.date, le.category,
        pr.id AS "productId", pr."normalizedBrand" AS "productBrand", pr."normalizedName" AS "productName", pr."productTypes",
        u.id AS "userId", u.city, u.country, u.timezone
      FROM hallie_testing.hallie_testing_log_items li
      JOIN hallie_testing.hallie_testing_log_entries le ON le.id = li."logEntryId"
      JOIN hallie_testing.hallie_testing_products pr ON pr.id = li."productId"
      JOIN hallie_testing.hallie_testing_users u ON u.id = le."userId"
      ORDER BY le.date DESC
    `
    return {
      usage: usage.map((row) => ({
        ...row,
        productTypes: Object.values(safeJsonParse<Record<string, string>>(row.productTypes, {})),
      })),
    }
  })

  // ── Skin-type / preference vs. product relationship ────────────────────
  server.get('/insights/preferences', { preHandler: requireHaliteAdmin }, async () => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        u.id AS "userId", u.city, u.country,
        pref.category AS "preferenceCategory",
        CASE pref.category
          WHEN 'skin_care' THEN pref.answers::jsonb -> 'face_type' ->> 0
          WHEN 'body_care' THEN pref.answers::jsonb -> 'skin_type' ->> 0
          WHEN 'hair_care' THEN pref.answers::jsonb -> 'hair_type' ->> 0
          WHEN 'makeup'    THEN pref.answers::jsonb -> 'undertone' ->> 0
          WHEN 'perfume'   THEN pref.answers::jsonb -> 'intensity' ->> 0
        END AS classifier,
        pr.id AS "productId", pr.categories AS "productCategories", pr."normalizedBrand" AS brand, pr."normalizedName" AS name, pr.rating, pr."initialLevel"
      FROM hallie_testing.hallie_testing_preference_responses pref
      JOIN hallie_testing.hallie_testing_users u ON u.id = pref."userId"
      LEFT JOIN hallie_testing.hallie_testing_products pr
        ON pr."userId" = pref."userId" AND pr.categories::jsonb ? pref.category
    `
    return {
      rows: rows.map((row) => ({
        ...row,
        productCategories: safeJsonParse<string[]>(row.productCategories, []),
      })),
    }
  })

  // ── Payout requests ──────────────────────────────────────────────────
  // pointsRedeemed/amountCents are numerically identical to each other
  // (1 point = 1 cent), plain integers — nothing to decrypt there. Only
  // payoutContact/bankName/bankAccountName/bankAccountNumber are Fernet-
  // encrypted by hallie-api at write time (see field_encryption.py), so
  // those are only decrypted in the single-request detail endpoint below,
  // not the list — the list never needs them, and decrypting rows that
  // won't be shown would be wasted work on every page load.
  server.get('/payouts', { preHandler: requireHaliteAdmin }, async () => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT rr.id, rr."pointsRedeemed", rr."amountCents", rr.status, rr."payoutMethod", rr."createdAt",
             u.id AS "userId", u.name AS "userName", u.email AS "userEmail"
      FROM hallie_testing.hallie_testing_reward_requests rr
      JOIN hallie_testing.hallie_testing_users u ON u.id = rr."userId"
      ORDER BY rr."createdAt" DESC
    `
    return { payoutRequests: rows }
  })

  server.get('/payouts/:requestId', { preHandler: requireHaliteAdmin }, async (request) => {
    const { requestId } = request.params as { requestId: string }
    const [row] = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT rr.id, rr."pointsRedeemed", rr."amountCents", rr.status, rr."payoutMethod", rr."createdAt",
             rr."payoutContact", rr."bankName", rr."bankAccountName", rr."bankAccountNumber",
             u.id AS "userId", u.name AS "userName", u.email AS "userEmail"
      FROM hallie_testing.hallie_testing_reward_requests rr
      JOIN hallie_testing.hallie_testing_users u ON u.id = rr."userId"
      WHERE rr.id = ${requestId}
    `
    if (!row) throw new ApiError(404, 'Payout request not found')

    const key = process.env.FIELD_ENCRYPTION_KEY
    return {
      payoutRequest: {
        ...row,
        payoutContact: tryFernetDecrypt(row.payoutContact as string | null, key),
        bankName: tryFernetDecrypt(row.bankName as string | null, key),
        bankAccountName: tryFernetDecrypt(row.bankAccountName as string | null, key),
        bankAccountNumber: tryFernetDecrypt(row.bankAccountNumber as string | null, key),
      },
    }
  })

  // The `status` column itself is never encrypted — updating it directly
  // here is what keeps hallie-web/iOS's own GET /v1/rewards (reading the
  // exact same row via hallie-api) and this admin view in sync with zero
  // extra sync work, since there's only one row to ever be out of date.
  server.patch('/payouts/:requestId', { preHandler: requireHaliteAdmin }, async (request) => {
    const { requestId } = request.params as { requestId: string }
    const { paid } = request.body as { paid: boolean }
    const status = paid ? 'paid' : 'pending'
    const result = await prisma.$executeRaw`
      UPDATE hallie_testing.hallie_testing_reward_requests SET status = ${status} WHERE id = ${requestId}
    `
    if (result === 0) throw new ApiError(404, 'Payout request not found')
    return { ok: true, status }
  })

  // ── Account deletion ──────────────────────────────────────────────────
  server.delete('/users/:userId', { preHandler: requireHaliteAdmin }, async (request) => {
    const { userId } = request.params as { userId: string }
    // Every owned table (products, logs, points, consent, etc.) has
    // ondelete=CASCADE back to this row (see hallie-api's models) — same
    // mechanism as the user's own self-service DELETE /v1/me, just
    // triggered here instead since this admin backend only ever has
    // direct DB access to the shared hallie_testing schema, never a
    // bearer token for arbitrary users.
    const result = await prisma.$executeRaw`
      DELETE FROM hallie_testing.hallie_testing_users WHERE id = ${userId}
    `
    if (result === 0) throw new ApiError(404, 'User not found')
    return { ok: true }
  })
}
