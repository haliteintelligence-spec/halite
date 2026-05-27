import { Sparkles, Zap, TrendingUp, AlertCircle, BookOpen } from 'lucide-react'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightCard } from '@/components/ui/InsightCard'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTimeframe } from '@/lib/api'
import type { AnalyticsData } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

function deriveInsights(analytics: AnalyticsData) {
  const { summary, consumers, products } = analytics

  // ── Analyses ──────────────────────────────────────────────────────
  const analyses: { title: string; summary: string; tags: string[] }[] = []

  // 1. Catalogue-consumer alignment
  if (products.concernCoverage.length > 0) {
    const covered = products.concernCoverage.filter(c => c.coverage > 0).length
    const pct = Math.round((covered / products.concernCoverage.length) * 100)
    const topGap = [...products.concernCoverage]
      .sort((a, b) => b.userPct - a.userPct)
      .find(c => c.coverage === 0)
    analyses.push({
      title: 'Catalogue-Consumer Alignment Report',
      summary: `Your catalogue addresses ${pct}% of expressed consumer concerns.${
        topGap
          ? ` The largest gap is ${topGap.concern.toLowerCase()} — ${topGap.userPct}% of your consumers mention it but you have no product coverage.`
          : ' Consumer concern coverage is strong across your active range.'
      }`,
      tags: ['Catalogue', 'Consumer', 'Gap Analysis'],
    })
  }

  // 2. Recommendation performance by category
  if (products.categoryPerf.length > 0) {
    const sorted = [...products.categoryPerf].sort((a, b) => b.acceptance - a.acceptance)
    const best = sorted[0]!
    const worst = sorted[sorted.length - 1]!
    const avgAcc = Math.round(
      products.categoryPerf.reduce((s, c) => s + c.acceptance, 0) / products.categoryPerf.length
    )
    analyses.push({
      title: 'Recommendation Engine Performance Audit',
      summary: `The engine performs strongest on ${best.category.toLowerCase()} (${best.acceptance}% usage rate) and weakest on ${worst.category.toLowerCase()} (${worst.acceptance}%). Overall average acceptance: ${avgAcc}%.`,
      tags: ['Products', 'Performance'],
    })
  }

  // 3. Consumer skin profile
  if (consumers.concerns.length > 0) {
    const top3 = consumers.concerns.slice(0, 3)
    const topType = consumers.skinTypes[0]
    analyses.push({
      title: 'Consumer Skin Profile',
      summary: `Top consumer concerns: ${top3.map(c => `${c.concern.toLowerCase()} (${c.pct}%)`).join(', ')}.${
        topType ? ` Dominant skin type: ${topType.type.toLowerCase()} at ${topType.pct}% of your base.` : ''
      } ${summary.avgRating ? `Average skin satisfaction rating: ${summary.avgRating}/5.` : ''}`,
      tags: ['Consumer', 'Profile'],
    })
  }

  // ── Action queue ──────────────────────────────────────────────────
  type Urgency = 'Critical' | 'High' | 'Medium'
  const actions: { icon: typeof AlertCircle; label: string; urgency: Urgency; module: string }[] = []

  // Catalogue gaps: top uncovered concerns
  const gaps = [...products.concernCoverage]
    .filter(c => c.coverage === 0 && c.userPct > 10)
    .sort((a, b) => b.userPct - a.userPct)
    .slice(0, 2)
  gaps.forEach(g => {
    actions.push({
      icon: AlertCircle,
      label: `Add product targeting ${g.concern.toLowerCase()} (${g.userPct}% of consumers)`,
      urgency: g.userPct > 30 ? 'Critical' : 'High',
      module: 'Catalogue',
    })
  })

  // Low-acceptance category
  if (products.categoryPerf.length > 0) {
    const worst = [...products.categoryPerf].sort((a, b) => a.acceptance - b.acceptance)[0]!
    if (worst.acceptance < 65) {
      actions.push({
        icon: TrendingUp,
        label: `Improve ${worst.category.toLowerCase()} recommendation acceptance — currently ${worst.acceptance}%`,
        urgency: 'Medium',
        module: 'Products',
      })
    }
  }

  // Compliance nudge
  if (summary.complianceRate !== null && summary.complianceRate < 65) {
    actions.push({
      icon: Zap,
      label: `Boost routine compliance — currently ${summary.complianceRate}%`,
      urgency: 'Medium',
      module: 'Routines',
    })
  }

  // Fallback
  if (actions.length === 0) {
    actions.push({
      icon: Sparkles,
      label: 'Review ingredient coverage against top consumer concerns',
      urgency: 'Medium',
      module: 'Catalogue',
    })
  }

  // ── Intelligence score (0–100) ────────────────────────────────────
  const ratingScore = summary.avgRating ? (summary.avgRating / 5) * 100 : 50
  const score = Math.round(
    ratingScore * 0.35 +
    (summary.complianceRate ?? 50) * 0.35 +
    (summary.usageRate ?? 50) * 0.30
  )
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Developing'

  return { analyses, actions, score, scoreLabel }
}

export default async function AILabPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const analytics = await getAnalytics(days, from, to)

  if (!analytics) {
    return (
      <div className="px-4 py-5 md:px-7 md:py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>Lab</p>
            <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>AI Lab</h1>
          </div>
          <TimeframePicker />
        </div>
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No data yet — analyses will appear once consumers start checking in.</p>
        </div>
      </div>
    )
  }

  const { analyses, actions, score, scoreLabel } = deriveInsights(analytics)

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Lab
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>AI Lab</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Cross-module intelligence reports & strategic recommendations for {slug}
          </p>
        </div>
        <TimeframePicker />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Analysis Feed */}
        <div className="xl:col-span-2 space-y-4">
          <InsightCard title="AI Analyses" subtitle="Cross-module intelligence reports" accent="clay">
            {analyses.length > 0 ? (
              <div className="space-y-4">
                {analyses.map((a, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl space-y-2"
                    style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{a.title}</p>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{a.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.tags.map(t => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>
                Analyses will generate once check-in data is available.
              </p>
            )}
          </InsightCard>
        </div>

        {/* Action Queue + Score */}
        <div className="space-y-4">
          <InsightCard title="Action Queue" subtitle="AI-prioritised next steps" accent="clay">
            <div className="space-y-2">
              {actions.map((a, i) => {
                const Icon = a.icon
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--porcelain-2)' }}
                  >
                    <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--clay)' }} />
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>{a.label}</p>
                      <div className="flex gap-2 mt-1">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: a.urgency === 'Critical' ? 'var(--blush-light)' : a.urgency === 'High' ? 'var(--gold-light)' : 'var(--sage-light)',
                            color: a.urgency === 'Critical' ? 'var(--blush)' : a.urgency === 'High' ? 'var(--gold)' : 'var(--sage)',
                          }}
                        >
                          {a.urgency}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{a.module}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </InsightCard>

          <InsightCard title="Platform Intelligence Score" accent="gold">
            <div className="flex flex-col items-center py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-semibold"
                style={{ background: 'var(--clay-light)', color: 'var(--clay)' }}
              >
                {score}
              </div>
              <p className="text-[12px] mt-3 font-medium" style={{ color: 'var(--ink-2)' }}>{scoreLabel}</p>
              <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--ink-3)' }}>
                Composite of satisfaction, compliance & product acceptance
              </p>
            </div>
          </InsightCard>
        </div>
      </div>
    </div>
  )
}
