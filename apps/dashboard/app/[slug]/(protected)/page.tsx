import { MetricTile } from '@/components/ui/MetricTile'
import { ConsumerPanel } from '@/components/intelligence/ConsumerPanel'
import { ProductEngine } from '@/components/intelligence/ProductEngine'
import { IngredientLab } from '@/components/intelligence/IngredientLab'
import { MarketFeed } from '@/components/intelligence/MarketFeed'
import { BenchmarkMatrix } from '@/components/intelligence/BenchmarkMatrix'
import { AIBadge } from '@/components/ui/AIBadge'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { Users, Package, FlaskConical, TrendingUp } from 'lucide-react'
import { getAnalytics } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string }>
}

export default async function IntelligencePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { days: rawDays } = await searchParams
  const days = Number(rawDays) || 30
  const analytics = await getAnalytics(days)
  const s = analytics?.summary

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div
        className="sticky top-0 z-10 px-7 py-4 flex items-center justify-between"
        style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Beauty Intelligence
          </p>
          <h1 className="font-display text-xl leading-tight mt-0.5 capitalize" style={{ color: 'var(--ink)' }}>
            {slug}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <TimeframePicker />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--sage)' }} title="Live data" />
        </div>
      </div>

      <div className="px-7 py-6 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Active Consumers"
            value={s ? s.totalConsumers.toLocaleString() : '—'}
            icon={<Users size={14} />}
          />
          <MetricTile
            label="Routine Adoption"
            value={s?.usageRate != null ? `${s.usageRate}%` : '—'}
            icon={<Package size={14} />}
          />
          <MetricTile
            label="Avg Satisfaction"
            value={s?.avgRating != null ? `${s.avgRating}/5` : '—'}
            icon={<FlaskConical size={14} />}
          />
          <MetricTile
            label="Routine Compliance"
            value={s?.complianceRate != null ? `${s.complianceRate}%` : '—'}
            icon={<TrendingUp size={14} />}
          />
        </div>

        {/* Summary insight */}
        <AIBadge>
          {analytics?.consumers.concerns[0]
            ? `${analytics.consumers.concerns[0].pct}% of your consumers report ${(analytics.consumers.concerns[0].concern as string).toLowerCase().replace(/_/g, ' ')} as a top concern. `
            : ''}
          {s?.complianceRate != null
            ? `Routine compliance is ${s.complianceRate}% — ${s.complianceRate >= 70 ? 'above average. Keep reinforcing check-in habits.' : 'focus on education and simplifying routines to lift adherence.'}`
            : 'Embed the quiz widget on your storefront to start building your consumer intelligence.'}
        </AIBadge>

        {/* Main 2-col intelligence grid */}
        {analytics ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                      Consumer Intelligence
                    </h2>
                    <a href={`/${slug}/consumers`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                      Full view →
                    </a>
                  </div>
                  <ConsumerPanel
                    consumers={analytics.consumers}
                    checkIns={analytics.checkIns}
                    totalConsumers={analytics.summary.totalConsumers}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                      Product Performance
                    </h2>
                    <a href={`/${slug}/products`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                      Full view →
                    </a>
                  </div>
                  <ProductEngine products={analytics.products} usageRate={analytics.summary.usageRate} />
                </div>

                {/* Outcomes snapshot */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                      Outcomes
                    </h2>
                    <a href={`/${slug}/outcomes`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                      Full view →
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Avg Skin Rating', value: analytics.summary.avgRating != null ? `${analytics.summary.avgRating}/5` : '—' },
                      { label: 'Compliance', value: analytics.summary.complianceRate != null ? `${analytics.summary.complianceRate}%` : '—' },
                      { label: 'Total Check-ins', value: analytics.summary.totalCheckIns.toLocaleString() },
                      { label: 'Routines Refined', value: analytics.outcomes.totalRefined.toString() },
                    ].map(tile => (
                      <div key={tile.label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: 'var(--ink-3)' }}>{tile.label}</p>
                        <p className="text-xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{tile.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredient + Market row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                    Ingredient Lab
                  </h2>
                  <a href={`/${slug}/ingredients`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                    Full view →
                  </a>
                </div>
                <IngredientLab products={analytics.products} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                    Market Signals
                  </h2>
                  <a href={`/${slug}/market`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                    Full view →
                  </a>
                </div>
                <MarketFeed analytics={analytics} />
              </div>
            </div>

            {/* Full-width benchmarking */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
                  Brand Benchmarking
                </h2>
                <a href={`/${slug}/benchmarking`} className="text-[11px] hover:opacity-70 transition-opacity" style={{ color: 'var(--clay)' }}>
                  Full view →
                </a>
              </div>
              <BenchmarkMatrix analytics={analytics} />
            </div>
          </>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Could not load analytics. Make sure the API is running.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
