'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { InsightButton } from '@/components/ui/InsightButton'
import { AIBadge } from '@/components/ui/AIBadge'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { AnalyticsData } from '@/lib/api'

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

interface Props {
  ratingTrend: (number | null)[]
  complianceTrend: (number | null)[]
  concerns: AnalyticsData['consumers']['concerns']
  concernCoverage: AnalyticsData['products']['concernCoverage']
  brandId: string
}

export function ConsumerTrends({ ratingTrend, complianceTrend, concerns, concernCoverage, brandId }: Props) {
  // Skin score trend data
  const skinScoreData = ratingTrend.map((v, i) => ({
    week: `W${i + 1}`,
    score: v ?? null,
  }))
  const latestScore = [...ratingTrend].reverse().find(v => v != null)
  const prevScore = [...ratingTrend].slice(0, -1).reverse().find(v => v != null)
  const scoreDelta = latestScore != null && prevScore != null
    ? Math.round((latestScore - prevScore) * 10) / 10
    : null

  // Compliance trend data
  const complianceData = complianceTrend.map((v, i) => ({
    week: `W${i + 1}`,
    rate: v ?? 0,
  }))
  const latestCompliance = [...complianceTrend].reverse().find(v => v != null) ?? null
  const avgCompliance = complianceTrend.filter(v => v != null).length > 0
    ? Math.round(complianceTrend.filter(v => v != null).reduce((a, b) => a + (b ?? 0), 0) / complianceTrend.filter(v => v != null).length)
    : null

  // Concern map — join consumer concerns with product coverage
  const concernMap = concerns.map(c => {
    const cov = concernCoverage.find(x => x.concern === c.concern)
    return {
      concern: c.concern,
      label: CONCERN_LABELS[c.concern] ?? c.concern,
      consumerPct: c.pct,
      coverage: cov?.coverage ?? 0,
      productCount: cov?.productCount ?? 0,
      gap: (cov?.coverage ?? 0) < 50 && c.pct > 15,
    }
  }).sort((a, b) => b.consumerPct - a.consumerPct)

  const hasScoreData = ratingTrend.some(v => v != null)
  const hasComplianceData = complianceTrend.some(v => v != null)

  return (
    <div className="space-y-4 mt-4">
      {/* Skin Score Trend */}
      <InsightCard
        title="Skin Score Trend"
        subtitle="Average consumer skin satisfaction rating over time (1–5)"
        accent="gold"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Skin Score Trend"
            dataContext={{ ratingTrend, latestScore, scoreDelta }}
          />
        }
      >
        {hasScoreData ? (
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                  {latestScore?.toFixed(1) ?? '—'}<span className="text-sm font-normal ml-1" style={{ color: 'var(--ink-3)' }}>/5</span>
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>current score</p>
              </div>
              {scoreDelta !== null && (
                <span
                  className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                  style={{
                    background: scoreDelta >= 0 ? 'var(--sage-light)' : 'var(--blush-light)',
                    color: scoreDelta >= 0 ? 'var(--sage)' : 'var(--blush)',
                  }}
                >
                  {scoreDelta >= 0 ? '↑' : '↓'} {Math.abs(scoreDelta)} pts
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={skinScoreData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} ticks={[1, 2, 3, 4, 5]} />
                <ReferenceLine y={3.9} stroke="var(--border)" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  content={({ payload, label }) =>
                    payload?.[0]?.value != null ? (
                      <div className="text-[11px] px-2.5 py-1.5 rounded-lg shadow" style={{ background: 'var(--ink)', color: 'white' }}>
                        {label}: <strong>{(payload[0].value as number).toFixed(1)}/5</strong>
                      </div>
                    ) : null
                  }
                />
                <Line
                  dataKey="score"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: 'var(--gold)', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-2" style={{ color: 'var(--ink-3)' }}>
              Dashed line = industry average (3.9). Each point is the weekly average across all consumer check-ins.
            </p>
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Skin score trend data will appear as consumers submit ratings.
          </p>
        )}
      </InsightCard>

      {/* Compliance Rate Trend */}
      <InsightCard
        title="Compliance Rate Trend"
        subtitle="Weekly routine adherence — percentage of consumers on track"
        accent="sage"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Compliance Rate Trend"
            dataContext={{ complianceTrend, latestCompliance, avgCompliance }}
          />
        }
      >
        {hasComplianceData ? (
          <div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                  {latestCompliance ?? '—'}<span className="text-sm font-normal ml-0.5" style={{ color: 'var(--ink-3)' }}>%</span>
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>latest compliance rate</p>
              </div>
              {avgCompliance !== null && (
                <div className="text-right">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{avgCompliance}%</p>
                  <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>period avg</p>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={complianceData} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} ticks={[0, 50, 100]} />
                <ReferenceLine y={58} stroke="var(--border)" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ fill: 'var(--porcelain-2)' }}
                  content={({ payload, label }) =>
                    payload?.[0] ? (
                      <div className="text-[11px] px-2.5 py-1.5 rounded-lg shadow" style={{ background: 'var(--ink)', color: 'white' }}>
                        {label}: <strong>{payload[0].value}%</strong>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="rate" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {complianceData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.rate >= 70 ? 'var(--sage)' : entry.rate >= 50 ? 'var(--gold)' : 'var(--blush)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-2" style={{ color: 'var(--ink-3)' }}>
              Dashed line = industry median (58%). Green ≥ 70% · Amber 50–70% · Red &lt; 50%
            </p>
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Compliance trend data will appear as consumers check in over time.
          </p>
        )}
      </InsightCard>

      {/* Concern Map */}
      {concernMap.length > 0 && (
        <InsightCard
          title="Concern Map"
          subtitle="Consumer demand signal × product coverage — active profiles"
          accent="clay"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Concern Map"
              dataContext={{ concernMap }}
            />
          }
        >
          <div>
            <div className="grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--ink-3)' }}>
              <span>Concern</span>
              <span className="text-center">Consumer demand</span>
              <span className="text-right">Coverage</span>
            </div>
            <div className="space-y-3">
              {concernMap.map(c => (
                <div key={c.concern}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 flex items-center gap-2">
                      {c.gap && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--blush-light)', color: 'var(--blush)' }}>
                          Gap
                        </span>
                      )}
                      <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{c.label}</p>
                    </div>
                    <p className="text-[12px] font-semibold w-10 text-center tabular-nums" style={{ color: 'var(--ink)' }}>{c.consumerPct}%</p>
                    <p className="text-[12px] font-semibold w-10 text-right tabular-nums" style={{
                      color: c.coverage >= 75 ? 'var(--sage)' : c.coverage >= 40 ? 'var(--gold)' : 'var(--blush)',
                    }}>{c.coverage}%</p>
                  </div>
                  {/* Dual bar: demand (clay) vs coverage (sage/gold/blush) */}
                  <div className="relative h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-30"
                      style={{ width: `${c.consumerPct}%`, background: 'var(--clay)' }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{
                        width: `${c.coverage}%`,
                        background: c.coverage >= 75 ? 'var(--sage)' : c.coverage >= 40 ? 'var(--gold)' : 'var(--blush)',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--clay)', opacity: 0.3 }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Consumer demand</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--sage)' }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Product coverage</span>
              </div>
            </div>
            {concernMap.filter(c => c.gap).length > 0 && (
              <div className="mt-3">
                <AIBadge>
                  {concernMap.filter(c => c.gap).length} concern{concernMap.filter(c => c.gap).length !== 1 ? 's' : ''} have high consumer demand but low coverage.{' '}
                  {concernMap.find(c => c.gap)?.label} is the highest-priority gap.
                </AIBadge>
              </div>
            )}
          </div>
        </InsightCard>
      )}
    </div>
  )
}
