'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutGrid, Play, Building2, FlaskConical, Archive, LogOut, X } from 'lucide-react'
import { useState, useEffect } from 'react'

const nav = [
  { href: '/admin',             label: 'Overview',    icon: LayoutGrid },
  { href: '/admin/demos',       label: 'Demos',       icon: Play },
  { href: '/admin/brands',      label: 'Onboarded',   icon: Building2 },
  { href: '/admin/past-brands', label: 'Past Brands', icon: Archive },
  { href: '/admin/hallie-test', label: 'Hallie Test', icon: FlaskConical },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function handleToggle() { setMobileOpen(prev => !prev) }
    window.addEventListener('halite-admin-toggle-nav', handleToggle)
    return () => window.removeEventListener('halite-admin-toggle-nav', handleToggle)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function handleLogout() {
    document.cookie = 'halite_admin_token=; path=/admin; max-age=0'
    router.push('/admin/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          'flex flex-col h-screen z-50 transition-transform duration-200 w-52 flex-shrink-0',
          'fixed inset-y-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:sticky md:top-0 md:translate-x-0',
        )}
        style={{ background: 'var(--ink)' }}
      >
        <div className="relative px-5 pt-6 pb-5 border-b border-white/8">
          <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">
            Halite Intelligence
          </p>
          <p className="text-sm font-semibold text-white">Admin</p>
          <button
            className="md:hidden absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
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
                onClick={() => setMobileOpen(false)}
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
    </>
  )
}
