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
  Bot,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Telescope,
  Layers,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { InsightAccordion } from '@/components/intelligence/InsightAccordion'
import type { DerivedInsight, DerivedAction } from '@/components/intelligence/AIInsightPanel'

interface Intelligence {
  insights: DerivedInsight[]
  actions: DerivedAction[]
  score: number
  scoreLabel: string
  todaySignal: string
}

const nav = [
  { href: '',              label: 'Overview',      icon: LayoutGrid,   section: null },
  { href: '/crystal',      label: 'Halite AI',     icon: Sparkles,     section: null },
  { href: '/identity',     label: 'Identity',      icon: Link2,        section: 'Intelligence' },
  { href: '/consumers',    label: 'Consumer',      icon: Users,        section: 'Intelligence' },
  { href: '/outcomes',     label: 'Outcomes',      icon: Activity,     section: 'Intelligence' },
  { href: '/products',     label: 'Products',      icon: Package,      section: 'Intelligence' },
  { href: '/ingredients',  label: 'Ingredients',   icon: FlaskConical, section: 'Intelligence' },
  { href: '/market',       label: 'Market',        icon: TrendingUp,   section: 'Intelligence' },
  { href: '/benchmarking',              label: 'Benchmarking',  icon: BarChart3,  section: 'Intelligence' },
  { href: '/predictive',               label: 'Predictive',    icon: Telescope,  section: 'Predictive' },
  { href: '/predictive/supply-chain',  label: 'Supply Chain',  icon: Layers,     section: 'Predictive' },
  { href: '/agents',                   label: 'Agents',        icon: Bot,        section: 'Agents' },
  { href: '/catalog',      label: 'Catalog',       icon: BookOpen,     section: 'Catalog' },
  { href: '/ai-lab',       label: 'AI Lab',        icon: Zap,          section: 'Lab' },
  { href: '/settings',     label: 'Settings',      icon: Settings,     section: 'Settings' },
]

