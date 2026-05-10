import { MetricTile } from '@/components/ui/MetricTile'
import { ConsumerPanel } from '@/components/intelligence/ConsumerPanel'
import { ProductEngine } from '@/components/intelligence/ProductEngine'
import { IngredientLab } from '@/components/intelligence/IngredientLab'
import { MarketFeed } from '@/components/intelligence/MarketFeed'
import { BenchmarkMatrix } from '@/components/intelligence/BenchmarkMatrix'
import { AIBadge } from '@/components/ui/AIBadge'
import { Users, Package, FlaskConical, TrendingUp } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function IntelligencePage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div
        className="sticky top-0 z-10 px-7 py-4 flex items-center justify-between"
        style={{
          background: 'var(--porcelain)',
          borderBottom: '1px solid var(--border)',
        }}
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
          <div
            className="text-[11px] px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}
          >
            Last 30 days
          </div>
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--sage)' }}
            title="Live data"
          />
        </div>
      </div>

      <div className="px-7 py-6 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Active Consumers"
            value="2,847"
            trend={{ delta: 12.4, label: 'MoM' }}
            icon={<Users size={14} />}
          />
          <MetricTile
            label="Rec Acceptance"
            value="64%"
            trend={{ delta: 3.2, label: 'vs last mo' }}
            icon={<Package size={14} />}
          />
          <MetricTile
            label="Avg Satisfaction"
            value="4.1/5"
            trend={{ delta: 2.1, label: 'vs last mo' }}
            icon={<FlaskConical size={14} />}
          />
          <MetricTile
            label="Routine Compliance"
            value="61%"
            trend={{ delta: -1.8, label: 'vs last mo' }}
            icon={<TrendingUp size={14} />}
          />
        </div>

        {/* Summary AI insight */}
        <AIBadge>
          Your brand is outperforming on consumer engagement but has two critical gaps:
          catalogue completeness (43% vs 67% industry avg) and missing azelaic acid coverage
          for your hyperpigmentation-heavy consumer base. These are your highest-leverage actions.
        </AIBadge>

        {/* Main 2-col intelligence grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Consumer + Product column */}
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
              <ConsumerPanel />
            </div>
          </div>

          {/* Product + Market column */}
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
              <ProductEngine />
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
            <IngredientLab />
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
            <MarketFeed />
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
          <BenchmarkMatrix />
        </div>
      </div>
    </div>
  )
}
