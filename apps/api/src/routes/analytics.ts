import type { FastifyInstance } from 'fastify'
import { prisma } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'

// ── In-memory cache (1 hour TTL per brand) ────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 60 * 60 * 1000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data as T
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() })
}
function bustCache(brandId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(brandId)) cache.delete(key)
  }
}

// ── Chart ID → function map ────────────────────────────────────────────────
type ChartFn = (brandId: string) => Promise<unknown>

const CHARTS: Record<string, ChartFn> = {
  skinConcernDistribution: getSkinConcernDistribution,
  fitzpatrickBreakdown:    getFitzpatrickBreakdown,
  complianceRate:          getComplianceTrend,
  productOutcomeHeatmap:   getProductOutcomeHeatmap,
  repurchaseVelocity:      getRepurchaseVelocity,
  lifecycleFunnel:         getLifecycleFunnel,
  sentimentTrend:          getSentimentTrend,
  climateSkintypeMap:      getClimateSkintypeMap,
  budgetCohortPerformance: getBudgetCohortPerformance,
  ingredientEfficacy:      getIngredientEfficacyIndex,
}

const TONE_LABELS = ['i', 'ii', 'iii', 'iv', 'v', 'vi'] as const

export async function analyticsRoutes(server: FastifyInstance) {

  // ── Full summary — all 10 charts (cached 1h) ──────────────────────────
  server.get(
    '/:brandId/analytics/summary',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const cacheKey = `${brandId}:summary`
      const cached = getCached(cacheKey)
      if (cached) return cached

      const [
        skinConcernDistribution,
        fitzpatrickBreakdown,
        complianceRate,
        productOutcomeHeatmap,
        repurchaseVelocity,
        lifecycleFunnel,
        sentimentTrend,
        climateSkintypeMap,
        budgetCohortPerformance,
        ingredientEfficacy,
      ] = await Promise.all(Object.values(CHARTS).map(fn => fn(brandId)))

      const result = {
        generatedAt: new Date().toISOString(),
        charts: {
          skinConcernDistribution,
          fitzpatrickBreakdown,
          complianceRate,
          productOutcomeHeatmap,
          repurchaseVelocity,
          lifecycleFunnel,
          sentimentTrend,
          climateSkintypeMap,
          budgetCohortPerformance,
          ingredientEfficacy,
        },
      }

      setCache(cacheKey, result)
      return result
    }
  )

  // ── Per-chart refresh ─────────────────────────────────────────────────
  server.get(
    '/:brandId/analytics/:chartId/refresh',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, chartId } = request.params as { brandId: string; chartId: string }
      const fn = CHARTS[chartId]
      if (!fn) throw new ApiError(404, `Unknown chart: ${chartId}`)

      const data = await fn(brandId)
      // Bust full summary cache so next summary call picks up the fresh chart
      bustCache(brandId)
      return { chartId, data, generatedAt: new Date().toISOString() }
    }
  )

  // ── Legacy endpoint (kept for backwards compat with existing dashboard) ─
  server.get(
    '/:brandId/analytics',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const [endUsers, profiles, checkIns, routineSteps, checkInProducts] = await Promise.all([
        prisma.endUser.findMany({ where: { brandId }, select: { id: true } }),
        prisma.userBeautyProfile.findMany({
          where: { endUser: { brandId } },
          select: { fitzpatrickType: true, skinType: true, skinConcerns: true, ageRange: true },
        }),
        prisma.checkIn.findMany({
          where: { endUser: { brandId } },
          select: { date: true, skinRating: true, compliant: true, symptoms: true },
          orderBy: { date: 'asc' },
        }),
        prisma.routineStep.findMany({
          where: { routine: { endUser: { brandId }, activeTo: null } },
          select: {
            productId: true,
            product: { select: { id: true, name: true, category: true, keyIngredients: true, concerns: true } },
          },
        }),
        prisma.checkInProduct.findMany({
          where: { checkIn: { endUser: { brandId } } },
          select: {
            productId: true, used: true, reaction: true,
            product: { select: { id: true, name: true, category: true } },
          },
        }),
      ])

      const totalConsumers = endUsers.length
      const totalCheckIns = checkIns.length
      const avgRating = totalCheckIns > 0 ? checkIns.reduce((s, c) => s + c.skinRating, 0) / totalCheckIns : null
      const complianceRate = totalCheckIns > 0 ? (checkIns.filter(c => c.compliant).length / totalCheckIns) * 100 : null
      const usageRate = checkInProducts.length > 0 ? (checkInProducts.filter(p => p.used).length / checkInProducts.length) * 100 : null

      const profileCount = Math.max(profiles.length, 1)
      const fitzMap: Record<number, number> = {}
      profiles.forEach(p => { if (p.fitzpatrickType) fitzMap[p.fitzpatrickType] = (fitzMap[p.fitzpatrickType] || 0) + 1 })
      const fitzpatrick = [1, 2, 3, 4, 5, 6].map((type, i) => ({
        type, tone: TONE_LABELS[i], label: `Type ${type}`,
        count: fitzMap[type] || 0, pct: Math.round(((fitzMap[type] || 0) / profileCount) * 100),
      }))

      const skinTypeMap: Record<string, number> = {}
      profiles.forEach(p => { if (p.skinType) skinTypeMap[p.skinType] = (skinTypeMap[p.skinType] || 0) + 1 })
      const skinTypes = Object.entries(skinTypeMap).sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count, pct: Math.round((count / profileCount) * 100) }))

      const concernMap: Record<string, number> = {}
      profiles.forEach(p => p.skinConcerns.forEach(c => { concernMap[c] = (concernMap[c] || 0) + 1 }))
      const concerns = Object.entries(concernMap).sort((a, b) => b[1] - a[1])
        .map(([concern, count]) => ({ concern, count, pct: Math.round((count / profileCount) * 100) }))

      const AGE_ORDER = ['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus']
      const AGE_LABELS: Record<string, string> = {
        under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
        '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
      }
      const ageMap: Record<string, number> = {}
      profiles.forEach(p => { if (p.ageRange) ageMap[p.ageRange] = (ageMap[p.ageRange] || 0) + 1 })
      const ageRanges = AGE_ORDER.filter(k => ageMap[k]).map(k => ({ group: AGE_LABELS[k] ?? k, n: ageMap[k] }))

      const now = Date.now()
      const weeklyTrend: number[] = Array(12).fill(0)
      checkIns.forEach(ci => {
        const weeks = Math.floor((now - new Date(ci.date).getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeks < 12) weeklyTrend[11 - weeks]!++
      })

      const symptomMap: Record<string, number> = {}
      checkIns.forEach(ci => ci.symptoms.forEach((s: string) => { symptomMap[s] = (symptomMap[s] || 0) + 1 }))
      const symptoms = Object.entries(symptomMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([symptom, count]) => ({ symptom, count }))

      const productPerf: Record<string, { name: string; category: string; used: number; positive: number; neutral: number; negative: number; total: number }> = {}
      checkInProducts.forEach(cip => {
        if (!productPerf[cip.productId]) {
          productPerf[cip.productId] = { name: cip.product.name, category: cip.product.category, used: 0, positive: 0, neutral: 0, negative: 0, total: 0 }
        }
        const p = productPerf[cip.productId]!
        p.total++
        if (cip.used) p.used++
        if (cip.reaction === 'POSITIVE') p.positive++
        if (cip.reaction === 'NEUTRAL') p.neutral++
        if (cip.reaction === 'NEGATIVE') p.negative++
      })
      const topProducts = Object.entries(productPerf).sort((a, b) => b[1].positive - a[1].positive || b[1].used - a[1].used).slice(0, 5)
        .map(([id, p]) => ({ id, ...p, rate: p.total > 0 ? Math.round((p.used / p.total) * 100) : 0 }))

      const catMap: Record<string, { used: number; total: number }> = {}
      checkInProducts.forEach(cip => {
        const cat = cip.product.category
        if (!catMap[cat]) catMap[cat] = { used: 0, total: 0 }
        catMap[cat]!.total++
        if (cip.used) catMap[cat]!.used++
      })
      const categoryPerf = Object.entries(catMap)
        .map(([category, v]) => ({ category, used: v.used, total: v.total, acceptance: Math.round((v.used / v.total) * 100) }))
        .sort((a, b) => b.acceptance - a.acceptance)

      const uniqueProducts = new Map<string, typeof routineSteps[0]['product']>()
      routineSteps.forEach(s => uniqueProducts.set(s.productId, s.product))
      const totalRoutineProducts = uniqueProducts.size
      const ingMap: Record<string, { count: number; concerns: Set<string> }> = {}
      uniqueProducts.forEach(product => {
        product.keyIngredients.forEach(ing => {
          if (!ingMap[ing]) ingMap[ing] = { count: 0, concerns: new Set() }
          ingMap[ing]!.count++
          product.concerns.forEach((c: string) => ingMap[ing]!.concerns.add(c))
        })
      })
      const topIngredients = Object.entries(ingMap).sort((a, b) => b[1].count - a[1].count).slice(0, 8)
        .map(([name, d]) => ({ name, count: d.count, score: Math.round((d.count / Math.max(totalRoutineProducts, 1)) * 100), concerns: Array.from(d.concerns).slice(0, 2) }))

      const concernCoverage = concerns.map(c => {
        const covered = Array.from(uniqueProducts.values()).filter(p => p.concerns.includes(c.concern as never)).length
        return { concern: c.concern, userPct: c.pct, productCount: covered, coverage: totalRoutineProducts > 0 ? Math.round((covered / totalRoutineProducts) * 100) : 0 }
      })

      return {
        summary: {
          totalConsumers, totalCheckIns,
          avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
          complianceRate: complianceRate !== null ? Math.round(complianceRate) : null,
          usageRate: usageRate !== null ? Math.round(usageRate) : null,
        },
        consumers: { fitzpatrick, skinTypes, concerns, ageRanges },
        checkIns: { weeklyTrend, thisWeek: weeklyTrend[11], lastWeek: weeklyTrend[10], symptoms },
        products: { topProducts, categoryPerf, topIngredients, concernCoverage, totalRecommended: routineSteps.length },
      }
    }
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Chart query functions
// ════════════════════════════════════════════════════════════════════════════

