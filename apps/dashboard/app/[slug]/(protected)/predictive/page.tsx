import Link from 'next/link'
import { Telescope, TrendingUp, TrendingDown, Minus, AlertTriangle, Layers, ArrowRight } from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import { MetricTile } from '@/components/ui/MetricTile'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTimeframe } from '@/lib/api'
import type { AnalyticsData } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function linReg(vals: number[]): { slope: number; intercept: number } {
  const n = vals.length
  if (n < 2) return { slope: 0, intercept: vals[0] ?? 0 }
  const sumX = (n * (n - 1)) / 2
  const sumY = vals.reduce((a, b) => a + b, 0)
  const sumXY = vals.reduce((s, v, i) => s + i * v, 0)
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function projectWeeks(trend: number[], ahead = 4): number[] {
  const { slope, intercept } = linReg(trend)
  return Array.from({ length: ahead }, (_, i) =>
    Math.max(0, Math.round(intercept + slope * (trend.length + i)))
  )
}

function Sparkline({
  data,
  projected,
  width = 200,
  height = 40,
}: {
  data: number[]
  projected?: number[]
  width?: number
  height?: number
}) {
  const all = [...data, ...(projected ?? [])]
  const max = Math.max(...all, 1)
  const pts = (arr: number[], offset = 0) =>
    arr
      .map((v, i) => {
        const x = ((i + offset) / (all.length - 1)) * width
        const y = height - (v / max) * height * 0.9 - height * 0.05
        return `${x},${y}`
      })
      .join(' ')

  const histPts = pts(data)
  const projPts = projected?.length
    ? pts([data[data.length - 1]!, ...projected], data.length - 1)
    : null

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={histPts}
        fill="none"
        stroke="var(--clay)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {projPts && (
        <polyline
          points={projPts}
          fill="none"
          stroke="var(--clay)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
          opacity="0.5"
        />
      )}
      {data.map((v, i) => {
        const x = (i / (all.length - 1)) * width
        const y = height - (v / max) * height * 0.9 - height * 0.05
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--clay)" />
      })}
    </svg>
  )
}

// ── Derived analytics ─────────────────────────────────────────────────────────

