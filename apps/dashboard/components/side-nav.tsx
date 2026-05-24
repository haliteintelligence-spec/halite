'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutGrid,
  Users,
  FlaskConical,
  TrendingUp,
  BarChart3,
  Sparkles,
  Package,
  BookOpen,
  LogOut,
  Settings,
  Activity,
  Link2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '',              label: 'Overview',      icon: LayoutGrid,   section: null },
  { href: '/identity',     label: 'Identity',      icon: Link2,        section: 'Intelligence' },
  { href: '/consumers',    label: 'Consumer',      icon: Users,        section: 'Intelligence' },
  { href: '/outcomes',     label: 'Outcomes',      icon: Activity,     section: 'Intelligence' },
  { href: '/products',     label: 'Products',      icon: Package,      section: 'Intelligence' },
  { href: '/ingredients',  label: 'Ingredients',   icon: FlaskConical, section: 'Intelligence' },
  { href: '/market',       label: 'Market',        icon: TrendingUp,   section: 'Intelligence' },
  { href: '/benchmarking', label: 'Benchmarking',  icon: BarChart3,    section: 'Intelligence' },
  { href: '/catalog',      label: 'Catalog',       icon: BookOpen,     section: 'Catalog' },
  { href: '/ai-lab',       label: 'AI Lab',        icon: Sparkles,     section: 'Lab' },
  { href: '/settings',     label: 'Settings',      icon: Settings,     section: 'Settings' },
]

export function SideNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/${slug}`

  const overview = nav.filter(n => !n.section)
  const intelligence = nav.filter(n => n.section === 'Intelligence')
  const catalog = nav.filter(n => n.section === 'Catalog')
  const lab = nav.filter(n => n.section === 'Lab')
  const settings = nav.filter(n => n.section === 'Settings')

  function handleLogout() {
    document.cookie = 'halite_token=; path=/; max-age=0'
    router.push(`/${slug}/login`)
  }

  function NavItem({ href, label, icon: Icon }: typeof nav[0]) {
    const to = `${base}${href}`
    const active = pathname === to || (href !== '' && pathname.startsWith(to))
    return (
      <Link
        href={to}
        className={clsx(
          'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
          active ? 'text-white' : 'text-ink-3 hover:text-white/80'
        )}
        style={active ? { background: 'var(--clay)', color: 'white' } : {}}
      >
        <Icon
          size={14}
          className={clsx('flex-shrink-0', active ? 'text-white' : 'text-ink-3 group-hover:text-white/80')}
        />
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
      </Link>
    )
  }

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: 'var(--ink)' }}
    >
      {/* Brand header */}
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">
          Halite Intelligence
        </p>
        <p className="text-sm font-semibold text-white capitalize leading-tight">{slug}</p>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        <div className="space-y-0.5">
          {overview.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div>
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2">
            Intelligence
          </p>
          <div className="space-y-0.5">
            {intelligence.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2">
            Catalog
          </p>
          <div className="space-y-0.5">
            {catalog.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2">
            Lab
          </p>
          <div className="space-y-0.5">
            {lab.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2">
            Admin
          </p>
          <div className="space-y-0.5">
            {settings.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Footer */}
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
