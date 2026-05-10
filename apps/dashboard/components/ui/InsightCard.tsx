import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  accent?: 'clay' | 'sage' | 'gold' | 'blush' | 'none'
  actions?: ReactNode
}

const ACCENTS = {
  clay:  'var(--clay)',
  sage:  'var(--sage)',
  gold:  'var(--gold)',
  blush: 'var(--blush)',
  none:  'transparent',
}

export function InsightCard({ title, subtitle, children, className, accent = 'none', actions }: Props) {
  return (
    <div
      className={clsx('bg-surface rounded-2xl border flex flex-col overflow-hidden', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      {accent !== 'none' && (
        <div className="h-0.5 w-full" style={{ background: ACCENTS[accent] }} />
      )}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</h3>
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className="px-5 pb-5 flex-1">{children}</div>
    </div>
  )
}