export function SideNav({
  slug,
  isDemo = false,
  demoLinkExpiresAt = null,
  intelligence = null,
}: {
  slug: string
  isDemo?: boolean
  demoLinkExpiresAt?: string | null
  intelligence?: Intelligence | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/${slug}`

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [intellOpen, setIntelOpen] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('halite-nav-collapsed')
    if (saved === 'true') setCollapsed(true)
    const savedIntel = localStorage.getItem('halite-intel-open')
    if (savedIntel === 'false') setIntelOpen(false)
  }, [])

  useEffect(() => {
    function handleToggle() { setMobileOpen(prev => !prev) }
    window.addEventListener('halite-toggle-nav', handleToggle)
    return () => window.removeEventListener('halite-toggle-nav', handleToggle)
  }, [])

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const overview      = nav.filter(n => !n.section)
  const intelNav      = nav.filter(n => n.section === 'Intelligence')
  const predictive    = nav.filter(n => n.section === 'Predictive')
  const agents        = nav.filter(n => n.section === 'Agents')
  const catalog       = nav.filter(n => n.section === 'Catalog')
  const lab           = nav.filter(n => n.section === 'Lab')
  const settings      = nav.filter(n => n.section === 'Settings')

  const daysLeft = demoLinkExpiresAt
    ? Math.ceil((new Date(demoLinkExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  function handleLogout() {
    document.cookie = 'halite_token=; path=/; max-age=0'
    router.push(`/${slug}/login`)
  }

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('halite-nav-collapsed', String(next))
  }

  function NavItem({ href, label, icon: Icon }: typeof nav[0]) {
    const to = `${base}${href}`
    const active = pathname === to || (href !== '' && pathname.startsWith(to))
    return (
      <Link
        href={to}
        className={clsx(
          'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
          collapsed ? 'md:justify-center md:px-0' : '',
          active ? 'text-white' : 'text-ink-3 hover:text-white/80'
        )}
        style={active ? { background: 'var(--clay)', color: 'white' } : {}}
        onClick={() => setMobileOpen(false)}
      >
        <Icon
          size={14}
          className={clsx('flex-shrink-0', active ? 'text-white' : 'text-ink-3 group-hover:text-white/80')}
        />
        <span className={clsx(collapsed && 'md:hidden')}>{label}</span>
        {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
        {/* Tooltip in collapsed desktop mode */}
        {collapsed && (
          <span className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 text-[11px] bg-zinc-900 text-white rounded whitespace-nowrap pointer-events-none z-[100] opacity-0 group-hover:opacity-100 transition-opacity">
            {label}
          </span>
        )}
      </Link>
    )
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
          'flex flex-col h-screen z-50 transition-[transform,width] duration-200',
          // Mobile: fixed overlay, slides in from left
          'fixed inset-y-0 left-0 w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: sticky flex item, always visible, collapsible width
          'md:sticky md:top-0 md:translate-x-0 md:flex-shrink-0',
          collapsed ? 'md:w-14' : 'md:w-52',
        )}
        style={{ background: 'var(--ink)' }}
      >
        {/* Brand header */}
        <div className={clsx(
          'relative border-b border-white/8',
          collapsed ? 'md:py-4 md:flex md:justify-center px-5 pt-6 pb-5' : 'px-5 pt-6 pb-5'
        )}>
          <div className={clsx(collapsed && 'md:hidden')}>
            <p className="text-[9px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">
              Halite Intelligence
            </p>
            <p className="text-sm font-semibold text-white capitalize leading-tight">{slug}</p>
            {isDemo && (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--clay)', color: 'white' }}
                >
                  DEMO
                </span>
                {daysLeft !== null && (
                  <span className="flex items-center gap-1 text-[9px] text-white/40">
                    <Clock size={9} />
                    {daysLeft > 0 ? `${daysLeft}d left` : 'expired'}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Collapsed desktop: logo icon */}
          {collapsed && (
            <div className="hidden md:flex justify-center">
              <Sparkles size={16} className="text-white/60" />
            </div>
          )}
          {/* Mobile close button */}
          <button
            className="md:hidden absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className={clsx(
          'flex-1 py-4 overflow-y-auto space-y-5',
          collapsed ? 'md:px-2 px-3' : 'px-3'
        )}>
          <div className="space-y-0.5">
            {overview.map(item => <NavItem key={item.href} {...item} />)}
          </div>

          <div>
            <p className={clsx(
              'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2',
              collapsed && 'md:hidden'
            )}>
              Intelligence
            </p>
            <div className="space-y-0.5">
              {intelNav.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          <div>
            <p className={clsx(
              'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2',
              collapsed && 'md:hidden'
            )}>
              Predictive
            </p>
            <div className="space-y-0.5">
              {predictive.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          <div>
            <div className={clsx(
              'flex items-center mb-2',
              collapsed ? 'md:justify-center md:px-0 px-3 justify-between' : 'justify-between px-3'
            )}>
              <p className={clsx(
                'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30',
                collapsed && 'md:hidden'
              )}>
                Agents
              </p>
              <Link
                href={`${base}/agents/new`}
                className={clsx(
                  'text-white/30 hover:text-white/60 transition-colors',
                  collapsed && 'md:hidden'
                )}
                title="New agent"
              >
                <Plus size={10} />
              </Link>
            </div>
            <div className="space-y-0.5">
              {agents.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          <div>
            <p className={clsx(
              'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2',
              collapsed && 'md:hidden'
            )}>
              Catalog
            </p>
            <div className="space-y-0.5">
              {catalog.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          <div>
            <p className={clsx(
              'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2',
              collapsed && 'md:hidden'
            )}>
              Lab
            </p>
            <div className="space-y-0.5">
              {lab.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          <div>
            <p className={clsx(
              'text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 px-3 mb-2',
              collapsed && 'md:hidden'
            )}>
              Admin
            </p>
            <div className="space-y-0.5">
              {settings.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          {/* Intelligence section — hidden in icon-only collapsed mode */}
          {intelligence && (
            <div className={clsx(collapsed && 'md:hidden')}>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }}>
                <button
                  onClick={() => {
                    const next = !intellOpen
                    setIntelOpen(next)
                    localStorage.setItem('halite-intel-open', String(next))
                  }}
                  className="flex items-center justify-between w-full px-3 mb-2"
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={9} style={{ color: 'var(--clay)' }} />
                    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Intelligence
                    </p>
                  </div>
                  <ChevronRight
                    size={10}
                    className={clsx('transition-transform duration-150', intellOpen ? 'rotate-90' : '')}
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                  />
                </button>

                {intellOpen && (
                  <>
                    <InsightAccordion insights={intelligence.insights} />

                    <div className="mx-3 my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Recommended actions */}
                    <div className="px-3 pb-3">
                      <p className="text-[8px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.22)' }}>
                        Recommended Actions
                      </p>
                      <div className="space-y-1.5">
                        {intelligence.actions.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                          >
                            <span
                              className="text-[8px] font-bold w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                            >
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>{a.label}</p>
                              <span
                                className="inline-block text-[8px] px-1 py-0.5 rounded mt-0.5"
                                style={{
                                  background: a.urgency === 'Critical' ? 'rgba(239,68,68,0.18)' : a.urgency === 'High' ? 'rgba(251,191,36,0.18)' : 'rgba(107,158,120,0.18)',
                                  color: a.urgency === 'Critical' ? '#f87171' : a.urgency === 'High' ? '#fbbf24' : '#6b9e78',
                                }}
                              >
                                {a.urgency}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Intelligence score */}
                    <div
                      className="mx-3 mb-2 p-2.5 rounded-xl"
                      style={{ background: 'rgba(191,122,90,0.10)', border: '1px solid rgba(191,122,90,0.18)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles size={9} style={{ color: 'var(--clay)' }} />
                        <p className="text-[10px] font-semibold" style={{ color: 'var(--clay)' }}>
                          {intelligence.score} · {intelligence.scoreLabel}
                        </p>
                      </div>
                      <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.42)' }}>
                        {intelligence.todaySignal}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={clsx(
          'border-t border-white/8 py-4',
          collapsed ? 'md:px-2 px-3' : 'px-3'
        )}>
          <button
            onClick={handleLogout}
            className={clsx(
              'group relative flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] text-white/40 hover:text-white/70 transition-colors',
              collapsed && 'md:justify-center md:px-0'
            )}
          >
            <LogOut size={14} />
            <span className={clsx(collapsed && 'md:hidden')}>Sign out</span>
            {collapsed && (
              <span className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 text-[11px] bg-zinc-900 text-white rounded whitespace-nowrap pointer-events-none z-[100] opacity-0 group-hover:opacity-100 transition-opacity">
                Sign out
              </span>
            )}
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex items-center justify-center w-full mt-2 py-1.5 text-white/20 hover:text-white/50 transition-colors rounded-lg hover:bg-white/5"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>
    </>
  )
}
