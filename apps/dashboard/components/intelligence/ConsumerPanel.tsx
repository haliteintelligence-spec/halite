'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { Sparkline } from '@/components/charts/Sparkline'
import { SkinToneBar, SkinToneGrid } from '@/components/charts/SkinToneBar'
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'

const checkInTrend = [120, 145, 138, 162, 171, 158, 189, 204, 197, 218, 231, 247]

const skinTypes = [
  { label: 'Combo', value: 35, tone: 'iii' as const },
  { label: 'Dry',   value: 28, tone: 'ii' as const },
  { label: 'Oily',  value: 22, tone: 'iv' as const },
  { label: 'Normal',value: 15, tone: 'i' as const },
]

const fitzpatrickData = [
  { tone: 'i',   label: 'I',   count: 228,  pct: 8,  engagement: 3.1 },
  { tone: 'ii',  label: 'II',  count: 399,  pct: 14, engagement: 3.4 },
  { tone: 'iii', label: 'III', count: 626,  pct: 22, engagement: 4.1 },
  { tone: 'iv',  label: 'IV',  count: 797,  pct: 28, engagement: 4.8 },
  { tone: 'v',   label: 'V',   count: 512,  pct: 18, engagement: 4.5 },
  { tone: 'vi',  label: 'VI',  count: 285,  pct: 10, engagement: 4.3 },
]

const concerns = [
  { concern: 'Hyperpigmentation', pct: 67 },
  { concern: 'Dryness',          pct: 54 },
  { concern: 'Acne / Breakouts', pct: 43 },
  { concern: 'Anti-aging',       pct: 38 },
  { concern: 'Sensitivity',      pct: 31 },
  { concern: 'Uneven texture',   pct: 24 },
]

const ageData = [
  { group: '18–24', n: 412 },
  { group: '25–34', n: 891 },
  { group: '35–44', n: 743 },
  { group: '45–54', n: 521 },
  { group: '55+',   n: 280 },
]

export function ConsumerPanel() {
  return (
    <div className="space-y-4">
      {/* Skin Tone Distribution */}
      <InsightCard
        title="Skin Tone Distribution"
        subtitle="Fitzpatrick scale · 2,847 consumers"
        accent="clay"
      >
        <div className="space-y-4">
          <SkinToneGrid data={fitzpatrickData} />
          <div className="flex gap-4 pt-1">
            {fitzpatrickData.map(d => (
              <div key={d.tone} className="text-center flex-1">
                <p className="text-[10px] font-semibold" style={{ color: 'var(--ink-3)' }}>
                  {d.label}
                </p>
              </div>
            ))}
          </div>
          <SkinToneBar data={skinTypes} showLabels={true} height={8} />
          <AIBadge>
            Fitzpatrick III–IV consumers account for 50% of your base and show the highest check-in
            engagement (4.1–4.8×). Hyperpigmentation-focused products are underrepresented given
            this distribution.
          </AIBadge>
        </div>
      </InsightCard>

      {/* Check-in Activity */}
      <InsightCard
        title="Check-in Activity"
        subtitle="Weekly · last 12 weeks"
        accent="sage"
      >
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>247</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>this week</p>
            </div>
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
            >
              ↑ 6.5% vs last week
            </span>
          </div>
          <Sparkline data={checkInTrend} color="var(--sage)" height={56} showTooltip />
        </div>
      </InsightCard>

      {/* Top Concerns */}
      <InsightCard title="Top Consumer Concerns" subtitle="% of consumers reporting">
        <div className="space-y-2.5">
          {concerns.map(c => (
            <div key={c.concern} className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--ink-2)' }}>{c.concern}</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {c.pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, background: c.pct > 50 ? 'var(--clay)' : 'var(--border)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Age Distribution */}
      <InsightCard title="Age Cohorts" subtitle="Active consumers by age group">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={ageData} barSize={28} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="group"
              tick={{ fontSize: 10, fill: 'var(--ink-3)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--porcelain-2)' }}
              content={({ payload }) =>
                payload?.[0] ? (
                  <div
                    className="text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg"
                    style={{ background: 'var(--ink)', color: 'white' }}
                  >
                    {payload[0].payload.group}: <strong>{payload[0].value}</strong>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="n" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {ageData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={i === 1 ? 'var(--clay)' : 'var(--border)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] mt-2" style={{ color: 'var(--ink-3)' }}>
          25–34 cohort is largest · 891 users
        </p>
      </InsightCard>
    </div>
  )
}