// Chart 1 — Skin Concern Distribution
async function getSkinConcernDistribution(brandId: string) {
  const profiles = await prisma.userBeautyProfile.findMany({
    where: { endUser: { brandId } },
    select: { skinConcerns: true },
  })
  const total = Math.max(profiles.length, 1)
  const map: Record<string, number> = {}
  profiles.forEach(p => p.skinConcerns.forEach((c: string) => { map[c] = (map[c] ?? 0) + 1 }))
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([concern, count]) => ({ concern, count, pct: Math.round((count / total) * 100) }))
}

// Chart 2 — Fitzpatrick Type Breakdown
async function getFitzpatrickBreakdown(brandId: string) {
  const profiles = await prisma.userBeautyProfile.findMany({
    where: { endUser: { brandId } },
    select: { fitzpatrickType: true },
  })
  const total = Math.max(profiles.length, 1)
  const map: Record<number, number> = {}
  profiles.forEach(p => { if (p.fitzpatrickType) map[p.fitzpatrickType] = (map[p.fitzpatrickType] ?? 0) + 1 })
  const rows = [1, 2, 3, 4, 5, 6].map((type, i) => ({
    type, tone: TONE_LABELS[i], label: `Type ${type}`,
    count: map[type] ?? 0, pct: Math.round(((map[type] ?? 0) / total) * 100),
  }))
  const darkSkinnedPct = rows.slice(3).reduce((s, r) => s + r.pct, 0)
  return { rows, darkSkinnedPct }
}

