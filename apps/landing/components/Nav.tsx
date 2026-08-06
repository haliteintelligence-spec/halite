'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { HALLIE_URL, EXTERNAL_LINK_PROPS } from '@/lib/links'

const BRAND_LINKS = [
  { label: 'How it works', href: '/platform' },
  { label: 'The profile', href: '/#profile' },
  { label: 'Compare', href: '/#compare' },
]

const CONSUMER_LINKS = [
  { label: 'What Hallie does', href: '/hallie#what' },
  { label: 'Rewards', href: '/hallie#rewards' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  // Which audience is showing is a fact about the URL, not something the nav
  // tracks itself — /hallie is the consumer page, everything else is brand-side.
  const isConsumer = usePathname().startsWith('/hallie')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = isConsumer ? CONSUMER_LINKS : BRAND_LINKS

  // Both segments are always links to the other side's page — the "active" one
  // just points at its own page, so clicking it is a harmless no-op rather than
  // a dead control.
  const segmentBase = 'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all'
  const inactiveSegment = { background: 'transparent', color: scrolled ? '#8B6575' : 'rgba(250,246,240,0.7)' }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250, 246, 240, 0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(69, 15, 42, 0.08)' : 'none',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{ color: scrolled ? '#450F2A' : '#FAF6F0' }}
          >
            ✦
          </span>
          <span
            className="font-display text-lg font-semibold leading-none"
            style={{ color: scrolled ? '#1A0A12' : '#FAF6F0' }}
          >
            Halite
          </span>
          <span
            className="text-[10px] font-medium tracking-[0.18em] uppercase mt-0.5"
            style={{ color: scrolled ? '#8B6575' : 'rgba(250,246,240,0.7)' }}
          >
            Intelligence
          </span>
        </a>

        {/* Audience switcher — navigates between the two pages */}
        <div
          className="hidden md:flex p-[3px] rounded-full flex-shrink-0"
          style={{
            background: scrolled ? '#F2EBE0' : 'rgba(250,246,240,0.12)',
            border: scrolled ? '1px solid #E8DDD0' : '1px solid rgba(250,246,240,0.22)',
          }}
        >
          <a
            href="/"
            className={segmentBase}
            style={
              !isConsumer
                ? { background: '#450F2A', color: '#FAF6F0', boxShadow: '0 1px 3px rgba(69,15,42,0.3)' }
                : inactiveSegment
            }
            aria-current={!isConsumer ? 'page' : undefined}
          >
            For brands
          </a>
          <a
            href="/hallie"
            className={segmentBase}
            style={
              isConsumer
                ? { background: '#C17A47', color: '#2A1206', boxShadow: '0 1px 3px rgba(193,122,71,0.35)' }
                : inactiveSegment
            }
            aria-current={isConsumer ? 'page' : undefined}
          >
            For consumers
          </a>
        </div>

        {/* Desktop links */}
        <nav className="hidden lg:flex items-center gap-8">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium transition-opacity hover:opacity-70 whitespace-nowrap"
              style={{ color: scrolled ? '#4A2A38' : 'rgba(250,246,240,0.85)' }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA — swaps with the audience */}
        <div className="hidden md:flex items-center gap-3">
          {isConsumer ? (
            <a
              href={HALLIE_URL}
              {...EXTERNAL_LINK_PROPS}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90 whitespace-nowrap"
              style={{ background: '#C17A47', color: '#2A1206' }}
            >
              Open Hallie ↗
            </a>
          ) : (
            <a
              href="/#demo"
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all whitespace-nowrap"
              style={{
                background: scrolled ? '#450F2A' : 'rgba(250,246,240,0.15)',
                color: '#FAF6F0',
                border: scrolled ? 'none' : '1px solid rgba(250,246,240,0.4)',
              }}
            >
              Book a demo
            </a>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
          style={{ color: scrolled ? '#450F2A' : '#FAF6F0' }}
        >
          <div className="space-y-1.5">
            <span className="block w-5 h-0.5 bg-current rounded" />
            <span className="block w-5 h-0.5 bg-current rounded" />
          </div>
        </button>
      </div>

      {/* Mobile menu — both audiences listed rather than switched, since a phone
          menu has room to show everything and a segmented control there would
          hide half the site behind an extra tap. */}
      {open && (
        <div className="md:hidden px-6 pb-6 pt-2" style={{ background: '#FAF6F0' }}>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: '#8B6575' }}>
            For brands
          </p>
          <div className="space-y-3 mb-5">
            {BRAND_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="block text-[14px] font-medium"
                style={{ color: '#4A2A38' }}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href="/#demo"
              className="block text-[13px] font-semibold px-5 py-2.5 rounded-full text-center"
              style={{ background: '#450F2A', color: '#FAF6F0' }}
              onClick={() => setOpen(false)}
            >
              Book a demo
            </a>
          </div>

          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2.5" style={{ color: '#C17A47' }}>
            For consumers
          </p>
          <div className="space-y-3">
            {CONSUMER_LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="block text-[14px] font-medium"
                style={{ color: '#4A2A38' }}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href={HALLIE_URL}
              {...EXTERNAL_LINK_PROPS}
              className="block text-[13px] font-semibold px-5 py-2.5 rounded-full text-center"
              style={{ background: '#C17A47', color: '#2A1206' }}
              onClick={() => setOpen(false)}
            >
              Open Hallie ↗
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
