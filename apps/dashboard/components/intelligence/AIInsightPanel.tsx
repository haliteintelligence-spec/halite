import { Sparkles, AlertCircle, TrendingUp, Zap } from 'lucide-react'
import { getAnalytics } from '@/lib/api'
import type { AnalyticsData } from '@/lib/api'
import { InsightAccordion } from './InsightAccordion'

const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne / Breakouts',
  HYPERPIGMENTATION: 'Hyperpigmentation',
  AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity',
  DRYNESS: 'Dryness',
  OILINESS: 'Oiliness',
  REDNESS: 'Redness',
  DULLNESS: 'Dullness',
  UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles',
  PORES: 'Pores',
  DEHYDRATION: 'Dehydration',
}

type InsightType = 'opportunity' | 'trend' | 'performance' | 'alert'
type Urgency = 'Critical' | 'High' | 'Medium'

export interface DerivedInsight {
  type: InsightType
  title: string
  body: string
  module: string
}

export interface DerivedAction {
  iconName: 'AlertCircle' | 'TrendingUp' | 'Zap' | 'Sparkles'
  label: string
  urgency: Urgency
  module: string
}

function derivePanel(analytics: AnalyticsData): {
  insights: DerivedInsight[]
  actions: DerivedAction[]
  score: number
  scoreLabel: string
  todaySignal: string
} {
  const { summary, consumers, products } = analytics
  const insights: DerivedInsight[] = []
  const actions: DerivedAction[] = []

  // ── Insights ─────────────────────────────────────────────────────

  // 1. Top concern coverage gap
  const topGap = [...products.concernCoverage]
    .sort((a, b) => b.userPct - a.userPct)
    .find(c => c.coverage === 0)

  if (topGap) {
    const label = CONCERN_LABELS[topGap.concern] ?? topGap.concern
    insights.push({
      type: 'opportunity',
      title: `${label} gap`,
      body: `${topGap.userPct}% of your consumers report ${label.toLowerCase()} but you have zero product coverage. Closing this gap is your highest-value catalogue move.`,
      module: 'Ingredients',
    })
  }

  // 2. Skin tone skew
  if (consumers.monkSkinTones.length > 0) {
    const dominant = consumers.monkSkinTones.reduce(
      (best, f) => f.count > best.count ? f : best,
      consumers.monkSkinTones[0]
    )
    const topConcern = consumers.concerns[0]
    if (dominant.count > 0) {
      insights.push({
        type: 'performance',
        title: `MST ${dominant.label} over-index`,
        body: `${dominant.pct}% of your consumers are MST ${dominant.type}${topConcern ? ` — they disproportionately report ${(CONCERN_LABELS[topConcern.concern] ?? topConcern.concern).toLowerCase()} (${topConcern.pct}%). Ensure formulations are optimised for this profile.` : '.'}`,
        module: 'Consumer',
      })
    }
  }

  // 3. Recommendation engine performance
  if (products.categoryPerf.length > 0) {
    const sorted = [...products.categoryPerf].sort((a, b) => b.acceptance - a.acceptance)
    const best = sorted[0]!
    const worst = sorted[sorted.length - 1]!
    if (best.acceptance > 0) {
      insights.push({
        type: best.acceptance >= 70 ? 'trend' : 'alert',
        title: `${best.category} leads recommendation acceptance`,
        body: `${best.category} has ${best.acceptance}% usage rate vs ${worst.category} at ${worst.acceptance}%. Focus curation effort on your weakest category to lift overall compliance.`,
        module: 'Products',
      })
    }
  }

  // 4. Compliance / satisfaction summary
  if (summary.complianceRate !== null || summary.avgRating !== null) {
    const compMsg = summary.complianceRate !== null
      ? `Routine compliance: ${summary.complianceRate}%${summary.complianceRate < 65 ? ' — below the 70% benchmark.' : ' — above benchmark.'}`
      : ''
    const ratingMsg = summary.avgRating !== null
      ? ` Average satisfaction: ${summary.avgRating}/5.`
      : ''
    insights.push({
      type: summary.complianceRate !== null && summary.complianceRate < 65 ? 'alert' : 'performance',
      title: 'Catalogue completeness',
      body: `${compMsg}${ratingMsg} ${products.concernCoverage.filter(c => c.coverage > 0).length} of ${products.concernCoverage.length} expressed concerns have product coverage.`,
      module: 'Benchmarking',
    })
  }

  // ── Actions ───────────────────────────────────────────────────────

  const gaps = [...products.concernCoverage]
    .filter(c => c.coverage === 0 && c.userPct > 10)
    .sort((a, b) => b.userPct - a.userPct)
    .slice(0, 2)

  gaps.forEach(g => {
    const label = CONCERN_LABELS[g.concern] ?? g.concern
    actions.push({
      iconName: 'AlertCircle',
      label: `Add product targeting ${label.toLowerCase()} (${g.userPct}% of consumers)`,
      urgency: g.userPct > 30 ? 'Critical' : 'High',
      module: 'Catalogue',
    })
  })

  if (products.categoryPerf.length > 0) {
    const worst = [...products.categoryPerf].sort((a, b) => a.acceptance - b.acceptance)[0]!
    if (worst.acceptance < 65) {
      actions.push({
        iconName: 'TrendingUp',
        label: `Improve ${worst.category.toLowerCase()} acceptance — currently ${worst.acceptance}%`,
        urgency: 'Medium',
        module: 'Products',
      })
    }
  }

  if (summary.complianceRate !== null && summary.complianceRate < 65) {
    actions.push({
      iconName: 'Zap',
      label: `Boost routine compliance — currently ${summary.complianceRate}%`,
      urgency: 'Medium',
      module: 'Routines',
    })
  }

  if (actions.length === 0) {
    actions.push({
      iconName: 'Sparkles',
      label: 'Review ingredient coverage against top consumer concerns',
      urgency: 'Medium',
      module: 'Catalogue',
    })
  }

  // ── Score ─────────────────────────────────────────────────────────
  const ratingScore = summary.avgRating ? (summary.avgRating / 5) * 100 : 50
  const score = Math.round(
    ratingScore * 0.35 +
    (summary.complianceRate ?? 50) * 0.35 +
    (summary.usageRate ?? 50) * 0.30
  )
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Developing'

  // ── Today's signal ────────────────────────────────────────────────
  const aboveMedian = [
    summary.avgRating !== null && summary.avgRating >= 3.5,
    summary.complianceRate !== null && summary.complianceRate >= 70,
    summary.usageRate !== null && summary.usageRate >= 60,
  ].filter(Boolean).length

  const todaySignal = aboveMedian >= 2
    ? `${summary.totalConsumers.toLocaleString()} active consumers. ${aboveMedian} of 3 key metrics are at or above industry median — keep reinforcing check-in habits.`
    : `${summary.totalConsumers.toLocaleString()} active consumers on platform. Focus on closing catalogue gaps and lifting routine compliance to reach the industry median.`

  return { insights, actions, score, scoreLabel, todaySignal }
}

