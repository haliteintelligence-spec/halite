'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutGrid, Play, Building2, LogOut } from 'lucide-react'

const nav = [
  { href: '/admin',        label: 'Overview',  icon: LayoutGrid },
  { href: '/admin/demos',  label: 'Demos',     icon: Play },
  { href: '/admin/brands', label: 'Brands',    icon: Building2 },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    document.cookie = 'halite_admin_token=; path=/admin; max-age=0'
    router.push('/admin/login')
  }

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'var(--ink)' }}
    >
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">
          Halite Intelligence
        </p>
        <p className="text-sm font-semibold text-white">Admin</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
              style={active ? { background: 'var(--clay)' } : {}}
            >
              <Icon size={14} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] text-white/40 hover:text-white/70 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
