'use client'

import { Sparkles, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightCard } from '@/components/ui/InsightCard'
import { use } from 'react'

const analyses = [
  {
    title: 'Catalogue-Consumer Alignment Report',
    date: 'Today, 09:14',
    summary: 'Your catalogue addresses 61% of expressed consumer concerns. The largest gap is hyperpigmentation treatment for Fitzpatrick III–VI consumers, who represent 50% of your active base.',
    tags: ['Catalogue', 'Consumer', 'Gap Analysis'],
    status: 'complete',
  },
  {
    title: 'Recommendation Engine Performance Audit',
    date: 'Yesterday, 15:32',
    summary: 'The engine performs strongest on serums (+82% acceptance) and weakest on treatments (+52%). Adding ingredient-concern tagging to treatments could improve acceptance by an estimated 8–12%.',
    tags: ['Products', 'Performance'],
    status: 'complete',
  },
  {
    title: 'Market Trend × Your Positioning',
    date: '2 days ago, 11:08',
    summary: 'You have strong alignment with the barrier repair trend (ceramides, centella) but low alignment with the microbiome skincare trend (no probiotic/prebiotic products). This represents a whitespace opportunity.',
    tags: ['Market', 'Trends'],
    status: 'complete',
  },
]

const actions = [
  { icon: AlertCircle, label: 'Add azelaic acid product', urgency: 'Critical', module: 'Catalogue' },
  { icon: TrendingUp,  label: 'Launch barrier repair bundle', urgency: 'High', module: 'Marketing' },
  { icon: Zap,         label: 'Tag products with concerns', urgency: 'Medium', module: 'Products' },
  { icon: Sparkles,    label: 'Expand SPF for deeper tones', urgency: 'High', module: 'Catalogue' },
]

interface Props { params: Promise<{ slug: string }> }

export default function AILabPage({ params }: Props) {
  const { slug } = use(params)

  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Lab
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>AI Lab</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Halite AI analyses, cross-module insights & strategic recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Analysis Feed */}
        <div className="xl:col-span-2 space-y-4">
          <InsightCard title="AI Analyses" subtitle="Cross-module intelligence reports" accent="clay">
            <div className="space-y-4">
              {analyses.map((a, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl space-y-2"
                  style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border-sub)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{a.title}</p>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ink-3)' }}>{a.date}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{a.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags.map(t => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </InsightCard>
        </div>

        {/* Action Queue */}
        <div className="space-y-4">
          <InsightCard title="Action Queue" subtitle="AI-prioritised next steps" accent="clay">
            <div className="space-y-2">
              {actions.map((a, i) => {
                const Icon = a.icon
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--porcelain-2)' }}
                  >
                    <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--clay)' }} />
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: 'var(--ink-2)' }}>{a.label}</p>
                      <div className="flex gap-2 mt-1">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: a.urgency === 'Critical' ? 'var(--blush-light)' : a.urgency === 'High' ? 'var(--gold-light)' : 'var(--sage-light)',
                            color: a.urgency === 'Critical' ? 'var(--blush)' : a.urgency === 'High' ? 'var(--gold)' : 'var(--sage)',
                          }}
                        >
                          {a.urgency}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{a.module}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </InsightCard>

          <InsightCard title="Platform Intelligence Score" accent="gold">
            <div className="flex flex-col items-center py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-semibold"
                style={{ background: 'var(--clay-light)', color: 'var(--clay)' }}
              >
                72
              </div>
              <p className="text-[12px] mt-3 font-medium" style={{ color: 'var(--ink-2)' }}>Good</p>
              <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--ink-3)' }}>
                Top 22nd percentile vs beauty brands on Halite
              </p>
            </div>
          </InsightCard>
        </div>
      </div>
    </div>
  )
}
