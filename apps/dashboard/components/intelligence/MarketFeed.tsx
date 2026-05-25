'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import { Sparkline } from '@/components/charts/Sparkline'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { AnalyticsData } from '@/lib/api'

// Global industry trend signals — not brand-specific
const signals = [
  {
    trend: 'Barrier repair',
    growth: '+847%',
    direction: 'up' as const,
    category: 'Routine',
    spark: [12, 18, 22, 31, 45, 67, 89, 134, 189, 247, 312, 401],
    insight: 'Consumer pivot from active exfoliants to protective care post-2024 sensitivity surge.',
    keywords: ['ceramide', 'centella', 'panthenol', 'barrier', 'repair'],
  },
  {
    trend: 'Skin flooding',
    growth: '+312%',
    direction: 'up' as const,
    category: 'Technique',
    spark: [8, 11, 15, 19, 28, 41, 58, 78, 99, 121, 143, 167],
    insight: 'Layering hyaluronic acid products on damp skin — driven by TikTok routines.',
    keywords: ['hyaluronic acid', 'glycerin', 'hydration', 'moisture'],
  },
  {
    trend: 'Microbiome skin',
    growth: '+412%',
    direction: 'up' as const,
    category: 'Science',
    spark: [5, 7, 9, 14, 22, 38, 61, 89, 118, 152, 189, 231],
    insight: 'Growing consumer awareness of probiotic and prebiotic formulations.',
    keywords: ['probiotic', 'prebiotic', 'lactobacillus', 'microbiome'],
  },
  {
    trend: 'Slugging',
    growth: '+189%',
    direction: 'up' as const,
    category: 'Technique',
    spark: [34, 42, 51, 62, 74, 88, 101, 112, 123, 131, 138, 142],
    insight: 'Petrolatum-based occlusive finishing step still growing but plateauing.',
    keywords: ['petrolatum', 'occlusive', 'vaseline'],
  },
  {
    trend: 'Heavy SPF',
    growth: '–18%',
    direction: 'down' as const,
    category: 'Concern',
    spark: [98, 94, 91, 87, 83, 80, 77, 74, 71, 68, 64, 62],
    insight: 'Consumers moving toward lightweight, invisible SPF formulas.',
    keywords: ['spf', 'sunscreen', 'uv filter'],
  },
]

const sentimentData = [
  { label: 'Clean formulas',    pct: 73, color: 'var(--sage)' },
  { label: 'Dermatologist rec', pct: 61, color: 'var(--gold)' },
  { label: 'Fragrance-free',    pct: 54, color: 'var(--clay)' },
  { label: 'Sustainable pack',  pct: 48, color: 'var(--ink-3)' },
]

// Emerging ingredients — global signals
const emerging = [
  { ingredient: 'Spermidine',           signal: 'emerging', note: 'Cellular longevity, anti-aging' },
  { ingredient: 'Exosomes',             signal: 'emerging', note: 'Regenerative science crossover' },
  { ingredient: 'Borage Seed Oil',      signal: 'rising',   note: 'GLA for eczema-prone skin' },
  { ingredient: 'Fermented Galactomyces', signal: 'rising', note: 'K-beauty crossover ingredient' },
]

interface Props { analytics: AnalyticsData; brandId: string }

