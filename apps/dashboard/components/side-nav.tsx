'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, Package, Users, BarChart2, Settings, MessageCircle } from 'lucide-react'

const nav = [
  { href: '', label: 'Overview', icon: LayoutDashboard },
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/insights', label: 'Insights', icon: BarChart2 },
  { href: '/crystal', label: 'Crystal AI', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function SideNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/${slug}`

  return (
    <aside className="w-56 bg-white border-r flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--text-3)' }}>
          Halite Intelligence
        </span>
        <p className="text-sm font-semibold mt-0.5 capitalize" style={{ color: 'var(--text-1)' }}>{slug}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const to = `${base}${href}`
          const active = pathname === to || (href !== '' && pathname.startsWith(to))
          return (
            <Link
              key={href}
              href={to}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#1c1410] text-white'
                  : 'hover:bg-[#f5f0eb]'
              )}
              style={active ? {} : { color: 'var(--text-2)' }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
        <p className="text-[11px]">Powered by Halite</p>
      </div>
    </aside>
  )
}
