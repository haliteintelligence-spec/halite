'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { Sparkline } from '@/components/charts/Sparkline'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const acceptanceTrend = [58, 57, 60, 61, 59, 63, 62, 64, 65, 63, 65, 64]

const categoryPerf = [
  { category: 'Serums',       acceptance: 78, recs: 234 },
  { category: 'SPF',          acceptance: 71, recs: 189 },
  { category: 'Moisturisers', acceptance: 65, recs: 201 },
  { category: 'Cleansers',    acceptance: 59, recs: 112 },
  { category: 'Treatments',   acceptance: 52, recs: 111 },
]

const topProducts = [
  { name: 'Vitamin C Brightening Serum', recs: 203, accepted: 167, rate: 82 },
  { name: 'Niacinamide Barrier Cream',   recs: 189, accepted: 143, rate: 76 },
  { name: 'SPF 50 Daily Moisturiser',    recs: 178, accepted: 127, rate: 71 },
  { name: 'AHA/BHA Exfoliant 10%',       recs: 134, accepted: 87,  rate: 65 },
  { name: 'Hyaluronic Acid Booster',     recs: 143, accepted: 91,  rate: 64 },
]

const radarData = [
  { metric: 'Accuracy',    score: 82 },
  { metric: 'Diversity',   score: 64 },
  { metric: 'Timeliness',  score: 71 },
  { metric: 'Engagement',  score: 78 },
  { metric: 'Repeat Rate', score: 59 },
]

export function ProductEngine() {
  return (
    <div className="space-y-4">
      {/* Acceptance Rate Trend */}
      <InsightCard
        title="Recommendation Acceptance"
        subtitle="847 recommendations sent · 30 days"
        accent="gold"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>64%</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Acceptance</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>847</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Sent</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--sage)' }}>542</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Accepted</p>
            </div>
          </div>
          <Sparkline data={acceptanceTrend} color="var(--gold)" height={44} showTooltip />
          <AIBadge>
            Acceptance rate is 25% above the industry median of 51%. Serums dominate —
            consider expanding the serum catalogue to capture the top-of-funnel intent.
          </AIBadge>
        </div>
      </InsightCard>

      {/* Performance Radar */}
      <InsightCard title="Engine Quality Score" subtitle="Recommendation system health">
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
            />
            <Radar
              dataKey="score"
              stroke="var(--clay)"
              fill="var(--clay)"
              fillOpacity={0.15}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Tooltip
              content={({ payload }) =>
                payload?.[0] ? (
                  <div
                    className="text-[11px] px-2.5 py-1.5 rounded-lg shadow"
                    style={{ background: 'var(--ink)', color: 'white' }}
                  >
                    {payload[0].payload.metric}: <strong>{payload[0].value}</strong>
                  </div>
                ) : null
              }
            />
          </RadarChart>
        </ResponsiveContainer>
      </InsightCard>

      {/* Category Performance */}
      <InsightCard title="Performance by Category" subtitle="Acceptance rate vs volume">
        <div className="space-y-3">
          {categoryPerf.map(c => (
            <div key={c.category} className="flex items-center gap-3">
              <div className="w-24 flex-shrink-0">
                <p className="text-[12px]" style={{ color: 'var(--ink-2)' }}>{c.category}</p>
                <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{c.recs} recs</p>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.acceptance}%`,
                      background: c.acceptance >= 70 ? 'var(--sage)' : c.acceptance >= 60 ? 'var(--gold)' : 'var(--border)',
                    }}
                  />
                </div>
              </div>
              <span
                className="text-[12px] font-semibold tabular-nums w-8 text-right"
                style={{ color: c.acceptance >= 70 ? 'var(--sage)' : 'var(--ink-2)' }}
              >
                {c.acceptance}%
              </span>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Top Products */}
      <InsightCard title="Top Recommended Products" subtitle="By acceptance rate">
        <div className="space-y-2">
          {topProducts.map((p, i) => (
            <div
              key={p.name}
              className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: 'var(--border-sub)' }}
            >
              <span
                className="text-[11px] font-semibold w-5 text-center flex-shrink-0"
                style={{ color: 'var(--ink-3)' }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink-2)' }}>
                  {p.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                  {p.accepted}/{p.recs} accepted
                </p>
              </div>
              <div
                className="text-[12px] font-semibold px-2 py-0.5 rounded tabular-nums"
                style={{
                  background: p.rate >= 75 ? 'var(--sage-light)' : 'var(--porcelain-2)',
                  color: p.rate >= 75 ? 'var(--sage)' : 'var(--ink-2)',
                }}
              >
                {p.rate}%
              </div>
            </div>
          ))}
        </div>
      </InsightCard>
    </div>
  )
}
