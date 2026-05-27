import Link from 'next/link'
import { ArrowLeft, Layers, Package, FlaskConical, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { InsightCard } from '@/components/ui/InsightCard'
import { MetricTile } from '@/components/ui/MetricTile'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTimeframe, getTokenAndBrandId } from '@/lib/api'
import type { AnalyticsData } from '@/lib/api'
import { InsightButton } from '@/components/ui/InsightButton'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type RiskLevel = 'High' | 'Medium' | 'Low'

function riskLevel(adoption: number, avg: number): RiskLevel {
  return adoption > avg + 10 ? 'High' : adoption > avg - 10 ? 'Medium' : 'Low'
}

function deriveSupplyChain(a: AnalyticsData) {
  const { summary, products, consumers } = a
  const usageRate = summary.usageRate ?? 50

  // Ingredient demand — monthly projection
  const ingredientForecasts = products.topIngredients.map(ing => {
    const monthlyDemand = Math.round(ing.count * (usageRate / 100) * 4.3)
    const quarterlyDemand = monthlyDemand * 3
    const riskScore =
      (ing.score > 7 ? 2 : ing.score > 4 ? 1 : 0) +
      (ing.count > 5 ? 2 : ing.count > 2 ? 1 : 0)
    const risk: RiskLevel = riskScore >= 3 ? 'High' : riskScore >= 2 ? 'Medium' : 'Low'
    return { ...ing, monthlyDemand, quarterlyDemand, risk }
  })

  // Product stock planning — projected monthly units by top products
  const avgAcceptance = products.topProducts.length > 0
    ? products.topProducts.reduce((s, p) => s + p.rate, 0) / products.topProducts.length
    : 50
  const productForecasts = products.topProducts.map(p => {
    const monthly30d = Math.round(p.used * 4.3)
    const monthly60d = Math.round(monthly30d * (1 + (p.rate - avgAcceptance) / 200))
    const monthly90d = Math.round(monthly30d * (1 + (p.rate - avgAcceptance) / 100))
    const risk = riskLevel(p.rate, avgAcceptance)
    return { ...p, monthly30d, monthly60d, monthly90d, risk }
  })

  // Coverage gap pipeline — uncovered concerns = new product line signals
  const gapPipeline = products.concernCoverage
    .filter(c => c.coverage === 0 && c.userPct > 5)
    .sort((a, b) => b.userPct - a.userPct)
    .map(c => ({
      concern: c.concern,
      consumerDemand: c.userPct,
      priority: c.userPct > 30 ? 'Critical' : c.userPct > 15 ? 'High' : 'Medium',
    }))

  // Category demand shifts
  const avgCatAcceptance = products.categoryPerf.length > 0
    ? products.categoryPerf.reduce((s, c) => s + c.acceptance, 0) / products.categoryPerf.length
    : 50
  const categoryForecasts = products.categoryPerf
    .sort((a, b) => b.acceptance - a.acceptance)
    .map(c => ({
      ...c,
      momentum: c.acceptance > avgCatAcceptance + 5 ? 'growing' : c.acceptance < avgCatAcceptance - 5 ? 'declining' : 'stable',
      projectedUnits30d: Math.round(c.used * 4.3 * (c.acceptance / 100)),
    }))

  // Summary KPIs
  const activeIngredients = products.topIngredients.length
  const highDemandProducts = productForecasts.filter(p => p.risk === 'High').length
  const coverageGaps = gapPipeline.length
  const totalProjected30d = productForecasts.reduce((s, p) => s + p.monthly30d, 0)

  return {
    ingredientForecasts,
    productForecasts,
    gapPipeline,
    categoryForecasts,
    activeIngredients,
    highDemandProducts,
    coverageGaps,
    totalProjected30d,
    avgCatAcceptance,
  }
}

