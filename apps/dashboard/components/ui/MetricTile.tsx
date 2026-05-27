import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: { delta: number; label?: string }
  sparkData?: number[]
  icon?: ReactNode
  className?: string
  href?: string
}

export function MetricTile({ label, value, sub, trend, icon, className, href }: Props) {
  const up = (trend?.delta ?? 0) >= 0

  const inner = (
    <div
      className={clsx(
        'bg-surface rounded-xl border p-4 flex flex-col gap-3',
        href && 'hover:opacity-80 transition-opacity cursor-pointer',
        className,
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--ink-3)' }}>
          {label}
        </p>
        {icon && <span style={{ color: 'var(--ink-3)' }}>{icon}</span>}
      </div>

      <div>
        <p className="text-2xl font-semibold leading-none" style={{ color: 'var(--ink)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>{sub}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{
              background: up ? 'var(--sage-light)' : 'var(--blush-light)',
              color: up ? 'var(--sage)' : 'var(--blush)',
            }}
          >
            {up ? '↑' : '↓'} {Math.abs(trend.delta).toFixed(1)}%
          </span>
          {trend.label && (
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{trend.label}</span>
          )}
        </div>
      )}

      {href && (
        <div className="flex items-center justify-end mt-auto pt-1">
          <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: 'var(--clay)' }}>
            View <ChevronRight size={11} strokeWidth={2.5} />
          </span>
        </div>
      )}
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