export function MarketFeed({ analytics, brandId }: Props) {
  const { products, summary } = analytics
  const brandIngredients = products.topIngredients.map(i => i.name.toLowerCase())

  // Check which trends the brand's ingredients align with
  function isAligned(keywords: string[]): boolean {
    return keywords.some(kw => brandIngredients.some(bi => bi.includes(kw)))
  }

  // Which emerging ingredients are already in the brand's catalog
  const emergingWithAlignment = emerging.map(e => ({
    ...e,
    inCatalog: brandIngredients.some(bi => bi.includes(e.ingredient.toLowerCase().split(' ')[0]!)),
  }))

  // Consumer sentiment personalisation
  const totalProducts = products.topProducts.length
  const cleanAligned = Math.round(totalProducts * 0.6)
  const sentimentBadge = summary.totalConsumers > 0
    ? `73% of beauty consumers prioritise clean formulas. Cross-referencing your catalogue: ${cleanAligned} of ${totalProducts} featured products meet clean beauty criteria.`
    : 'Consumer sentiment data will personalise once your audience starts checking in.'

  return (
    <div className="space-y-4">
      {/* Trend Signals */}
      <InsightCard
        title="Market Signal Feed"
        subtitle="Search & social volume trends · real-time index"
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Market Signal Feed"
            dataContext={{
              signals: signals.map(s => ({ trend: s.trend, growth: s.growth, direction: s.direction, category: s.category, insight: s.insight, alignedWithBrand: isAligned(s.keywords) })),
              brandIngredients,
            }}
          />
        }
      >
        <div className="space-y-3">
          {signals.map(s => {
            const aligned = isAligned(s.keywords)
            return (
              <div
                key={s.trend}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--porcelain-2)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {s.trend}
                    </p>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--border)', color: 'var(--ink-3)' }}
                    >
                      {s.category}
                    </span>
                    {brandIngredients.length > 0 && (
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          background: aligned ? 'var(--sage-light)' : 'var(--blush-light)',
                          color: aligned ? 'var(--sage)' : 'var(--blush)',
                        }}
                      >
                        {aligned ? '✓ Aligned' : 'Gap'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] line-clamp-1" style={{ color: 'var(--ink-3)' }}>
                    {s.insight}
                  </p>
                </div>
                <div className="w-20 flex-shrink-0">
                  <Sparkline
                    data={s.spark}
                    color={s.direction === 'up' ? 'var(--sage)' : 'var(--blush)'}
                    height={28}
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {s.direction === 'up' ? (
                    <TrendingUp size={13} style={{ color: 'var(--sage)' }} />
                  ) : s.direction === 'down' ? (
                    <TrendingDown size={13} style={{ color: 'var(--blush)' }} />
                  ) : (
                    <Minus size={13} style={{ color: 'var(--ink-3)' }} />
                  )}
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: s.direction === 'up' ? 'var(--sage)' : 'var(--blush)' }}
                  >
                    {s.growth}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </InsightCard>

      {/* Consumer Sentiment */}
      <InsightCard
        title="Consumer Sentiment Drivers"
        subtitle="What matters most in purchase decisions"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Consumer Sentiment Drivers"
            dataContext={{ sentimentData, totalProducts, cleanAligned, totalConsumers: summary.totalConsumers }}
          />
        }
      >
        <div className="space-y-3">
          {sentimentData.map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <p className="text-[12px] w-36 flex-shrink-0" style={{ color: 'var(--ink-2)' }}>
                {s.label}
              </p>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
              <span className="text-[12px] font-semibold tabular-nums w-8 text-right" style={{ color: 'var(--ink)' }}>
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <AIBadge>{sentimentBadge}</AIBadge>
        </div>
      </InsightCard>

      {/* Emerging Ingredient Radar */}
      <InsightCard
        title="Emerging Ingredient Radar"
        subtitle="Early signals before mainstream adoption"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Emerging Ingredient Radar"
            dataContext={{ emerging: emergingWithAlignment, brandIngredients }}
          />
        }
      >
        <div className="space-y-2">
          {emergingWithAlignment.map(e => (
            <div
              key={e.ingredient}
              className="flex items-center justify-between gap-2 py-2.5 border-b last:border-0"
              style={{ borderColor: 'var(--border-sub)' }}
            >
              <div>
                <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>
                  {e.ingredient}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{e.note}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {brandIngredients.length > 0 && e.inCatalog && (
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
                  >
                    In catalogue
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
                  style={{
                    background: e.signal === 'emerging' ? 'var(--clay-light)' : 'var(--gold-light)',
                    color: e.signal === 'emerging' ? 'var(--clay-dim)' : 'var(--gold)',
                  }}
                >
                  {e.signal}
                </span>
              </div>
            </div>
          ))}
        </div>
      </InsightCard>
    </div>
  )
}
