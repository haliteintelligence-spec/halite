'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import type { AnalyticsData } from '@/lib/api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts'

// Industry medians — realistic reference points, not real cross-brand data
const INDUSTRY = {
  acceptance:           51,
  checkInsPerUserMo:    2.8,
  compliance:           58,
  satisfactionPct:      78, // 3.9/5 * 100
  catalogueComplete:    67,
  ingredientCoverage:   74,
}

interface Props { analytics: AnalyticsData; brandId: string }

export function BenchmarkMatrix({ analytics, brandId }: Props) {
  const { summary, products, checkIns } = analytics

  // ── Compute real "yours" values ──────────────────────────────────
  const acceptance = summary.usageRate ?? 0
  const checkInsPerUserMo = summary.totalConsumers > 0
    ? Math.round((summary.totalCheckIns / summary.totalConsumers / 3) * 10) / 10
    : 0
  const compliance = summary.complianceRate ?? 0
  const satisfactionPct = summary.avgRating ? Math.round((summary.avgRating / 5) * 100) : 0
  const avgRatingDisplay = summary.avgRating ?? 0

  const catalogueComplete = products.concernCoverage.length > 0
    ? Math.round(
        products.concernCoverage.reduce((s, c) => s + c.coverage, 0) / products.concernCoverage.length
      )
    : 0

  const ingredientCoverage = Math.min(products.topIngredients.length * 10, 100)

  // ── Radar data (0–100 scale) ─────────────────────────────────────
  const radarData = [
    { metric: 'Acceptance',   yours: acceptance,       industry: INDUSTRY.acceptance },
    { metric: 'Check-ins',    yours: Math.min(checkInsPerUserMo * 20, 100), industry: Math.min(INDUSTRY.checkInsPerUserMo * 20, 100) },
    { metric: 'Compliance',   yours: compliance,        industry: INDUSTRY.compliance },
    { metric: 'Satisfaction', yours: satisfactionPct,  industry: INDUSTRY.satisfactionPct },
    { metric: 'Catalogue',    yours: catalogueComplete, industry: INDUSTRY.catalogueComplete },
    { metric: 'Ingredients',  yours: ingredientCoverage, industry: INDUSTRY.ingredientCoverage },
  ]

  // ── Benchmark rows ────────────────────────────────────────────────
  const benchmarkRows = [
    {
      metric: 'Rec acceptance rate',
      yours: `${acceptance}%`,
      industry: `${INDUSTRY.acceptance}%`,
      better: acceptance >= INDUSTRY.acceptance,
    },
    {
      metric: 'Total consumers',
      yours: summary.totalConsumers.toLocaleString(),
      industry: '1,200',
      better: summary.totalConsumers >= 1200,
    },
    {
      metric: 'Check-ins / user / mo',
      yours: checkInsPerUserMo,
      industry: INDUSTRY.checkInsPerUserMo,
      better: checkInsPerUserMo >= INDUSTRY.checkInsPerUserMo,
    },
    {
      metric: 'Routine compliance',
      yours: `${compliance}%`,
      industry: `${INDUSTRY.compliance}%`,
      better: compliance >= INDUSTRY.compliance,
    },
    {
      metric: 'Avg satisfaction (1–5)',
      yours: avgRatingDisplay || '—',
      industry: '3.9',
      better: avgRatingDisplay >= 3.9,
    },
    {
      metric: 'Catalogue completeness',
      yours: `${catalogueComplete}%`,
      industry: `${INDUSTRY.catalogueComplete}%`,
      better: catalogueComplete >= INDUSTRY.catalogueComplete,
    },
    {
      metric: 'Ingredient coverage',
      yours: `${ingredientCoverage}%`,
      industry: `${INDUSTRY.ingredientCoverage}%`,
      better: ingredientCoverage >= INDUSTRY.ingredientCoverage,
    },
  ]

  // ── Check-in trend (last 12 weeks → grouped into 6 pairs) ───────
  const paired = Array.from({ length: 6 }, (_, i) => ({
    label: `W${i * 2 + 1}–${i * 2 + 2}`,
    yours: (checkIns.weeklyTrend[i * 2] ?? 0) + (checkIns.weeklyTrend[i * 2 + 1] ?? 0),
    baseline: Math.round(summary.totalCheckIns / 12) * 2,
  }))

  // ── AI summary ───────────────────────────────────────────────────
  const aboveCount = benchmarkRows.filter(r => r.better).length
  const aiSummary = `${aboveCount} of ${benchmarkRows.length} metrics are at or above the industry median. ${
    catalogueComplete < INDUSTRY.catalogueComplete
      ? `Catalogue completeness (${catalogueComplete}% vs ${INDUSTRY.catalogueComplete}% median) is the highest-impact gap to close.`
      : `Strong catalogue and ingredient coverage — focus on maintaining recommendation acceptance.`
  }`

  return (
    <div className="space-y-4">
      {/* Radar Comparison */}
      <InsightCard
        title="Performance vs Industry"
        subtitle="Your brand (clay) vs category average (grey)"
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Performance vs Industry"
            dataContext={{ yourMetrics: { acceptance, compliance, satisfactionPct, catalogueComplete, ingredientCoverage, checkInsPerUserMo }, industryMedians: INDUSTRY, aboveMedianCount: benchmarkRows.filter(r => r.better).length, totalMetrics: benchmarkRows.length }}
          />
        }
      >
        <div className="flex gap-4 justify-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ background: 'var(--clay)' }} />
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Your brand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ background: 'var(--border)' }} />
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Industry avg</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
            <Radar
              dataKey="industry"
              stroke="var(--border)"
              fill="var(--border)"
              fillOpacity={0.3}
              strokeWidth={1}
              isAnimationActive={false}
            />
            <Radar
              dataKey="yours"
              stroke="var(--clay)"
              fill="var(--clay)"
              fillOpacity={0.2}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </InsightCard>

      {/* Metric Table */}
      <InsightCard
        title="Benchmark Breakdown"
        subtitle="vs category median"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Benchmark Breakdown"
            dataContext={{ benchmarkRows }}
          />
        }
      >
        <div className="space-y-0">
          {benchmarkRows.map(row => (
            <div
              key={row.metric}
              className="flex items-center gap-3 py-2.5 border-b last:border-0"
              style={{ borderColor: 'var(--border-sub)' }}
            >
              <p className="flex-1 text-[12px]" style={{ color: 'var(--ink-2)' }}>{row.metric}</p>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {row.yours}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  vs {row.industry}
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: row.better ? 'var(--sage-light)' : 'var(--blush-light)',
                    color: row.better ? 'var(--sage)' : 'var(--blush)',
                  }}
                >
                  {row.better ? '↑ Above' : '↓ Below'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <AIBadge>{aiSummary}</AIBadge>
        </div>
      </InsightCard>

      {/* Check-in Activity (12-week view) */}
      <InsightCard
        title="Check-in Activity vs Baseline"
        subtitle="Your brand vs rolling baseline (last 12 weeks, paired)"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Check-in Activity vs Baseline"
            dataContext={{ paired, totalCheckIns: summary.totalCheckIns, totalConsumers: summary.totalConsumers }}
          />
        }
      >
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={paired} barCategoryGap="35%" margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--porcelain-2)' }}
              content={({ payload, label }) =>
                payload?.length ? (
                  <div className="text-[11px] px-2.5 py-2 rounded-lg shadow" style={{ background: 'var(--ink)', color: 'white' }}>
                    <p className="font-semibold mb-1">{label}</p>
                    {payload.map((p: any) => (
                      <p key={p.name}>{p.name === 'yours' ? 'Check-ins' : 'Baseline'}: {p.value}</p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="baseline" fill="var(--border)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="yours" fill="var(--clay)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>
    </div>
  )
}