// Chart 3 — Routine Compliance Rate (30d rolling, daily)
async function getComplianceTrend(brandId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const checkIns = await prisma.checkIn.findMany({
    where: { endUser: { brandId }, date: { gte: since } },
    select: { date: true, compliant: true },
    orderBy: { date: 'asc' },
  })

  const dayMap: Record<string, { compliant: number; total: number }> = {}
  checkIns.forEach(ci => {
    const day = new Date(ci.date).toISOString().split('T')[0]!
    if (!dayMap[day]) dayMap[day] = { compliant: 0, total: 0 }
    dayMap[day].total++
    if (ci.compliant) dayMap[day].compliant++
  })

  const chartData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      complianceRate: Math.round((d.compliant / d.total) * 100),
      total: d.total,
    }))

  const avg30d = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.complianceRate, 0) / chartData.length)
    : null

  const first = chartData[0]?.complianceRate ?? 0
  const last = chartData[chartData.length - 1]?.complianceRate ?? 0
  const trend = last > first + 5 ? 'improving' : last < first - 5 ? 'declining' : 'stable'

  return { chartData, avg30d, trend }
}

// Chart 4 — Product Outcome Heatmap (product × skin concern → avg rating)
async function getProductOutcomeHeatmap(brandId: string) {
  const rows = await prisma.checkInProduct.findMany({
    where: { checkIn: { endUser: { brandId } }, used: true },
    select: {
      productId: true,
      product: { select: { name: true } },
      checkIn: {
        select: {
          skinRating: true,
          endUser: { select: { beautyProfile: { select: { skinConcerns: true } } } },
        },
      },
    },
  })

  // productId × concern → ratings[]
  const map: Record<string, Record<string, { ratings: number[]; name: string }>> = {}
  rows.forEach(row => {
    const concerns = (row.checkIn.endUser.beautyProfile?.skinConcerns ?? []) as string[]
    const primaryConcern = concerns[0]
    if (!primaryConcern) return
    if (!map[row.productId]) map[row.productId] = {}
    if (!map[row.productId]![primaryConcern]) map[row.productId]![primaryConcern] = { ratings: [], name: row.product.name }
    map[row.productId]![primaryConcern]!.ratings.push(row.checkIn.skinRating)
  })

  const result: Array<{ productId: string; productName: string; concern: string; avgRating: number; sampleSize: number }> = []
  Object.entries(map).forEach(([productId, concerns]) => {
    Object.entries(concerns).forEach(([concern, d]) => {
      if (d.ratings.length < 2) return
      const avg = d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length
      result.push({ productId, productName: d.name, concern, avgRating: Math.round(avg * 10) / 10, sampleSize: d.ratings.length })
    })
  })
  return result.sort((a, b) => b.avgRating - a.avgRating)
}

