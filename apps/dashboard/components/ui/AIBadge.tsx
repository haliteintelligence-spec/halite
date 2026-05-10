import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  compact?: boolean
}

export function AIBadge({ children, compact = false }: Props) {
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
        style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
      >
        <Sparkles size={9} />
        AI
      </span>
    )
  }

  return (
    <div
      className="flex gap-3 rounded-xl p-3.5"
      style={{ background: 'var(--clay-light)', borderLeft: '3px solid var(--clay)' }}
    >
      <Sparkles size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--clay)' }} />
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--clay-dim)' }}>
        {children}
      </p>
    </div>
  )
}

interface AIStatProps {
  label: string
  value: string
  insight: string
}

export function AIStat({ label, value, insight }: AIStatProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</span>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{insight}</p>
    </div>
  )
}
