'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { InsightButton } from '@/components/ui/InsightButton'
import { AIBadge } from '@/components/ui/AIBadge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { AnalyticsData } from '@/lib/api'

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

// Synthetic market benchmarks
const MARKET_CONCERN_DEMAND: Record<string, number> = {
  ACNE: 65, HYPERPIGMENTATION: 52, AGING: 48, DRYNESS: 42, SENSITIVITY: 38,
  OILINESS: 35, REDNESS: 28, DULLNESS: 25, UNEVEN_TEXTURE: 22, DEHYDRATION: 30,
  DARK_CIRCLES: 20, PORES: 32,
}

const MARKET_SKIN_TONE_DIST: Record<number, number> = {
  1: 8, 2: 12, 3: 15, 4: 18, 5: 22, 6: 25,
}

const MARKET_SKIN_TYPES: Record<string, number> = {
  DRY: 22, OILY: 18, COMBINATION: 32, NORMAL: 20, SENSITIVE: 8,
}

const MARKET_AGE_DIST: Record<string, number> = {
  '18-24': 22, '25-34': 31, '35-44': 25, '45-54': 14, '55+': 8,
}

interface Props {
  analytics: AnalyticsData
  brandId: string
}

export function BenchmarkExtended({ analytics, brandId }: Props) {
  const { products, consumers, summary, checkIns } = analytics

  // ── Market Trends ──────────────────────────────────────────────────────────
  const avgAcceptance = products.categoryPerf.length > 0
    ? products.categoryPerf.reduce((s, c) => s + c.acceptance, 0) / products.categoryPerf.length
    : 0
  const marketCategoryAvg = 58 // synthetic market average acceptance

  const categoryTrends = products.categoryPerf.map(c => ({
    ...c,
    marketAvg: marketCategoryAvg,
    delta: c.acceptance - marketCategoryAvg,
    trend: c.acceptance > marketCategoryAvg + 8 ? 'up' : c.acceptance < marketCategoryAvg - 8 ? 'down' : 'flat',
  })).sort((a, b) => b.delta - a.delta)

  // ── Concern Benchmarks ─────────────────────────────────────────────────────
  const concernBenchmarks = products.concernCoverage.map(c => {
    const marketDemand = MARKET_CONCERN_DEMAND[c.concern] ?? 30
    const demandIndex = c.userPct > 0 ? Math.round((c.userPct / marketDemand) * 100) : 0
    const coverageGap = c.coverage - (c.userPct > 50 ? 70 : c.userPct > 30 ? 50 : 30)
    return {
      concern: c.concern,
      label: CONCERN_LABELS[c.concern] ?? c.concern,
      brandPct: c.userPct,
      marketPct: marketDemand,
      coverage: c.coverage,
      demandIndex,
      coverageGap,
      overIndexed: c.userPct > marketDemand + 10,
      underIndexed: c.userPct < marketDemand - 10,
    }
  }).sort((a, b) => b.brandPct - a.brandPct).slice(0, 8)

  // ── Demographic Gaps ───────────────────────────────────────────────────────
  const skinToneGaps = consumers.monkSkinTones.map(t => {
    const marketPct = MARKET_SKIN_TONE_DIST[t.type] ?? 15
    const gap = t.pct - marketPct
    return { type: t.type, label: t.label, brandPct: t.pct, marketPct, gap }
  })

  const skinTypeGaps = consumers.skinTypes.map(t => {
    const marketPct = MARKET_SKIN_TYPES[t.type] ?? 20
    const gap = t.pct - marketPct
    return { type: t.type, brandPct: t.pct, marketPct, gap }
  })

  const ageGaps = consumers.ageRanges.map(a => {
    const marketPct = MARKET_AGE_DIST[a.group] ?? 20
    const total = consumers.ageRanges.reduce((s, r) => s + r.n, 0)
    const brandPct = total > 0 ? Math.round((a.n / total) * 100) : 0
    const gap = brandPct - marketPct
    return { group: a.group, brandPct, marketPct, gap }
  }).filter(a => a.brandPct > 0)

  // ── Portfolio Fit ──────────────────────────────────────────────────────────
  const coveredConcerns = products.concernCoverage.filter(c => c.coverage > 0).length
  const totalConcerns = products.concernCoverage.length
  const portfolioFitScore = totalConcerns > 0
    ? Math.round((coveredConcerns / totalConcerns) * 100)
    : 0
  const demandAlignmentScore = concernBenchmarks.length > 0
    ? Math.round(
        concernBenchmarks
          .filter(c => c.coverage > 0)
          .reduce((s, c) => s + Math.min(c.coverage, 100), 0) / (concernBenchmarks.length * 100) * 100
      )
    : 0
  const topUnmetNeeds = concernBenchmarks.filter(c => c.coverage < 40 && c.brandPct > 20)

  return (
    <div className="space-y-4 mt-4">
      {/* Market Trends */}
      <InsightCard
        title="Market Trends"
        subtitle="Category performance vs synthetic market average (58% acceptance)"
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Market Trends"
            dataContext={{ categoryTrends, marketCategoryAvg }}
          />
        }
      >
        {categoryTrends.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-6 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--clay)', opacity: 0.85 }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Your brand</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--border)', opacity: 0.85 }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Market avg (58%)</span>
              </div>
            </div>
            {categoryTrends.map(cat => (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-[12px] font-medium capitalize" style={{ color: 'var(--ink)' }}>
                      {cat.category.toLowerCase().replace(/_/g, ' ')}
                    </p>
                    {cat.trend === 'up'   && <TrendingUp  size={11} style={{ color: 'var(--sage)' }} />}
                    {cat.trend === 'down' && <TrendingDown size={11} style={{ color: 'var(--blush)' }} />}
                    {cat.trend === 'flat' && <Minus        size={11} style={{ color: 'var(--ink-3)' }} />}
                  </div>
                  <p className="text-[12px] font-semibold tabular-nums" style={{
                    color: cat.delta > 0 ? 'var(--sage)' : cat.delta < 0 ? 'var(--blush)' : 'var(--ink-3)',
                  }}>
                    {cat.delta > 0 ? '+' : ''}{cat.delta.toFixed(0)}pp
                  </p>
                  <p className="text-[12px] font-semibold w-10 text-right tabular-nums" style={{ color: 'var(--ink)' }}>
                    {cat.acceptance}%
                  </p>
                </div>
                <div className="relative h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="absolute top-0 left-0 h-full rounded-full opacity-30"
                    style={{ width: `${cat.marketAvg}%`, background: 'var(--ink-3)' }}
                  />
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${cat.acceptance}%`,
                      background: cat.trend === 'up' ? 'var(--sage)' : cat.trend === 'down' ? 'var(--blush)' : 'var(--clay)',
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            ))}
            {avgAcceptance > marketCategoryAvg && (
              <div className="mt-3">
                <AIBadge>
                  Your average category acceptance is {Math.round(avgAcceptance)}% — {Math.round(avgAcceptance - marketCategoryAvg)}pp above market average.
                  {categoryTrends[0] ? ` ${categoryTrends[0].category.charAt(0).toUpperCase() + categoryTrends[0].category.slice(1).toLowerCase().replace(/_/g, ' ')} leads with ${categoryTrends[0].acceptance}%.` : ''}
                </AIBadge>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Market trend data will appear as products are used.
          </p>
        )}
      </InsightCard>

      {/* Concern Benchmarks vs Market */}
      <InsightCard
        title="Concern Benchmarks vs Market"
        subtitle="Your consumer concern demand vs estimated market penetration rates"
        accent="gold"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Concern Benchmarks"
            dataContext={{ concernBenchmarks }}
          />
        }
      >
        {concernBenchmarks.length > 0 ? (
          <div>
            <div className="grid grid-cols-4 text-[10px] font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--ink-3)' }}>
              <span className="col-span-2">Concern</span>
              <span className="text-center">Yours</span>
              <span className="text-right">Market</span>
            </div>
            <div className="space-y-3">
              {concernBenchmarks.map(c => (
                <div key={c.concern}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 flex items-center gap-1.5">
                      {c.overIndexed && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}>
                          Over-indexed
                        </span>
                      )}
                      {c.underIndexed && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--blush-light)', color: 'var(--blush)' }}>
                          Under-indexed
                        </span>
                      )}
                      <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{c.label}</p>
                    </div>
                    <p className="text-[12px] font-semibold w-10 text-center tabular-nums" style={{ color: 'var(--clay)' }}>{c.brandPct}%</p>
                    <p className="text-[12px] w-10 text-right tabular-nums" style={{ color: 'var(--ink-3)' }}>{c.marketPct}%</p>
                  </div>
                  <div className="relative h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-25"
                      style={{ width: `${c.marketPct}%`, background: 'var(--ink-3)' }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-80"
                      style={{ width: `${c.brandPct}%`, background: 'var(--clay)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--clay)', opacity: 0.8 }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Your consumers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded" style={{ background: 'var(--ink-3)', opacity: 0.25 }} />
                <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Market average</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Concern benchmark data will appear as consumers complete skin profiles.
          </p>
        )}
      </InsightCard>

      {/* Demographic Gaps */}
      <InsightCard
        title="Demographic Gaps"
        subtitle="Consumer distribution vs estimated market demographics — identify under-served segments"
        accent="sage"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Demographic Gaps"
            dataContext={{ skinToneGaps, skinTypeGaps, ageGaps }}
          />
        }
      >
        <div className="space-y-5">
          {skinToneGaps.filter(t => t.brandPct > 0).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Skin Tone Distribution</p>
              <div className="grid grid-cols-3 gap-2">
                {skinToneGaps.filter(t => t.brandPct > 0).map(t => (
                  <div key={t.type} className="rounded-lg p-2.5" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
                    <p className="text-[10px] font-medium truncate" style={{ color: 'var(--ink-2)' }}>Type {t.type}</p>
                    <p className="text-[15px] font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>{t.brandPct}%</p>
                    <p className="text-[10px]" style={{
                      color: t.gap > 5 ? 'var(--sage)' : t.gap < -5 ? 'var(--blush)' : 'var(--ink-3)',
                    }}>
                      {t.gap > 0 ? '+' : ''}{t.gap}pp vs market
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ageGaps.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Age Distribution</p>
              <div className="space-y-2">
                {ageGaps.map(a => (
                  <div key={a.group} className="flex items-center gap-3">
                    <p className="text-[11px] w-16 flex-shrink-0" style={{ color: 'var(--ink-2)' }}>{a.group}</p>
                    <div className="flex-1 relative h-1.5 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                      <div
                        className="absolute top-0 left-0 h-full rounded-full opacity-25"
                        style={{ width: `${a.marketPct * 2}%`, background: 'var(--ink-3)' }}
                      />
                      <div
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ width: `${a.brandPct * 2}%`, background: a.brandPct > a.marketPct ? 'var(--sage)' : 'var(--clay)', opacity: 0.8 }}
                      />
                    </div>
                    <div className="text-right w-20">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>{a.brandPct}%</span>
                      <span className="text-[10px] ml-1" style={{
                        color: a.gap > 3 ? 'var(--sage)' : a.gap < -3 ? 'var(--blush)' : 'var(--ink-3)',
                      }}>
                        {a.gap > 0 ? '+' : ''}{a.gap}pp
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </InsightCard>

      {/* Portfolio Fit */}
      <InsightCard
        title="Portfolio Fit"
        subtitle="How well your product catalogue aligns with your consumer demand signals"
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Portfolio Fit"
            dataContext={{ portfolioFitScore, demandAlignmentScore, topUnmetNeeds }}
          />
        }
      >
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>Portfolio Coverage</p>
              <p className="text-2xl font-semibold font-display" style={{ color: portfolioFitScore >= 70 ? 'var(--sage)' : portfolioFitScore >= 40 ? 'var(--gold)' : 'var(--blush)' }}>
                {portfolioFitScore}%
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {coveredConcerns} of {totalConcerns} concern{totalConcerns !== 1 ? 's' : ''} addressed
              </p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>Demand Alignment</p>
              <p className="text-2xl font-semibold font-display" style={{ color: demandAlignmentScore >= 70 ? 'var(--sage)' : demandAlignmentScore >= 40 ? 'var(--gold)' : 'var(--blush)' }}>
                {demandAlignmentScore}%
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>avg coverage on active concerns</p>
            </div>
          </div>

          {topUnmetNeeds.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>Top Unmet Needs</p>
              <div className="space-y-2">
                {topUnmetNeeds.slice(0, 4).map(need => (
                  <div key={need.concern} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: 'var(--blush-light)' }}>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{need.label}</p>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{need.brandPct}% demand</span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--blush)' }}>{need.coverage}% coverage</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <AIBadge>
                  Portfolio covers {portfolioFitScore}% of consumer concerns.
                  {topUnmetNeeds[0] ? ` ${topUnmetNeeds[0].label} represents your largest opportunity — ${topUnmetNeeds[0].brandPct}% consumer demand with only ${topUnmetNeeds[0].coverage}% coverage.` : ''}
                </AIBadge>
              </div>
            </div>
          )}
        </div>
      </InsightCard>
    </div>
  )
}