const RISK_STYLES: Record<RiskLevel, { bg: string; color: string }> = {
  High:   { bg: 'var(--blush-light)', color: 'var(--blush)' },
  Medium: { bg: 'var(--gold-light)',  color: 'var(--gold)'  },
  Low:    { bg: 'var(--sage-light)',  color: 'var(--sage)'  },
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'var(--blush-light)', color: 'var(--blush)' },
  High:     { bg: 'var(--gold-light)',  color: 'var(--gold)'  },
  Medium:   { bg: 'var(--sage-light)',  color: 'var(--sage)'  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SupplyChainPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  if (!analytics) {
    return (
      <div className="px-7 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>Predictive</p>
            <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Supply Chain Planning</h1>
          </div>
          <TimeframePicker />
        </div>
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No data yet — supply chain forecasts will appear once product and check-in data is available.</p>
        </div>
      </div>
    )
  }

  const sc = deriveSupplyChain(analytics)

  return (
    <div className="px-7 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/${slug}/predictive`}
              className="flex items-center gap-1 text-[11px] hover:underline"
              style={{ color: 'var(--ink-3)' }}
            >
              <ArrowLeft size={11} /> Predictive
            </Link>
          </div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Predictive / Supply Chain
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Supply Chain Planning</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Ingredient demand, product stock forecasts & gap pipeline for {slug}
          </p>
        </div>
        <TimeframePicker />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricTile
          label="Active Ingredients"
          value={sc.activeIngredients}
          sub="in consumer routines"
          icon={<FlaskConical size={14} />}
          href={`/${slug}/ingredients`}
        />
        <MetricTile
          label="High-Demand Products"
          value={sc.highDemandProducts}
          sub="above avg adoption"
          icon={<Package size={14} />}
          href={`/${slug}/products`}
        />
        <MetricTile
          label="Coverage Gaps"
          value={sc.coverageGaps}
          sub="new product lines needed"
          icon={<AlertTriangle size={14} />}
          href={`/${slug}/ingredients`}
        />
        <MetricTile
          label="Projected Units (30d)"
          value={sc.totalProjected30d.toLocaleString()}
          sub="across all active products"
          icon={<Layers size={14} />}
          href={`/${slug}/products`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Ingredient Demand Forecast */}
        <InsightCard
          title="Ingredient Demand Forecast"
          subtitle="Projected monthly & quarterly consumption"
          accent="clay"
          actions={<InsightButton brandId={brandId} viewName="Ingredient Demand Forecast" dataContext={{ ingredientForecasts: sc.ingredientForecasts, usageRate: analytics.summary.usageRate, activeIngredients: sc.activeIngredients }} />}
        >
          {sc.ingredientForecasts.length > 0 ? (
            <div>
              <div className="grid grid-cols-4 gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                <span className="col-span-2">Ingredient</span>
                <span className="text-right">30d</span>
                <span className="text-right">90d</span>
              </div>
              <div className="space-y-2">
                {sc.ingredientForecasts.map(ing => (
                  <div key={ing.name} className="grid grid-cols-4 gap-2 items-center py-1.5" style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <div className="col-span-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>{ing.name}</p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                          style={RISK_STYLES[ing.risk]}
                        >
                          {ing.risk}
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                        {ing.count} routine{ing.count !== 1 ? 's' : ''} · score {ing.score}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{ing.monthlyDemand}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{ing.quarterlyDemand}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: 'var(--ink-3)' }}>
                Units based on active routine adoption rate ({analytics.summary.usageRate ?? 50}%).
              </p>
            </div>
          ) : (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No ingredient data yet.</p>
          )}
        </InsightCard>

        {/* Product Stock Planning */}
        <InsightCard
          title="Product Stock Planning"
          subtitle="Projected units needed at current adoption rates"
          accent="gold"
          actions={<InsightButton brandId={brandId} viewName="Product Stock Planning" dataContext={{ productForecasts: sc.productForecasts.slice(0, 8), highDemandProducts: sc.highDemandProducts, totalProjected30d: sc.totalProjected30d }} />}
        >
          {sc.productForecasts.length > 0 ? (
            <div>
              <div className="grid grid-cols-5 gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>
                <span className="col-span-2">Product</span>
                <span className="text-right">30d</span>
                <span className="text-right">60d</span>
                <span className="text-right">90d</span>
              </div>
              <div className="space-y-2">
                {sc.productForecasts.slice(0, 8).map(p => (
                  <div key={p.id} className="grid grid-cols-5 gap-2 items-center py-1.5" style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <div className="col-span-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={RISK_STYLES[p.risk]}
                        >
                          {p.risk}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{p.rate}% adoption</span>
                      </div>
                    </div>
                    <p className="text-right text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{p.monthly30d}</p>
                    <p className="text-right text-[12px]" style={{ color: 'var(--ink-2)' }}>{p.monthly60d}</p>
                    <p className="text-right text-[12px]" style={{ color: 'var(--ink-3)' }}>{p.monthly90d}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No product data yet.</p>
          )}
        </InsightCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Coverage Gap Pipeline */}
        <InsightCard
          title="Coverage Gap Pipeline"
          subtitle="Concerns with consumer demand but no product coverage"
          accent="blush"
          actions={<InsightButton brandId={brandId} viewName="Coverage Gap Pipeline" dataContext={{ gapPipeline: sc.gapPipeline, coverageGaps: sc.coverageGaps }} />}
        >
          {sc.gapPipeline.length > 0 ? (
            <div className="space-y-2">
              {sc.gapPipeline.map(g => (
                <div
                  key={g.concern}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                      {g.concern.toLowerCase().replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {g.consumerDemand}% of consumers mention this concern
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={PRIORITY_STYLES[g.priority]}
                    >
                      {g.priority}
                    </span>
                    <ChevronRight size={12} style={{ color: 'var(--ink-3)' }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] mt-2" style={{ color: 'var(--ink-3)' }}>
                These represent new product line opportunities ranked by consumer demand.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--sage-light)' }}>
                <Package size={18} style={{ color: 'var(--sage)' }} />
              </div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Full coverage achieved</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--ink-3)' }}>
                All consumer concerns above 5% have product coverage.
              </p>
            </div>
          )}
        </InsightCard>

        {/* Category Demand Forecast */}
        <InsightCard
          title="Category Demand Forecast"
          subtitle="Momentum and projected unit volumes by category"
          accent="sage"
          actions={<InsightButton brandId={brandId} viewName="Category Demand Forecast" dataContext={{ categoryForecasts: sc.categoryForecasts, avgCatAcceptance: sc.avgCatAcceptance }} />}
        >
          {sc.categoryForecasts.length > 0 ? (
            <div className="space-y-3">
              {sc.categoryForecasts.map(cat => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[12px] font-medium capitalize" style={{ color: 'var(--ink)' }}>
                        {cat.category.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      {cat.momentum === 'growing'   && <TrendingUp  size={11} style={{ color: 'var(--sage)' }} />}
                      {cat.momentum === 'declining' && <TrendingDown size={11} style={{ color: 'var(--blush)' }} />}
                      {cat.momentum === 'stable'    && <Minus        size={11} style={{ color: 'var(--ink-3)' }} />}
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: cat.momentum === 'growing' ? 'var(--sage-light)' : cat.momentum === 'declining' ? 'var(--blush-light)' : 'var(--porcelain-2)',
                          color: cat.momentum === 'growing' ? 'var(--sage)' : cat.momentum === 'declining' ? 'var(--blush)' : 'var(--ink-3)',
                        }}
                      >
                        {cat.momentum}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${cat.acceptance}%`,
                        background: cat.momentum === 'growing' ? 'var(--sage)' : cat.momentum === 'declining' ? 'var(--blush)' : 'var(--clay)',
                      }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-24">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {cat.projectedUnits30d.toLocaleString()}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>units / 30d</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No category data available.</p>
          )}
        </InsightCard>
      </div>
    </div>
  )
}
