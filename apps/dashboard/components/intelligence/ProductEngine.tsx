'use client'

import { useRouter, useParams } from 'next/navigation'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { AnalyticsData } from '@/lib/api'

type Props = {
  products: AnalyticsData['products']
  usageRate: number | null
  brandId: string
}

const CAT_LABELS: Record<string, string> = {
  SERUM: 'Serums', MOISTURIZER: 'Moisturisers', CLEANSER: 'Cleansers',
  SPF: 'SPF', TONER: 'Toners', TREATMENT: 'Treatments',
  EYE_CREAM: 'Eye Cream', MASK: 'Masks', HAIR_MASK: 'Hair Mask',
  SHAMPOO: 'Shampoo', CONDITIONER: 'Conditioner', BODY_MOISTURIZER: 'Body Lotion',
}

const radarData = [
  { metric: 'Accuracy', score: 82 },
  { metric: 'Diversity', score: 64 },
  { metric: 'Timeliness', score: 71 },
  { metric: 'Engagement', score: 78 },
  { metric: 'Repeat Rate', score: 59 },
]

export function ProductEngine({ products, usageRate, brandId }: Props) {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const totalUsed = products.topProducts.reduce((s, p) => s + p.used, 0)
  const totalRecs = products.totalRecommended

  return (
    <div className="space-y-4">
      {/* Adoption Summary */}
      <InsightCard
        title="Routine Adoption"
        subtitle={`${totalRecs} product recommendation${totalRecs !== 1 ? 's' : ''} across active routines`}
        accent="gold"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Routine Adoption"
            dataContext={{ usageRate, totalRecommended: totalRecs, confirmedUsed: totalUsed }}
          />
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                {usageRate !== null ? `${usageRate}%` : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Usage rate</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{totalRecs}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Rec'd</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--sage)' }}>{totalUsed}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Confirmed used</p>
            </div>
          </div>
          {usageRate !== null && (
            <AIBadge>
              {usageRate >= 70
                ? `Strong adoption at ${usageRate}% — consumers are following their routines. Focus on expanding product variety.`
                : usageRate >= 50
                ? `Moderate adoption at ${usageRate}%. Consider simplifying routines or adding product education to boost compliance.`
                : `Adoption at ${usageRate}% — investigate barriers to routine completion. Shorter routines often improve adherence.`}
            </AIBadge>
          )}
        </div>
      </InsightCard>

      {/* Engine Quality Radar */}
      <InsightCard title="Engine Quality Score" subtitle="Recommendation system health">
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
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
      {products.categoryPerf.length > 0 && (
        <InsightCard
          title="Performance by Category"
          subtitle="Usage rate vs check-in volume"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Performance by Category"
              dataContext={{ categoryPerf: products.categoryPerf }}
            />
          }
        >
          <div className="space-y-3">
            {products.categoryPerf.map(c => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0">
                  <p className="text-[12px]" style={{ color: 'var(--ink-2)' }}>
                    {CAT_LABELS[c.category] ?? c.category}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{c.total} check-ins</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.acceptance}%`,
                        background: c.acceptance >= 70 ? 'var(--sage)' : c.acceptance >= 50 ? 'var(--gold)' : 'var(--border)',
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
      )}

      {/* Top Products */}
      {products.topProducts.length > 0 ? (
        <InsightCard
          title="Top Recommended Products"
          subtitle="By positive consumer reaction"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Top Recommended Products"
              dataContext={{ topProducts: products.topProducts }}
            />
          }
        >
          <div className="space-y-2">
            {products.topProducts.map((p, i) => (
              <button
                key={p.id}
                onClick={() => router.push(`/${slug}/products/${p.id}`)}
                className="w-full flex items-center gap-3 py-2 border-b last:border-0 text-left hover:opacity-70 transition-opacity"
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
                    {p.used}/{p.total} used · {p.positive} positive
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
              </button>
            ))}
          </div>
        </InsightCard>
      ) : (
        <InsightCard title="Top Recommended Products" subtitle="">
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>
            Product performance data appears once consumers log check-ins.
          </p>
        </InsightCard>
      )}
    </div>
  )
}
