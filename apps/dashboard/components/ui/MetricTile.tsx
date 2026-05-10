import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: { delta: number; label?: string }
  sparkData?: number[]
  icon?: ReactNode
  className?: string
}

export function MetricTile({ label, value, sub, trend, icon, className }: Props) {
  const up = (trend?.delta ?? 0) >= 0

  return (
    <div
      className={clsx('bg-surface rounded-xl border p-4 flex flex-col gap-3', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-[10px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: 'var(--ink-3)' }}
        >
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
    </div>
  )
}
