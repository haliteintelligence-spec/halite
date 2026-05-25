import type { FastifyInstance } from 'fastify'
import { prisma } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'

const TONE_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const

export async function analyticsRoutes(server: FastifyInstance) {
  server.get(
    '/:brandId/analytics',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const q = request.query as Record<string, string>
      const rawFrom = q.from
      const rawTo = q.to
      const dateRe = /^\d{4}-\d{2}-\d{2}$/

      let cutoff: Date
      let endDate: Date

      if (rawFrom && dateRe.test(rawFrom)) {
        cutoff = new Date(rawFrom + 'T00:00:00')
        endDate = rawTo && dateRe.test(rawTo) ? new Date(rawTo + 'T23:59:59') : new Date()
      } else {
        const rawDays = q.days
        const days = Math.min(Math.max(Number(rawDays) || 30, 7), 365)
        cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        endDate = new Date()
      }

      const windowMs = endDate.getTime() - cutoff.getTime()

      const [endUsers, profiles, checkIns, routineSteps, checkInProducts, refinedCount] = await Promise.all([
        prisma.endUser.findMany({
          where: { brandId },
          select: { id: true },
        }),
        prisma.userBeautyProfile.findMany({
          where: { endUser: { brandId } },
          select: { monkSkinTone: true, skinType: true, skinConcerns: true, ageRange: true },
        }),
        prisma.checkIn.findMany({
          where: { endUser: { brandId }, date: { gte: cutoff, lte: endDate } },
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
          where: { checkIn: { endUser: { brandId }, date: { gte: cutoff, lte: endDate } } },
          select: {
            productId: true,
            used: true,
            reaction: true,
            product: { select: { id: true, name: true, category: true } },
          },
        }),
        prisma.routine.count({
          where: { endUser: { brandId }, version: { gt: 1 } },
        }),
      ])

      // ── Summary KPIs ──────────────────────────────────────────────
      const totalConsumers = endUsers.length
      const totalCheckIns = checkIns.length
      const avgRating = totalCheckIns > 0
        ? checkIns.reduce((s, c) => s + c.skinRating, 0) / totalCheckIns
        : null
      const complianceRate = totalCheckIns > 0
        ? (checkIns.filter(c => c.compliant).length / totalCheckIns) * 100
        : null
      const usageRate = checkInProducts.length > 0
        ? (checkInProducts.filter(p => p.used).length / checkInProducts.length) * 100
        : null

      // ── Consumer profiles ─────────────────────────────────────────
      const profileCount = Math.max(profiles.length, 1)

      const toneMap: Record<number, number> = {}
      profiles.forEach(p => { if (p.monkSkinTone) toneMap[p.monkSkinTone] = (toneMap[p.monkSkinTone] || 0) + 1 })
      const monkSkinTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((type, i) => ({
        type,
        label: `MST ${TONE_LABELS[i]}`,
        count: toneMap[type] || 0,
        pct: Math.round(((toneMap[type] || 0) / profileCount) * 100),
      }))

      const skinTypeMap: Record<string, number> = {}
      profiles.forEach(p => { if (p.skinType) skinTypeMap[p.skinType] = (skinTypeMap[p.skinType] || 0) + 1 })
      const skinTypes = Object.entries(skinTypeMap)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count, pct: Math.round((count / profileCount) * 100) }))

      const concernMap: Record<string, number> = {}
      profiles.forEach(p => p.skinConcerns.forEach(c => { concernMap[c] = (concernMap[c] || 0) + 1 }))
      const concerns = Object.entries(concernMap)
        .sort((a, b) => b[1] - a[1])
        .map(([concern, count]) => ({ concern, count, pct: Math.round((count / profileCount) * 100) }))

      const AGE_ORDER = ['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus']
      const AGE_LABELS: Record<string, string> = {
        under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
        '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
      }
      const ageMap: Record<string, number> = {}
      profiles.forEach(p => { if (p.ageRange) ageMap[p.ageRange] = (ageMap[p.ageRange] || 0) + 1 })
      const ageRanges = AGE_ORDER
        .filter(k => ageMap[k])
        .map(k => ({ group: AGE_LABELS[k] ?? k, n: ageMap[k] }))

      // ── Check-in trend ─────────────────────────────────────────────
      // Bucket into 12 slots spanning the selected window
      const endTs = endDate.getTime()
      const trendSlots = 12
      const slotMs = windowMs / trendSlots
      const weeklyTrend: number[] = Array(trendSlots).fill(0)
      const ratingAccum: { sum: number; count: number }[] = Array.from({ length: trendSlots }, () => ({ sum: 0, count: 0 }))
      const complianceAccum: { compliant: number; total: number }[] = Array.from({ length: trendSlots }, () => ({ compliant: 0, total: 0 }))

      checkIns.forEach(ci => {
        const age = endTs - new Date(ci.date).getTime()
        const slot = Math.floor(age / slotMs)
        if (slot < trendSlots) {
          weeklyTrend[trendSlots - 1 - slot]!++
          ratingAccum[trendSlots - 1 - slot]!.sum += ci.skinRating
          ratingAccum[trendSlots - 1 - slot]!.count++
          complianceAccum[trendSlots - 1 - slot]!.total++
          if (ci.compliant) complianceAccum[trendSlots - 1 - slot]!.compliant++
        }
      })

      const ratingTrend = ratingAccum.map(w =>
        w.count > 0 ? Math.round((w.sum / w.count) * 10) / 10 : null
      )
      const complianceTrend = complianceAccum.map(w =>
        w.total > 0 ? Math.round((w.compliant / w.total) * 100) : null
      )

      const POSITIVE_SYMPTOMS = new Set(['IMPROVEMENT', 'GLOW', 'HYDRATED', 'TEXTURE_SMOOTH'])
      const symptomMap: Record<string, number> = {}
      let positiveSymptomCount = 0
      let negativeSymptomCount = 0
      checkIns.forEach(ci => ci.symptoms.forEach((s: string) => {
        symptomMap[s] = (symptomMap[s] || 0) + 1
        if (POSITIVE_SYMPTOMS.has(s)) positiveSymptomCount++
        else negativeSymptomCount++
      }))
      const symptoms = Object.entries(symptomMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([symptom, count]) => ({ symptom, count, positive: POSITIVE_SYMPTOMS.has(symptom) }))

      // ── Product performance ───────────────────────────────────────
      const productPerf: Record<string, {
        name: string; category: string
        used: number; positive: number; neutral: number; negative: number; total: number
      }> = {}
      checkInProducts.forEach(cip => {
        if (!productPerf[cip.productId]) {
          productPerf[cip.productId] = {
            name: cip.product.name, category: cip.product.category,
            used: 0, positive: 0, neutral: 0, negative: 0, total: 0,
          }
        }
        const p = productPerf[cip.productId]!
        p.total++
        if (cip.used) p.used++
        if (cip.reaction === 'POSITIVE') p.positive++
        if (cip.reaction === 'NEUTRAL') p.neutral++
        if (cip.reaction === 'NEGATIVE') p.negative++
      })
      const topProducts = Object.entries(productPerf)
        .sort((a, b) => b[1].positive - a[1].positive || b[1].used - a[1].used)
        .slice(0, 5)
        .map(([id, p]) => ({
          id, name: p.name, category: p.category,
          used: p.used, positive: p.positive, neutral: p.neutral, negative: p.negative, total: p.total,
          rate: p.total > 0 ? Math.round((p.used / p.total) * 100) : 0,
        }))

      const catMap: Record<string, { used: number; total: number }> = {}
      checkInProducts.forEach(cip => {
        const cat = cip.product.category
        if (!catMap[cat]) catMap[cat] = { used: 0, total: 0 }
        catMap[cat].total++
        if (cip.used) catMap[cat].used++
      })
      const categoryPerf = Object.entries(catMap)
        .map(([category, v]) => ({
          category,
          used: v.used,
          total: v.total,
          acceptance: Math.round((v.used / v.total) * 100),
        }))
        .sort((a, b) => b.acceptance - a.acceptance)

      // ── Ingredient data ───────────────────────────────────────────
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
      const topIngredients = Object.entries(ingMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([name, d]) => ({
          name,
          count: d.count,
          score: Math.round((d.count / Math.max(totalRoutineProducts, 1)) * 100),
          concerns: Array.from(d.concerns).slice(0, 2),
        }))

      const concernCoverage = concerns.map(c => {
        const covered = Array.from(uniqueProducts.values())
          .filter(p => p.concerns.includes(c.concern as never)).length
        return {
          concern: c.concern,
          userPct: c.pct,
          productCount: covered,
          coverage: totalRoutineProducts > 0 ? Math.round((covered / totalRoutineProducts) * 100) : 0,
        }
      })

      return {
        summary: {
          totalConsumers,
          totalCheckIns,
          avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
          complianceRate: complianceRate !== null ? Math.round(complianceRate) : null,
          usageRate: usageRate !== null ? Math.round(usageRate) : null,
        },
        consumers: { monkSkinTones, skinTypes, concerns, ageRanges },
        checkIns: {
          weeklyTrend,
          ratingTrend,
          complianceTrend,
          thisWeek: weeklyTrend[trendSlots - 1]!,
          lastWeek: weeklyTrend[trendSlots - 2]!,
          symptoms,
          positiveSymptomCount,
          negativeSymptomCount,
        },
        outcomes: {
          totalRefined: refinedCount,
        },
        products: {
          topProducts,
          categoryPerf,
          topIngredients,
          concernCoverage,
          totalRecommended: routineSteps.length,
        },
      }
    }
  )
}
