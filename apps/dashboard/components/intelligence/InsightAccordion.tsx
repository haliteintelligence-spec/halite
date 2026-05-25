'use client'

import { useState } from 'react'
import { TrendingUp, AlertCircle, Zap, ChevronRight } from 'lucide-react'
import type { DerivedInsight } from './AIInsightPanel'

const typeStyles = {
  opportunity: { icon: TrendingUp,  bg: 'var(--sage-light)',  color: 'var(--sage)',  label: 'Opportunity' },
  trend:       { icon: TrendingUp,  bg: 'var(--gold-light)',  color: 'var(--gold)',  label: 'Trend' },
  performance: { icon: Zap,         bg: 'var(--clay-light)',  color: 'var(--clay)',  label: 'Performance' },
  alert:       { icon: AlertCircle, bg: 'var(--blush-light)', color: 'var(--blush)', label: 'Alert' },
}

export function InsightAccordion({ insights }: { insights: DerivedInsight[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  return (
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
                  <p className="text-[12px] font-semibold text-white leading-tight">{ins.title}</p>
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
  )
}
