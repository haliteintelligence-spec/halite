import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * The header every brand-dashboard page shares.
 *
 * `related` is not decoration: these pages describe one loop — a consumer
 * permits access, the catalog is ranked against their profile, what happens
 * next is reported back, and that outcome travels with them. A page that
 * shows one stage should say where the next one lives, or the dashboard
 * reads as a pile of unrelated reports.
 */
export interface RelatedLink {
  href: string
  label: string
}

interface Props {
  eyebrow: string
  title: string
  subtitle?: string
  related?: RelatedLink[]
  actions?: ReactNode
  live?: boolean
}

export function PageHeader({ eyebrow, title, subtitle, related, actions, live }: Props) {
  return (
    <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          {eyebrow}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{title}</h1>
          {live && (
            <span
              className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{ background: 'var(--sage)' }}
              title="Live data"
            />
          )}
        </div>
        {subtitle && (
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--ink-3)' }}>{subtitle}</p>
        )}
        {related && related.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
            {related.map(r => (
              <Link
                key={r.href}
                href={r.href}
                className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
                style={{ color: 'var(--clay)' }}
              >
                {r.label}
                <ArrowRight size={11} strokeWidth={2.5} />
              </Link>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  )
}
