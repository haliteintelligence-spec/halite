'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { FlaskConical } from 'lucide-react'

const trending = [
  { name: 'Niacinamide',       score: 94, trend: +18, concern: 'Hyperpigmentation, Pores' },
  { name: 'Hyaluronic Acid',   score: 91, trend: +9,  concern: 'Dryness, Plumping' },
  { name: 'Vitamin C (L-AA)',  score: 87, trend: +24, concern: 'Brightening, Antioxidant' },
  { name: 'Retinol 0.3%',      score: 83, trend: +31, concern: 'Anti-aging, Texture' },
  { name: 'Centella Asiatica', score: 79, trend: +42, concern: 'Sensitivity, Barrier' },
  { name: 'Azelaic Acid',      score: 74, trend: +67, concern: 'Hyperpigmentation, Acne' },
  { name: 'Ceramides',         score: 72, trend: +14, concern: 'Barrier repair, Dryness' },
  { name: 'Peptides',          score: 68, trend: +22, concern: 'Anti-aging, Firming' },
]

const gaps = [
  { ingredient: 'Azelaic Acid',    mentions: 312, catalogCoverage: 0,  severity: 'high' },
  { ingredient: 'Tranexamic Acid', mentions: 187, catalogCoverage: 1,  severity: 'high' },
  { ingredient: 'Bakuchiol',       mentions: 143, catalogCoverage: 2,  severity: 'medium' },
  { ingredient: 'Polyglutamic Acid', mentions: 98, catalogCoverage: 0, severity: 'medium' },
]

const efficacy = [
  { concern: 'Hyperpigmentation', best: 'Vitamin C + Niacinamide', coverage: 78 },
  { concern: 'Barrier Repair',    best: 'Ceramides + Centella',     coverage: 62 },
  { concern: 'Anti-aging',        best: 'Retinol + Peptides',       coverage: 71 },
  { concern: 'Acne',              best: 'Niacinamide + BHA',        coverage: 55 },
  { concern: 'Dryness',           best: 'HA + Ceramides',           coverage: 84 },
]

export function IngredientLab() {
  return (
    <div className="space-y-4">
      {/* Trending Ingredients */}
      <InsightCard
        title="Ingredient Intelligence Index"
        subtitle="Demand signal × your catalogue coverage"
        accent="clay"
      >
        <div className="space-y-2.5">
          {trending.map(ing => (
            <div key={ing.name} className="flex items-center gap-3">
              <div className="w-32 flex-shrink-0">
                <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>
                  {ing.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
                  {ing.concern}
                </p>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${ing.score}%`, background: 'var(--clay)' }}
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold w-6 text-right" style={{ color: 'var(--clay-dim)' }}>
                {ing.score}
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums w-12 text-right"
                style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
              >
                ↑{ing.trend}%
              </span>
            </div>
          ))}
        </div>
      </InsightCard>

      {/* Coverage Gaps */}
      <InsightCard
        title="Catalogue Gap Analysis"
        subtitle="High-demand ingredients missing from your catalogue"
        accent="blush"
      >
        <div className="space-y-2">
          {gaps.map(g => (
            <div
              key={g.ingredient}
              className="flex items-center justify-between gap-3 p-3 rounded-xl"
              style={{ background: g.severity === 'high' ? 'var(--blush-light)' : 'var(--porcelain-2)' }}
            >
              <div className="flex items-center gap-2.5">
                <FlaskConical
                  size={13}
                  style={{ color: g.severity === 'high' ? 'var(--blush)' : 'var(--ink-3)' }}
                />
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>
                    {g.ingredient}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                    {g.mentions} consumer mentions · {g.catalogCoverage} product{g.catalogCoverage !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: g.severity === 'high' ? 'var(--blush)' : 'var(--gold)',
                  color: 'white',
                }}
              >
                {g.severity}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <AIBadge>
            Azelaic Acid has 312 consumer mentions but zero catalogue coverage. Given your
            Fitzpatrick III–IV skew and hyperpigmentation prevalence, this is a high-priority gap.
          </AIBadge>
        </div>
      </InsightCard>

      {/* Concern → Ingredient Efficacy */}
      <InsightCard title="Concern Coverage Map" subtitle="How well your catalogue addresses each concern">
        <div className="space-y-3">
          {efficacy.map(e => (
            <div key={e.concern} className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--ink-2)' }}>{e.concern}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{e.best}</span>
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                    {e.coverage}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--porcelain-2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${e.coverage}%`,
                    background: e.coverage >= 75 ? 'var(--sage)' : e.coverage >= 60 ? 'var(--gold)' : 'var(--blush)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </InsightCard>
    </div>
  )
}
