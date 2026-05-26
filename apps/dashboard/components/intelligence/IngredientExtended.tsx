'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { InsightButton } from '@/components/ui/InsightButton'
import { AIBadge } from '@/components/ui/AIBadge'
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

interface Props {
  products: AnalyticsData['products']
  symptoms: AnalyticsData['checkIns']['symptoms']
  brandId: string
}

export function IngredientExtended({ products, symptoms, brandId }: Props) {
  const efficacyData = [...products.topIngredients]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
  const maxScore = Math.max(...efficacyData.map(i => i.score), 1)

  const reactionFlags = symptoms
    .filter(s => !s.positive)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const maxFlagCount = Math.max(...reactionFlags.map(r => r.count), 1)

  const formulationGaps = products.concernCoverage
    .filter(c => c.coverage < 60 && c.userPct > 10)
    .sort((a, b) => b.userPct - a.userPct)

  const productRankings = [...products.topProducts]
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)

  return (
    <div className="space-y-4 mt-4">
      {/* Ingredient Efficacy Index */}
      <InsightCard
        title="Ingredient Efficacy Index"
        subtitle="Top ingredients ranked by consumer outcome score — higher = better documented results"
        accent="clay"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Ingredient Efficacy Index"
            dataContext={{ efficacyData }}
          />
        }
      >
        {efficacyData.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--ink-3)' }}>
              <span>Ingredient</span>
              <span className="text-center">Efficacy score</span>
              <span className="text-right">In routines</span>
            </div>
            {efficacyData.map((ing, i) => (
              <div key={ing.name}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 flex items-center gap-2">
                    <span
                      className="text-[9px] font-bold w-4 text-center flex-shrink-0"
                      style={{ color: i < 3 ? 'var(--clay)' : 'var(--ink-3)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>{ing.name}</p>
                      {ing.concerns.length > 0 && (
                        <p className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
                          {ing.concerns.slice(0, 2).map(c => CONCERN_LABELS[c] ?? c).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-20 text-center">
                    <p className="text-[13px] font-semibold" style={{ color: ing.score >= 80 ? 'var(--sage)' : ing.score >= 60 ? 'var(--gold)' : 'var(--ink-2)' }}>
                      {ing.score}
                    </p>
                  </div>
                  <p className="text-[12px] font-semibold w-12 text-right tabular-nums" style={{ color: 'var(--ink-2)' }}>
                    {ing.count}
                  </p>
                </div>
                <div className="relative h-1.5 rounded-full ml-6" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${(ing.score / maxScore) * 100}%`,
                      background: ing.score >= 80 ? 'var(--sage)' : ing.score >= 60 ? 'var(--gold)' : 'var(--clay)',
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
            ))}
            {efficacyData.filter(i => i.score >= 80).length > 0 && (
              <div className="mt-3">
                <AIBadge>
                  {efficacyData.filter(i => i.score >= 80).length} ingredient{efficacyData.filter(i => i.score >= 80).length !== 1 ? 's' : ''} scoring 80+ — {efficacyData[0].name} leads with {efficacyData[0].score} and appears in {efficacyData[0].count} consumer routine{efficacyData[0].count !== 1 ? 's' : ''}.
                </AIBadge>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Ingredient efficacy data will populate once consumers submit check-ins.
          </p>
        )}
      </InsightCard>

      {/* Reaction Flags */}
      <InsightCard
        title="Reaction Flags"
        subtitle="Negative symptoms reported across consumer check-ins — formulation watchlist"
        accent="blush"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Reaction Flags"
            dataContext={{ reactionFlags }}
          />
        }
      >
        {reactionFlags.length > 0 ? (
          <div className="space-y-2.5">
            {reactionFlags.map(flag => (
              <div key={flag.symptom}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-medium capitalize" style={{ color: 'var(--ink)' }}>
                    {flag.symptom.toLowerCase().replace(/_/g, ' ')}
                  </p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--blush-light)', color: 'var(--blush)' }}
                  >
                    {flag.count} report{flag.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(flag.count / maxFlagCount) * 100}%`,
                      background: 'var(--blush)',
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-3">
              <AIBadge>
                {reactionFlags[0].symptom.toLowerCase().replace(/_/g, ' ')} is the most flagged reaction ({reactionFlags[0].count} report{reactionFlags[0].count !== 1 ? 's' : ''}).
                Cross-reference with ingredient index to identify potential formulation triggers.
              </AIBadge>
            </div>
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            No negative reaction flags in the current period. Positive signal.
          </p>
        )}
      </InsightCard>

      {/* Formulation Gaps */}
      {formulationGaps.length > 0 && (
        <InsightCard
          title="Formulation Gaps"
          subtitle="High-demand consumer concerns with insufficient product coverage"
          accent="gold"
          actions={
            <InsightButton
              brandId={brandId}
              viewName="Formulation Gaps"
              dataContext={{ formulationGaps }}
            />
          }
        >
          <div className="space-y-3">
            {formulationGaps.map(gap => (
              <div key={gap.concern} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: gap.coverage === 0 ? 'var(--blush-light)' : 'var(--gold-light)',
                        color: gap.coverage === 0 ? 'var(--blush)' : 'var(--gold)',
                      }}
                    >
                      {gap.coverage === 0 ? 'No coverage' : 'Low coverage'}
                    </span>
                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {CONCERN_LABELS[gap.concern] ?? gap.concern}
                    </p>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {gap.userPct}% consumer demand · {gap.productCount} product{gap.productCount !== 1 ? 's' : ''} ({gap.coverage}% coverage)
                  </p>
                </div>
              </div>
            ))}
            <AIBadge>
              {formulationGaps.length} formulation gap{formulationGaps.length !== 1 ? 's' : ''} identified.
              {formulationGaps[0] ? ` ${CONCERN_LABELS[formulationGaps[0].concern] ?? formulationGaps[0].concern} is the priority — ${formulationGaps[0].userPct}% consumer demand with only ${formulationGaps[0].coverage}% coverage.` : ''}
            </AIBadge>
          </div>
        </InsightCard>
      )}

      {/* Product Rankings */}
      <InsightCard
        title="Product Performance Rankings"
        subtitle="Products ranked by consumer acceptance rate — positive reactions vs total check-ins"
        accent="sage"
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Product Performance Rankings"
            dataContext={{ productRankings }}
          />
        }
      >
        {productRankings.length > 0 ? (
          <div>
            <div className="grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--ink-3)' }}>
              <span className="col-span-2">Product</span>
              <span className="text-right">Acceptance</span>
            </div>
            <div className="space-y-2">
              {productRankings.map((prod, i) => (
                <div key={prod.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border-sub)' }}>
                  <span
                    className="text-[10px] font-bold w-4 text-center flex-shrink-0"
                    style={{ color: i < 3 ? 'var(--sage)' : i >= productRankings.length - 2 ? 'var(--blush)' : 'var(--ink-3)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>{prod.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      {prod.positive}↑ · {prod.negative}↓ · {prod.used} used
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span
                      className="text-[12px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{
                        background: prod.rate >= 75 ? 'var(--sage-light)' : prod.rate >= 50 ? 'var(--gold-light)' : 'var(--blush-light)',
                        color: prod.rate >= 75 ? 'var(--sage)' : prod.rate >= 50 ? 'var(--gold)' : 'var(--blush)',
                      }}
                    >
                      {prod.rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            Product rankings will appear once consumers start using and rating products.
          </p>
        )}
      </InsightCard>
    </div>
  )
}