export async function AIInsightPanel() {
  const analytics = await getAnalytics()

  const fallbackInsights: DerivedInsight[] = [
    {
      type: 'opportunity',
      title: 'No data yet',
      body: 'Intelligence insights will generate once consumers start completing the quiz and checking in.',
      module: 'Setup',
    },
  ]

  const fallbackActions: DerivedAction[] = [
    { iconName: 'Sparkles', label: 'Embed the quiz widget on your storefront to start collecting data', urgency: 'High', module: 'Setup' },
  ]

  const { insights, actions, score, scoreLabel, todaySignal } = analytics
    ? derivePanel(analytics)
    : { insights: fallbackInsights, actions: fallbackActions, score: 0, scoreLabel: 'No data', todaySignal: 'Embed the quiz to start building your consumer intelligence.' }

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden"
      style={{ background: 'var(--ink)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} style={{ color: 'var(--clay)' }} />
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: 'var(--clay)' }}>
            Halite AI
          </p>
        </div>
        <p className="text-sm font-semibold text-white">Intelligence Layer</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {insights.length} active insight{insights.length !== 1 ? 's' : ''} · updated now
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Insights accordion — client component for interactivity */}
        <InsightAccordion insights={insights} />

        <div className="mx-3 my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Recommended Actions */}
        <div className="px-3 py-3">
          <p className="text-[9px] font-semibold tracking-[0.16em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Recommended Actions
          </p>
          <div className="space-y-1.5">
            {actions.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span
                  className="text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/80 leading-snug">{a.label}</p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: a.urgency === 'Critical' ? 'rgba(239,68,68,0.2)' : a.urgency === 'High' ? 'rgba(251,191,36,0.2)' : 'rgba(107,158,120,0.2)',
                        color: a.urgency === 'Critical' ? '#f87171' : a.urgency === 'High' ? '#fbbf24' : 'var(--sage)',
                      }}
                    >
                      {a.urgency}
                    </span>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{a.module}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Pulse */}
        <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: 'rgba(191,122,90,0.12)', border: '1px solid rgba(191,122,90,0.2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={11} style={{ color: 'var(--clay)' }} />
            <p className="text-[10px] font-semibold" style={{ color: 'var(--clay)' }}>Intelligence score: {score} · {scoreLabel}</p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {todaySignal}
          </p>
        </div>
      </div>
    </aside>
  )
}
