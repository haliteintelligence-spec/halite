'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { AnalyticsData } from '@/lib/api'

type Props = {
  checkIns: AnalyticsData['checkIns']
  outcomes: AnalyticsData['outcomes']
  summary: AnalyticsData['summary']
  brandId: string
}

const SYMPTOM_LABELS: Record<string, string> = {
  BREAKOUT: 'Breakouts', DRYNESS: 'Dryness', REDNESS: 'Redness',
  IRRITATION: 'Irritation', PURGING: 'Purging', OILINESS: 'Oiliness',
  DULLNESS: 'Dullness', HYPERPIGMENTATION_FADING: 'Pigmentation fading',
  IMPROVEMENT: 'Improving', GLOW: 'Glowing', HYDRATED: 'Hydrated',
  TEXTURE_SMOOTH: 'Smooth texture',
}

function weekLabel(i: number): string {
  if (i === 11) return 'Now'
  if (i === 10) return '-1w'
  if (i === 0) return '-11w'
  return i % 3 === 0 ? `-${11 - i}w` : ''
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{sub}</p>}
    </div>
  )
}

export function OutcomeTracker({ checkIns, outcomes, summary, brandId }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const ratingData = checkIns.ratingTrend.map((v, i) => ({ week: weekLabel(i), rating: v }))
  const complianceData = checkIns.complianceTrend.map((v, i) => ({ week: weekLabel(i), pct: v }))

  const totalSymptoms = checkIns.positiveSymptomCount + checkIns.negativeSymptomCount
  const positivePct = totalSymptoms > 0
    ? Math.round((checkIns.positiveSymptomCount / totalSymptoms) * 100)
    : null

  const topConcern = checkIns.symptoms.filter(s => !s.positive)[0]
  const topWin = checkIns.symptoms.filter(s => s.positive)[0]

  const aiInsight = summary.totalCheckIns === 0
    ? 'No check-in data yet. Embed the widget and encourage your consumers to start their weekly check-ins.'
    : [
        positivePct !== null
          ? `${positivePct}% of reported symptoms are positive signals (glow, hydration, improvement).`
          : '',
        topWin ? `"${SYMPTOM_LABELS[topWin.symptom] ?? topWin.symptom}" is your top outcome, logged ${topWin.count} times.` : '',
        topConcern ? `Watch "${SYMPTOM_LABELS[topConcern.symptom] ?? topConcern.symptom}" — it's the most common concern (${topConcern.count} reports).` : '',
        outcomes.totalRefined > 0
          ? `${outcomes.totalRefined} routine${outcomes.totalRefined !== 1 ? 's' : ''} have been auto-refined based on check-in data.`
          : '',
      ].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <AIBadge>{aiInsight}</AIBadge>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total Check-ins"
          value={summary.totalCheckIns.toLocaleString()}
          sub="all time"
        />
        <KpiTile
          label="Avg Skin Rating"
          value={summary.avgRating != null ? `${summary.avgRating}/5` : '—'}
          sub="across all consumers"
        />
        <KpiTile
          label="Compliance Rate"
          value={summary.complianceRate != null ? `${summary.complianceRate}%` : '—'}
          sub="routine adherence"
        />
        <KpiTile
          label="Routines Refined"
          value={outcomes.totalRefined.toString()}
          sub="auto-updated by AI"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Skin rating trend */}
        <InsightCard
          title="Skin Rating Trend"
          subtitle="Weekly avg · 12 weeks"
          accent="clay"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Skin Rating Trend"
              dataContext={{ ratingTrend: checkIns.ratingTrend, avgRating: summary.avgRating, totalCheckIns: summary.totalCheckIns }}
            />
          }
        >
          {summary.totalCheckIns === 0 ? (
            <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
              No check-ins yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={ratingData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number | null) => v != null ? [`${v}/5`, 'Avg rating'] : ['No data', '']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="var(--clay)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--clay)', r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </InsightCard>

        {/* Compliance trend */}
        <InsightCard
          title="Compliance Trend"
          subtitle="Weekly % · 12 weeks"
          accent="sage"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Compliance Trend"
              dataContext={{ complianceTrend: checkIns.complianceTrend, complianceRate: summary.complianceRate, totalCheckIns: summary.totalCheckIns }}
            />
          }
        >
          {summary.totalCheckIns === 0 ? (
            <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
              No check-ins yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={complianceData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number | null) => v != null ? [`${v}%`, 'Compliance'] : ['No data', '']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                  {complianceData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.pct == null ? 'var(--border)' : entry.pct >= 70 ? 'var(--sage)' : entry.pct >= 40 ? 'var(--clay)' : '#e57373'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </InsightCard>
      </div>

      {/* Symptom breakdown */}
      <InsightCard
        title="Symptom Breakdown"
        subtitle={`${checkIns.symptoms.length} reported symptoms · ${totalSymptoms} total occurrences`}
        accent="none"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Symptom Breakdown"
            dataContext={{ symptoms: checkIns.symptoms, positiveCount: checkIns.positiveSymptomCount, negativeCount: checkIns.negativeSymptomCount, totalCheckIns: summary.totalCheckIns }}
          />
        }
      >
        {checkIns.symptoms.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No symptoms reported yet</p>
        ) : (
          <div className="space-y-2 pt-1">
            {/* Positive / negative split bar */}
            {totalSymptoms > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--ink-3)' }}>
                  <span>Positive signals ({checkIns.positiveSymptomCount})</span>
                  <span>Concerns ({checkIns.negativeSymptomCount})</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-l-full transition-all"
                    style={{ width: `${positivePct ?? 0}%`, background: 'var(--sage)' }}
                  />
                  <div
                    className="h-full rounded-r-full"
                    style={{ width: `${100 - (positivePct ?? 0)}%`, background: 'var(--clay)' }}
                  />
                </div>
              </div>
            )}
            {checkIns.symptoms.map(s => {
              const max = checkIns.symptoms[0]!.count
              const pct = Math.round((s.count / max) * 100)
              return (
                <Link
                  key={s.symptom}
                  href={`/${slug}/consumers/roster?symptom=${s.symptom}`}
                  className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                >
                  <p className="text-[12px] w-44 flex-shrink-0" style={{ color: 'var(--ink)' }}>
                    {SYMPTOM_LABELS[s.symptom] ?? s.symptom}
                  </p>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sand-1)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: s.positive ? 'var(--sage)' : 'var(--clay)' }}
                    />
                  </div>
                  <p className="text-[11px] w-6 text-right flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                    {s.count}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </InsightCard>
    </div>
  )
}
