'use client'

import { Sparkles, AlertCircle, TrendingUp, ChevronRight, Zap } from 'lucide-react'
import { useState } from 'react'

const insights = [
  {
    type: 'opportunity' as const,
    title: 'Azelaic Acid gap',
    body: '312 consumers mention hyperpigmentation + acne — you have zero azelaic acid products. Estimated monthly revenue opportunity: £4,200.',
    priority: 'high',
    module: 'Ingredients',
  },
  {
    type: 'trend' as const,
    title: 'Barrier repair surge',
    body: '"Barrier repair" searches up 847% YoY. Your ceramide + centella products are positioned correctly — consider a dedicated routine bundle.',
    priority: 'medium',
    module: 'Market',
  },
  {
    type: 'performance' as const,
    title: 'Monk Type III–IV over-index',
    body: 'Your MST 3–4 consumers check in 4.5× more than MST 1–2. They want targeted hyperpigmentation routines — your current SPF range lacks UV filter diversity.',
    priority: 'medium',
    module: 'Consumer',
  },
  {
    type: 'alert' as const,
    title: 'Catalogue completeness: 43%',
    body: 'You rank below industry median (67%) on catalogue completeness. The top gap categories are treatments and SPF.',
    priority: 'high',
    module: 'Benchmarking',
  },
]

const recommendations = [
  { action: 'Add azelaic acid serum to catalogue', impact: 'High', effort: 'Low' },
  { action: 'Create barrier repair routine bundle', impact: 'Med', effort: 'Low' },
  { action: 'Expand SPF range for deeper tones', impact: 'High', effort: 'Med' },
  { action: 'Launch hyperpigmentation quiz branch', impact: 'High', effort: 'Med' },
]

const typeStyles = {
  opportunity: { icon: TrendingUp,    bg: 'var(--sage-light)',  color: 'var(--sage)',     label: 'Opportunity' },
  trend:       { icon: TrendingUp,    bg: 'var(--gold-light)',  color: 'var(--gold)',     label: 'Trend' },
  performance: { icon: Zap,           bg: 'var(--clay-light)',  color: 'var(--clay)',     label: 'Performance' },
  alert:       { icon: AlertCircle,   bg: 'var(--blush-light)', color: 'var(--blush)',    label: 'Alert' },
}

export function AIInsightPanel() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden"
      style={{ background: 'var(--ink)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} style={{ color: 'var(--clay)' }} />
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: 'var(--clay)' }}>
            Halite AI
          </p>
        </div>
        <p className="text-sm font-semibold text-white">Intelligence Layer</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          4 active insights · updated now
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Insights */}
        <div className="px-3 py-3 space-y-2">
          {insights.map((ins, i) => {
            const style = typeStyles[ins.type]
            const Icon = style.icon
            const isOpen = activeIdx === i

            return (
              <button
                key={i}
                onClick={() => setActiveIdx(isOpen ? null : i)}
                className="w-full text-left rounded-xl p-3 transition-all"
                style={{
                  background: isOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: style.bg }}
                  >
                    <Icon size={10} style={{ color: style.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[12px] font-semibold text-white leading-tight">
                        {ins.title}
                      </p>
                      <ChevronRight
                        size={12}
                        className="flex-shrink-0 transition-transform"
                        style={{
                          color: 'rgba(255,255,255,0.3)',
                          transform: isOpen ? 'rotate(90deg)' : 'none',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {ins.module}
                      </span>
                    </div>
                    {isOpen && (
                      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {ins.body}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Recommended Actions */}
        <div className="px-3 py-3">
          <p className="text-[9px] font-semibold tracking-[0.16em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Recommended Actions
          </p>
          <div className="space-y-1.5">
            {recommendations.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span
                  className="text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/80 leading-snug">{r.action}</p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: r.impact === 'High' ? 'rgba(107,158,120,0.2)' : 'rgba(255,255,255,0.06)',
                        color: r.impact === 'High' ? 'var(--sage)' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {r.impact} impact
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
                    >
                      {r.effort} effort
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Pulse */}
        <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: 'rgba(191,122,90,0.12)', border: '1px solid rgba(191,122,90,0.2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={11} style={{ color: 'var(--clay)' }} />
            <p className="text-[10px] font-semibold" style={{ color: 'var(--clay)' }}>Today's signal</p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Your brand is positioned in the top 22nd percentile for consumer engagement.
            Closing the catalogue gap could push you into the top 10th within 90 days.
          </p>
        </div>
      </div>
    </aside>
  )
}