function deriveForecasts(a: AnalyticsData) {
  const { summary, checkIns, products, consumers } = a

  // Weekly demand trend
  const trend = checkIns.weeklyTrend.filter(v => v != null) as number[]
  const projected4w = trend.length >= 2 ? projectWeeks(trend, 4) : []
  const lastWeek = trend[trend.length - 1] ?? 0
  const projectedTotal30d = projected4w.reduce((s, v) => s + v, 0)
  const historicalAvg30d = trend.slice(-4).reduce((s, v) => s + v, 0)
  const demandDelta = historicalAvg30d > 0
    ? ((projectedTotal30d - historicalAvg30d) / historicalAvg30d) * 100
    : 0
  const { slope } = linReg(trend)
  const trendDir: 'up' | 'flat' | 'down' =
    slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'flat'

  // Churn risk estimation
  const compliance = summary.complianceRate ?? 50
  const highRiskPct = Math.max(0, Math.round((100 - compliance) * 0.6))
  const medRiskPct = Math.max(0, Math.round((100 - compliance) * 0.25))
  const lowRiskPct = 100 - highRiskPct - medRiskPct
  const atRiskConsumers = Math.round((highRiskPct / 100) * summary.totalConsumers)

  // Forecast confidence
  const confidence =
    trend.length >= 8 ? 'High' :
    trend.length >= 4 ? 'Medium' : 'Low'
  const confidenceScore =
    trend.length >= 8 ? 82 :
    trend.length >= 4 ? 61 : 44

  // Category trajectory
  const avgAcceptance = products.categoryPerf.length > 0
    ? products.categoryPerf.reduce((s, c) => s + c.acceptance, 0) / products.categoryPerf.length
    : 0
  const categories = products.categoryPerf.map(c => ({
    ...c,
    delta: c.acceptance - avgAcceptance,
    trajectory: c.acceptance > avgAcceptance + 5 ? 'up' : c.acceptance < avgAcceptance - 5 ? 'down' : 'flat',
  }))

  // Concern momentum
  const concernMomentum = consumers.concerns.map(c => {
    const coverage = products.concernCoverage.find(x => x.concern === c.concern)
    return {
      concern: c.concern,
      pct: c.pct,
      coverage: coverage?.coverage ?? 0,
      gap: (coverage?.coverage ?? 0) === 0 && c.pct > 10,
    }
  })

  // Week-over-week check-in change
  const wowDelta = lastWeek > 0
    ? ((checkIns.thisWeek - checkIns.lastWeek) / (checkIns.lastWeek || 1)) * 100
    : 0

  return {
    trend, projected4w, projectedTotal30d, demandDelta, trendDir,
    highRiskPct, medRiskPct, lowRiskPct, atRiskConsumers,
    confidence, confidenceScore,
    categories, avgAcceptance,
    concernMomentum,
    wowDelta,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PredictivePage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const analytics = await getAnalytics(days, from, to)

  if (!analytics) {
    return (
      <div className="px-7 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>Predictive</p>
            <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Predictive Insights</h1>
          </div>
          <TimeframePicker />
        </div>
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No data yet — forecasts will appear once consumers start checking in.</p>
        </div>
      </div>
    )
  }

  const f = deriveForecasts(analytics)

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Predictive
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Predictive Insights</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Forward-looking demand, churn, and product trajectory forecasts for {slug}
          </p>
        </div>
        <TimeframePicker />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricTile
          label="30-Day Demand Forecast"
          value={f.projectedTotal30d.toLocaleString()}
          sub="projected check-ins"
          trend={{ delta: f.demandDelta, label: 'vs last 30d' }}
          icon={<Telescope size={14} />}
        />
        <MetricTile
          label="At-Risk Consumers"
          value={f.atRiskConsumers.toLocaleString()}
          sub={`~${f.highRiskPct}% of base`}
          icon={<AlertTriangle size={14} />}
        />
        <MetricTile
          label="Week-over-Week Trend"
          value={`${f.wowDelta >= 0 ? '+' : ''}${f.wowDelta.toFixed(1)}%`}
          sub={`${analytics.checkIns.thisWeek} check-ins this week`}
          trend={{ delta: f.wowDelta }}
          icon={<TrendingUp size={14} />}
        />
        <MetricTile
          label="Forecast Confidence"
          value={f.confidence}
          sub={`Score ${f.confidenceScore}/100`}
          icon={<Telescope size={14} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Demand Forecast chart */}
        <InsightCard
          title="Check-in Demand Forecast"
          subtitle="History (solid) + 4-week projection (dashed)"
          accent="clay"
          className="xl:col-span-2"
        >
          {f.trend.length >= 2 ? (
            <div>
              <div className="mb-4">
                <Sparkline data={f.trend} projected={f.projected4w} width={480} height={64} />
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-3)' }}>Projected 4w</p>
                  <p className="text-xl font-semibold font-display mt-0.5" style={{ color: 'var(--ink)' }}>{f.projected4w.reduce((s, v) => s + v, 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-3)' }}>Trend direction</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {f.trendDir === 'up'   && <TrendingUp  size={16} style={{ color: 'var(--sage)' }} />}
                    {f.trendDir === 'down' && <TrendingDown size={16} style={{ color: 'var(--blush)' }} />}
                    {f.trendDir === 'flat' && <Minus        size={16} style={{ color: 'var(--ink-3)' }} />}
                    <p className="text-sm font-semibold capitalize" style={{
                      color: f.trendDir === 'up' ? 'var(--sage)' : f.trendDir === 'down' ? 'var(--blush)' : 'var(--ink-3)'
                    }}>{f.trendDir}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--ink-3)' }}>Data points</p>
                  <p className="text-xl font-semibold font-display mt-0.5" style={{ color: 'var(--ink)' }}>{f.trend.length}w</p>
                </div>
              </div>
              {f.projected4w.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {f.projected4w.map((v, i) => (
                    <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
                      <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Wk +{i + 1}</p>
                      <p className="text-[15px] font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
              Forecasts require at least 2 weeks of check-in history.
            </p>
          )}
        </InsightCard>

        {/* Churn Risk Index */}
        <InsightCard title="Churn Risk Index" subtitle="Estimated from compliance & engagement" accent="blush">
          <div className="space-y-3">
            {[
              { label: 'High Risk', pct: f.highRiskPct, color: 'var(--blush)', bg: 'var(--blush-light)' },
              { label: 'Medium Risk', pct: f.medRiskPct, color: 'var(--gold)', bg: 'var(--gold-light)' },
              { label: 'Low Risk', pct: f.lowRiskPct, color: 'var(--sage)', bg: 'var(--sage-light)' },
            ].map(({ label, pct, color, bg }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--ink-2)' }}>{label}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              <span className="font-semibold" style={{ color: 'var(--blush)' }}>~{f.atRiskConsumers} consumers</span> are
              at high risk of disengaging based on current compliance patterns.
              {analytics.summary.complianceRate !== null && analytics.summary.complianceRate < 65
                ? ' Focus on re-engagement workflows and routine simplification.'
                : ' Compliance is healthy — maintain check-in habit reinforcement.'}
            </p>
          </div>
        </InsightCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Category Trajectory */}
        <InsightCard title="Category Performance Trajectory" subtitle="Acceptance vs platform average" accent="gold">
          {f.categories.length > 0 ? (
            <div className="space-y-2">
              {f.categories
                .sort((a, b) => b.acceptance - a.acceptance)
                .map(cat => (
                  <div key={cat.category} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[12px] font-medium capitalize" style={{ color: 'var(--ink)' }}>
                          {cat.category.toLowerCase().replace(/_/g, ' ')}
                        </p>
                        {cat.trajectory === 'up'   && <TrendingUp  size={11} style={{ color: 'var(--sage)' }} />}
                        {cat.trajectory === 'down' && <TrendingDown size={11} style={{ color: 'var(--blush)' }} />}
                        {cat.trajectory === 'flat' && <Minus        size={11} style={{ color: 'var(--ink-3)' }} />}
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${cat.acceptance}%`,
                          background: cat.trajectory === 'up' ? 'var(--sage)' : cat.trajectory === 'down' ? 'var(--blush)' : 'var(--clay)',
                        }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{cat.acceptance}%</p>
                      <p className="text-[10px]" style={{ color: cat.delta >= 0 ? 'var(--sage)' : 'var(--blush)' }}>
                        {cat.delta >= 0 ? '+' : ''}{cat.delta.toFixed(0)}pp
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No category data available.</p>
          )}
        </InsightCard>

        {/* Concern Momentum */}
        <InsightCard title="Concern Momentum" subtitle="Consumer demand signals & coverage risk" accent="sage">
          {f.concernMomentum.length > 0 ? (
            <div className="space-y-2">
              {f.concernMomentum
                .sort((a, b) => (b.gap ? 1 : 0) - (a.gap ? 1 : 0) || b.pct - a.pct)
                .slice(0, 8)
                .map(c => (
                  <div key={c.concern} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {c.gap && <AlertTriangle size={10} style={{ color: 'var(--blush)', flexShrink: 0 }} />}
                        <p className="text-[12px] font-medium capitalize truncate" style={{ color: 'var(--ink)' }}>
                          {c.concern.toLowerCase().replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{
                          width: `${c.pct}%`,
                          background: c.gap ? 'var(--blush)' : c.coverage > 0 ? 'var(--sage)' : 'var(--clay)',
                        }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-20">
                      <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{c.pct}%</p>
                      <p className="text-[10px]" style={{ color: c.gap ? 'var(--blush)' : 'var(--ink-3)' }}>
                        {c.gap ? 'No coverage' : c.coverage > 0 ? `${c.coverage} product${c.coverage !== 1 ? 's' : ''}` : 'No data'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No concern data available.</p>
          )}
        </InsightCard>
      </div>

      {/* Supply Chain CTA card */}
      <Link href={`/${slug}/predictive/supply-chain`}>
        <div
          className="rounded-2xl p-5 flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer"
          style={{ background: 'var(--ink)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Layers size={18} className="text-white/70" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Supply Chain Planning</p>
              <p className="text-[12px] text-white/50 mt-0.5">
                Ingredient demand forecasts, product stock planning & reorder pipeline
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-white/40" />
        </div>
      </Link>
    </div>
  )
}
