'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const TABS = [
  { label: 'Brand Profile', href: '' },
  { label: 'Widget',        href: '/widget' },
  { label: 'Team',          href: '/team' },
  { label: 'Integrations',  href: '/integrations' },
  { label: 'Security',      href: '/security' },
]

export function SettingsSubNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/${slug}/settings`

  return (
    <div className="flex gap-1 mb-8 border-b border-sand-2">
      {TABS.map(tab => {
        const to = `${base}${tab.href}`
        const active = tab.href === '' ? pathname === to : pathname.startsWith(to)
        return (
          <Link
            key={tab.href}
            href={to}
            className={clsx(
              'px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              active
                ? 'border-clay text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
