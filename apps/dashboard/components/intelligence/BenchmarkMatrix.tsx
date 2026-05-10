'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell,
} from 'recharts'

const radarMetrics = [
  { metric: 'Acceptance',  yours: 64, industry: 51 },
  { metric: 'Retention',   yours: 78, industry: 65 },
  { metric: 'Check-ins',   yours: 84, industry: 60 },
  { metric: 'Satisfaction', yours: 72, industry: 68 },
  { metric: 'Compliance',  yours: 61, industry: 58 },
  { metric: 'Growth',      yours: 88, industry: 72 },
]

const benchmarkRows = [
  { metric: 'Rec acceptance rate',    yours: 64, industry: 51, unit: '%',  better: true },
  { metric: 'Monthly active users',   yours: 2847, industry: 1200, unit: '',  better: true },
  { metric: 'Check-ins / user / mo',  yours: 4.2, industry: 2.8, unit: '',  better: true },
  { metric: '30d retention',          yours: 78, industry: 65, unit: '%',  better: true },
  { metric: 'Routine compliance',     yours: 61, industry: 58, unit: '%',  better: true },
  { metric: 'Avg satisfaction (1–5)', yours: 4.1, industry: 3.9, unit: '',  better: true },
  { metric: 'Catalogue completeness', yours: 43, industry: 67, unit: '%',  better: false },
  { metric: 'Ingredient coverage',    yours: 58, industry: 74, unit: '%',  better: false },
]

const growthData = [
  { month: 'Nov', yours: 1820, industry: 1100 },
  { month: 'Dec', yours: 1940, industry: 1130 },
  { month: 'Jan', yours: 2120, industry: 1160 },
  { month: 'Feb', yours: 2310, industry: 1190 },
  { month: 'Mar', yours: 2560, industry: 1220 },
  { month: 'Apr', yours: 2847, industry: 1250 },
]

export function BenchmarkMatrix() {
  return (
    <div className="space-y-4">
      {/* Radar Comparison */}
      <InsightCard
        title="Performance vs Industry"
        subtitle="Your brand (clay) vs category average (grey)"
        accent="clay"
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
          <RadarChart data={radarMetrics} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
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
      <InsightCard title="Benchmark Breakdown" subtitle="vs category median">
        <div className="space-y-0">
          {benchmarkRows.map((row, i) => (
            <div
              key={row.metric}
              className="flex items-center gap-3 py-2.5 border-b last:border-0"
              style={{ borderColor: 'var(--border-sub)' }}
            >
              <p className="flex-1 text-[12px]" style={{ color: 'var(--ink-2)' }}>{row.metric}</p>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {row.yours}{row.unit}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                  vs {row.industry}{row.unit}
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
          <AIBadge>
            You outperform on engagement metrics (check-ins, retention) but lag on catalogue
            completeness. Expanding ingredient variety could unlock further recommendation accuracy gains.
          </AIBadge>
        </div>
      </InsightCard>

      {/* Growth Trajectory */}
      <InsightCard title="User Growth Trajectory" subtitle="Your brand vs industry benchmark baseline">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={growthData} barCategoryGap="35%" margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--porcelain-2)' }}
              content={({ payload, label }) =>
                payload?.length ? (
                  <div className="text-[11px] px-2.5 py-2 rounded-lg shadow" style={{ background: 'var(--ink)', color: 'white' }}>
                    <p className="font-semibold mb-1">{label}</p>
                    {payload.map((p: any) => (
                      <p key={p.name}>{p.name === 'yours' ? 'You' : 'Industry'}: {p.value.toLocaleString()}</p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="industry" fill="var(--border)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="yours" fill="var(--clay)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </InsightCard>
    </div>
  )
}