// Chart 5 — Repurchase Velocity (sticky products in active routines)
async function getRepurchaseVelocity(brandId: string) {
  const [activeSteps, totalActiveRoutines] = await Promise.all([
    prisma.routineStep.findMany({
      where: { routine: { endUser: { brandId }, activeTo: null } },
      select: {
        productId: true,
        product: { select: { name: true, category: true } },
      },
    }),
    prisma.routine.count({ where: { endUser: { brandId }, activeTo: null } }),
  ])

  const map: Record<string, { name: string; category: string; count: number }> = {}
  activeSteps.forEach(s => {
    if (!map[s.productId]) map[s.productId] = { name: s.product.name, category: s.product.category, count: 0 }
    map[s.productId]!.count++
  })

  return Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, p]) => ({
      productId: id,
      name: p.name,
      category: p.category,
      activeRoutineCount: p.count,
      retentionRate: totalActiveRoutines > 0 ? Math.round((p.count / totalActiveRoutines) * 100) : 0,
    }))
}

// Chart 6 — Customer Lifecycle Funnel
async function getLifecycleFunnel(brandId: string) {
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [quizStarted, quizCompleted, routineCreated, firstCheckIn, active30d, retained90d] = await Promise.all([
    prisma.quizSession.count({ where: { brandId } }),
    prisma.quizSession.count({ where: { brandId, completed: true } }),
    prisma.endUser.count({ where: { brandId, routines: { some: {} } } }),
    prisma.endUser.count({ where: { brandId, checkIns: { some: {} } } }),
    prisma.endUser.count({ where: { brandId, checkIns: { some: { date: { gte: d30 } } } } }),
    prisma.endUser.count({ where: { brandId, checkIns: { some: { date: { gte: d90 } } } } }),
  ])

  const stages = [
    { stage: 'Quiz Started',    count: quizStarted },
    { stage: 'Quiz Completed',  count: quizCompleted },
    { stage: 'Routine Created', count: routineCreated },
    { stage: 'First Check-in',  count: firstCheckIn },
    { stage: '30-Day Active',   count: active30d },
    { stage: '90-Day Retained', count: retained90d },
  ]

  return stages.map((s, i) => ({
    ...s,
    dropoffPct: i === 0 || !stages[i - 1] || stages[i - 1]!.count === 0
      ? 0
      : Math.round(((stages[i - 1]!.count - s.count) / stages[i - 1]!.count) * 100),
  }))
}

