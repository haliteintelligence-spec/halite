'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import { Sparkline } from '@/components/charts/Sparkline'
import { SkinToneBar, SkinToneGrid } from '@/components/charts/SkinToneBar'
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import type { AnalyticsData } from '@/lib/api'

type Props = {
  consumers: AnalyticsData['consumers']
  checkIns: AnalyticsData['checkIns']
  totalConsumers: number
  brandId: string
}

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

const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combo', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
}

const TONE_KEYS = ['i', 'ii', 'iii', 'iv', 'v', 'vi'] as const

export function ConsumerPanel({ consumers, checkIns, totalConsumers, brandId }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const skinTypeBar = consumers.skinTypes.map((st, i) => ({
    label: SKIN_TYPE_LABELS[st.type] ?? st.type,
    value: Math.max(st.pct, 1),
    tone: TONE_KEYS[Math.min(i * 2, 5)],
  }))

  const dominantFitz = consumers.monkSkinTones.reduce(
    (best, f) => f.count > best.count ? f : best,
    consumers.monkSkinTones[0] ?? { type: 0, pct: 0, count: 0 }
  )
  const topConcern = consumers.concerns[0]

  const weekChange = checkIns.lastWeek > 0
    ? Math.round(((checkIns.thisWeek - checkIns.lastWeek) / checkIns.lastWeek) * 100)
    : null

  const sortedAgeRanges = [...consumers.ageRanges].sort((a, b) => b.n - a.n)

  return (
    <div className="space-y-4">
      {/* Skin Tone Distribution */}
      <InsightCard
        title="Skin Tone Distribution"
        subtitle={`Monk skin tone scale · ${totalConsumers} consumer${totalConsumers !== 1 ? 's' : ''}`}
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Skin Tone Distribution"
            dataContext={{ monkSkinTones: consumers.monkSkinTones, skinTypes: consumers.skinTypes, totalConsumers }}
          />
        }
      >
        <div className="space-y-4">
          <SkinToneGrid
            data={consumers.monkSkinTones.map(f => ({
              tone: String(f.type),
              label: f.label,
              count: f.count,
              pct: f.pct,
              engagement: 0,
            }))}
          />
          <div className="flex gap-4 pt-1">
            {consumers.monkSkinTones.map(f => (
              <div key={f.type} className="text-center flex-1">
                <p className="text-[10px] font-semibold" style={{ color: 'var(--ink-3)' }}>
                  {f.type}
                </p>
              </div>
            ))}
          </div>
          {skinTypeBar.length > 0 && <SkinToneBar data={skinTypeBar} showLabels height={8} />}
          {dominantFitz.count > 0 && topConcern && (
            <AIBadge>
              MST {dominantFitz.type} is your most common skin tone ({dominantFitz.pct}% of consumers).{' '}
              {CONCERN_LABELS[topConcern.concern] ?? topConcern.concern} is the top reported concern ({topConcern.pct}% of users).
            </AIBadge>
          )}
        </div>
      </InsightCard>

      {/* Check-in Activity */}
      <InsightCard
        title="Check-in Activity"
        subtitle="Weekly · last 12 weeks"
        accent="sage"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Check-in Activity"
            dataContext={{ weeklyTrend: checkIns.weeklyTrend, thisWeek: checkIns.thisWeek, lastWeek: checkIns.lastWeek, weekChangePercent: weekChange }}
          />
        }
      >
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{checkIns.thisWeek}</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>this week</p>
            </div>
            {weekChange !== null && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded"
                style={{
                  background: weekChange >= 0 ? 'var(--sage-light)' : 'var(--blush-light)',
                  color: weekChange >= 0 ? 'var(--sage)' : 'var(--blush)',
                }}
              >
                {weekChange >= 0 ? '↑' : '↓'} {Math.abs(weekChange)}% vs last week
              </span>
            )}
          </div>
          <Sparkline data={checkIns.weeklyTrend} color="var(--sage)" height={56} showTooltip />
        </div>
      </InsightCard>

      {/* Top Concerns */}
      {consumers.concerns.length > 0 && (
        <InsightCard
          title="Top Consumer Concerns"
          subtitle="% of consumers reporting"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Top Consumer Concerns"
              dataContext={{ concerns: consumers.concerns, totalConsumers }}
            />
          }
        >
          <div className="space-y-2.5">
            {consumers.concerns.slice(0, 6).map(c => (
              <Link key={c.concern} href={`/${slug}/consumers/roster?concern=${c.concern}`} className="block space-y-1 hover:opacity-70 transition-opacity">
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: 'var(--ink-2)' }}>
                    {CONCERN_LABELS[c.concern] ?? c.concern}
                  </span>
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
              </Link>
            ))}
          </div>
        </InsightCard>
      )}

      {/* Age Distribution */}
      {consumers.ageRanges.length > 0 && (
        <InsightCard
          title="Age Cohorts"
          subtitle="Active consumers by age group"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Age Cohorts"
              dataContext={{ ageRanges: consumers.ageRanges, totalConsumers }}
            />
          }
        >
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={consumers.ageRanges}
              barSize={28}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            >
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
                {consumers.ageRanges.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.group === sortedAgeRanges[0]?.group ? 'var(--clay)' : 'var(--border)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {sortedAgeRanges[0] && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--ink-3)' }}>
              {sortedAgeRanges[0].group} cohort is largest · {sortedAgeRanges[0].n} users
            </p>
          )}
        </InsightCard>
      )}

      {consumers.concerns.length === 0 && consumers.ageRanges.length === 0 && (
        <InsightCard title="Consumer Profiles" subtitle="">
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>
            Consumer profile data will appear as users complete the quiz.
          </p>
        </InsightCard>
      )}
    </div>
  )
}
