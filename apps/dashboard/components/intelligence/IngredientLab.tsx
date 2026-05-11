'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { FlaskConical } from 'lucide-react'
import type { AnalyticsData } from '@/lib/api'

type Props = {
  products: AnalyticsData['products']
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

export function IngredientLab({ products }: Props) {
  const { topIngredients, concernCoverage } = products

  const gaps = concernCoverage.filter(c => c.userPct >= 40 && c.coverage < 50)
  const maxScore = Math.max(...topIngredients.map(i => i.score), 1)

  return (
    <div className="space-y-4">
      {/* Top Ingredients */}
      {topIngredients.length > 0 ? (
        <InsightCard
          title="Ingredient Intelligence Index"
          subtitle="Key ingredients across your active routines"
          accent="clay"
        >
          <div className="space-y-2.5">
            {topIngredients.map(ing => (
              <div key={ing.name} className="flex items-center gap-3">
                <div className="w-36 flex-shrink-0">
                  <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>
                    {ing.name}
                  </p>
                  {ing.concerns.length > 0 && (
                    <p className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
                      {ing.concerns.map(c => CONCERN_LABELS[c] ?? c).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(ing.score / maxScore) * 100}%`, background: 'var(--clay)' }}
                    />
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold w-8 text-right tabular-nums"
                  style={{ color: 'var(--clay-dim)' }}
                >
                  {ing.count}×
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--ink-3)' }}>
            Count = number of active routines featuring this ingredient
          </p>
        </InsightCard>
      ) : (
        <InsightCard title="Ingredient Intelligence Index" subtitle="">
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>
            Ingredient data will appear as routines are generated.
          </p>
        </InsightCard>
      )}

      {/* Coverage Gaps */}
      {gaps.length > 0 && (
        <InsightCard
          title="Concern Coverage Gaps"
          subtitle="High-prevalence concerns with low routine coverage"
          accent="blush"
        >
          <div className="space-y-2">
            {gaps.map(g => (
              <div
                key={g.concern}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: g.coverage < 25 ? 'var(--blush-light)' : 'var(--porcelain-2)' }}
              >
                <div className="flex items-center gap-2.5">
                  <FlaskConical
                    size={13}
                    style={{ color: g.coverage < 25 ? 'var(--blush)' : 'var(--ink-3)' }}
                  />
                  <div>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>
                      {CONCERN_LABELS[g.concern] ?? g.concern}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      {g.userPct}% of users report this · {g.productCount} product{g.productCount !== 1 ? 's' : ''} cover it
                    </p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    background: g.coverage < 25 ? 'var(--blush)' : 'var(--gold)',
                    color: 'white',
                  }}
                >
                  {g.coverage < 25 ? 'high' : 'medium'}
                </span>
              </div>
            ))}
          </div>
          {gaps.some(g => g.coverage < 25) && (
            <div className="mt-3">
              <AIBadge>
                {(() => {
                  const worstGap = gaps.find(g => g.coverage < 25)
                  return worstGap
                    ? `${CONCERN_LABELS[worstGap.concern] ?? worstGap.concern} affects ${worstGap.userPct}% of your consumers but has low routine coverage. Expanding your catalogue for this concern could meaningfully improve recommendation quality.`
                    : 'Consider adding products that address these under-covered concerns.'
                })()}
              </AIBadge>
            </div>
          )}
        </InsightCard>
      )}

      {/* Concern Coverage Map */}
      {concernCoverage.length > 0 && (
        <InsightCard title="Concern Coverage Map" subtitle="How well your routines address each reported concern">
          <div className="space-y-3">
            {concernCoverage.slice(0, 6).map(c => (
              <div key={c.concern} className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span style={{ color: 'var(--ink-2)' }}>
                    {CONCERN_LABELS[c.concern] ?? c.concern}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      {c.productCount} product{c.productCount !== 1 ? 's' : ''}
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                      {c.coverage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${c.coverage}%`,
                      background: c.coverage >= 75 ? 'var(--sage)' : c.coverage >= 50 ? 'var(--gold)' : 'var(--blush)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </InsightCard>
      )}
    </div>
  )
}
