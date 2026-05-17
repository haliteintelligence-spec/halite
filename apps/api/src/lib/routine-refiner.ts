import { prisma } from '@halite/db'
import { generateRoutine, reorderDueDays } from './routine-generator.js'

export interface RefineResult {
  area: string
  refined: boolean
  newRoutineId?: string
  reason: string
}

export async function refineRoutine(
  userId: string,
  brandId: string,
  routineId: string,
): Promise<RefineResult> {
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, endUserId: userId, activeTo: null },
    include: {
      steps: { select: { productId: true } },
      quizSession: { select: { answers: true } },
    },
  })
  if (!routine) {
    return { area: 'unknown', refined: false, reason: 'Routine not found or already superseded' }
  }

  const area = routine.focusArea as string

  const checkIns = await prisma.checkIn.findMany({
    where: { endUserId: userId, date: { gte: routine.createdAt } },
    include: { products: true },
    orderBy: { date: 'desc' },
  })

  if (checkIns.length < 3) {
    return {
      area,
      refined: false,
      reason: `Need at least 3 check-ins since routine started (${checkIns.length} so far)`,
    }
  }

  // ── Metrics ────────────────────────────────────────────────────────────
  const ratings = checkIns.map(c => c.skinRating)
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
  const half = Math.max(1, Math.floor(ratings.length / 2))
  const recentAvg = ratings.slice(0, half).reduce((a, b) => a + b, 0) / half
  const earlyAvg = ratings.slice(-half).reduce((a, b) => a + b, 0) / half
  const trend = recentAvg - earlyAvg // positive = improving
  const compliance = checkIns.filter(c => c.compliant).length / checkIns.length

  // ── Find problem products ──────────────────────────────────────────────
  const productReactions: Record<string, { neg: number; pos: number; total: number }> = {}
  for (const c of checkIns) {
    for (const p of c.products) {
      if (!productReactions[p.productId]) {
        productReactions[p.productId] = { neg: 0, pos: 0, total: 0 }
      }
      productReactions[p.productId]!.total++
      if (p.reaction === 'NEGATIVE') productReactions[p.productId]!.neg++
      if (p.reaction === 'POSITIVE') productReactions[p.productId]!.pos++
    }
  }

  const badProductIds = Object.entries(productReactions)
    .filter(([_, v]) => v.neg >= 2 && v.neg / v.total >= 0.5)
    .map(([id]) => id)

  // ── Decide if refinement is warranted ─────────────────────────────────
  const needsRefinement = badProductIds.length > 0 || avgRating < 3.0 || trend < -0.5

  if (!needsRefinement) {
    const reorderDays = reorderDueDays(area)
    await prisma.routine.update({
      where: { id: routineId },
      data: { reorderDue: new Date(Date.now() + reorderDays * 24 * 60 * 60 * 1000) },
    })
    return {
      area,
      refined: false,
      reason: `Routine is performing well (avg ${avgRating.toFixed(1)}/5, ${Math.round(compliance * 100)}% compliance). Reorder date extended.`,
    }
  }

  // ── Generate refined routine ───────────────────────────────────────────
  const answers = (routine.quizSession.answers as Record<string, unknown>) ?? {}
  const checkInContext = buildCheckInContext(checkIns.length, avgRating, trend, compliance, badProductIds)

  const newRoutine = await generateRoutine(
    userId, brandId, routine.quizSessionId, area, answers,
    { excludeProductIds: badProductIds, checkInContext, version: routine.version + 1 },
  )

  if (!newRoutine) {
    return { area, refined: false, reason: 'Could not generate an improved routine with available products' }
  }

  // ── Supersede the old routine ──────────────────────────────────────────
  await prisma.routine.update({
    where: { id: routineId },
    data: { activeTo: new Date(), supersededBy: newRoutine.id },
  })

  return {
    area,
    refined: true,
    newRoutineId: newRoutine.id,
    reason: buildRefinementReason(badProductIds, avgRating, trend),
  }
}

function buildCheckInContext(
  count: number,
  avgRating: number,
  trend: number,
  compliance: number,
  badProductIds: string[],
): string {
  const lines = [
    `${count} check-ins recorded since this routine started.`,
    `Average skin rating: ${avgRating.toFixed(1)}/5`,
    `Rating trend: ${trend > 0 ? `improving (+${trend.toFixed(1)})` : `declining (${trend.toFixed(1)})`}`,
    `Compliance rate: ${Math.round(compliance * 100)}%`,
  ]
  if (badProductIds.length > 0) {
    lines.push(`Products excluded due to consistent negative reactions: ${badProductIds.join(', ')}`)
    lines.push(`Do NOT include these product IDs in the new routine.`)
  }
  lines.push(`This is a refinement — improve on the prior routine using the above signals.`)
  return lines.join('\n')
}

function buildRefinementReason(badProductIds: string[], avgRating: number, trend: number): string {
  const parts: string[] = []
  if (badProductIds.length > 0) {
    parts.push(`${badProductIds.length} product(s) removed due to consistent negative reactions`)
  }
  if (avgRating < 3.0) parts.push(`low average skin rating (${avgRating.toFixed(1)}/5)`)
  if (trend < -0.5) parts.push('declining rating trend')
  return `Routine refined: ${parts.join('; ')}`
}
