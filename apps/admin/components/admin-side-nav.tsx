'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, Store, BarChart2, MessageCircle, Settings } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/brands', label: 'Brands', icon: Store },
  { href: '/insights', label: 'Insights', icon: BarChart2 },
  { href: '/crystal', label: 'Crystal AI', icon: MessageCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AdminSideNav() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-white border-r flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--text-3)' }}>
          Halite Intelligence
        </span>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-[#1c1410] text-white' : 'hover:bg-[#f5f0eb]'
              )}
              style={active ? {} : { color: 'var(--text-2)' }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