// Chart 7 — Check-in Sentiment Trend (90d daily, segmented by skin type)
async function getSentimentTrend(brandId: string) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [checkIns, refinements] = await Promise.all([
    prisma.checkIn.findMany({
      where: { endUser: { brandId }, date: { gte: since } },
      select: {
        date: true,
        skinRating: true,
        endUser: { select: { beautyProfile: { select: { skinType: true } } } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.routine.findMany({
      where: { endUser: { brandId }, activeTo: { gte: since } },
      select: { activeTo: true },
    }),
  ])

  const dayMap: Record<string, { ratings: number[]; bySkinType: Record<string, number[]> }> = {}
  checkIns.forEach(ci => {
    const day = new Date(ci.date).toISOString().split('T')[0]!
    if (!dayMap[day]) dayMap[day] = { ratings: [], bySkinType: {} }
    dayMap[day].ratings.push(ci.skinRating)
    const skinType = ci.endUser.beautyProfile?.skinType
    if (skinType) {
      if (!dayMap[day].bySkinType[skinType]) dayMap[day].bySkinType[skinType] = []
      dayMap[day].bySkinType[skinType]!.push(ci.skinRating)
    }
  })

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null

  const chartData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      avgRating: avg(d.ratings),
      bySkinType: Object.fromEntries(Object.entries(d.bySkinType).map(([t, r]) => [t, avg(r)])),
    }))

  const refinementByDay: Record<string, number> = {}
  refinements.forEach(r => {
    if (r.activeTo) {
      const day = r.activeTo.toISOString().split('T')[0]!
      refinementByDay[day] = (refinementByDay[day] ?? 0) + 1
    }
  })

  return {
    chartData,
    refinementMarkers: Object.entries(refinementByDay).map(([date, count]) => ({ date, count })),
  }
}

// Chart 8 — Climate Region × Skin Type Map
async function getClimateSkintypeMap(brandId: string) {
  const profiles = await prisma.userBeautyProfile.findMany({
    where: { endUser: { brandId } },
    select: { climateTag: true, skinType: true },
  })

  const map: Record<string, Record<string, number>> = {}
  profiles.forEach(p => {
    if (!p.climateTag || !p.skinType) return
    const climate = p.climateTag as string
    if (!map[climate]) map[climate] = {}
    map[climate][p.skinType] = (map[climate][p.skinType] ?? 0) + 1
  })

  const result: Array<{ climate: string; skinType: string; count: number }> = []
  Object.entries(map).forEach(([climate, types]) => {
    Object.entries(types).forEach(([skinType, count]) => result.push({ climate, skinType, count }))
  })
  return result.sort((a, b) => b.count - a.count)
}

// Chart 9 — Budget Tier Cohort Performance
async function getBudgetCohortPerformance(brandId: string) {
  const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const users = await prisma.endUser.findMany({
    where: { brandId },
    select: {
      id: true,
      beautyProfile: { select: { spendMax: true } },
      checkIns: { select: { skinRating: true, compliant: true, date: true } },
    },
  })

  const TIERS = [
    { label: 'Under $50',  min: 0,   max: 50  },
    { label: '$50–$100',   min: 50,  max: 100 },
    { label: '$100–$200',  min: 100, max: 200 },
    { label: '$200+',      min: 200, max: Infinity },
  ]

  return TIERS.map(tier => {
    const cohort = users.filter(u => {
      const spend = u.beautyProfile?.spendMax ?? null
      return spend !== null && spend >= tier.min && spend < tier.max
    })
    const allCheckIns = cohort.flatMap(u => u.checkIns)
    const avgRating = allCheckIns.length > 0
      ? Math.round((allCheckIns.reduce((s, c) => s + c.skinRating, 0) / allCheckIns.length) * 10) / 10
      : null
    const complianceRate = allCheckIns.length > 0
      ? Math.round((allCheckIns.filter(c => c.compliant).length / allCheckIns.length) * 100)
      : null
    const retained90d = cohort.length > 0
      ? Math.round((cohort.filter(u => u.checkIns.some(c => new Date(c.date) >= d90)).length / cohort.length) * 100)
      : null

    return { tier: tier.label, userCount: cohort.length, avgRating, complianceRate, retained90d }
  })
}

// Chart 10 — Ingredient Efficacy Index
async function getIngredientEfficacyIndex(brandId: string) {
  const rows = await prisma.checkInProduct.findMany({
    where: { checkIn: { endUser: { brandId } }, used: true },
    select: {
      product: { select: { keyIngredients: true } },
      checkIn: { select: { skinRating: true } },
    },
  })

  const map: Record<string, number[]> = {}
  rows.forEach(row => {
    const rating = row.checkIn.skinRating
    row.product.keyIngredients.forEach((ing: string) => {
      if (!map[ing]) map[ing] = []
      map[ing]!.push(rating)
    })
  })

  return Object.entries(map)
    .filter(([_, ratings]) => ratings.length >= 3)
    .map(([ingredient, ratings]) => ({
      ingredient,
      avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
      sampleSize: ratings.length,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 15)
}
