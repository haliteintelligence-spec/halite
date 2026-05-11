'use client'

import { useEffect, useState } from 'react'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { label: 'How it works', href: '#how' },
    { label: 'Features', href: '#features' },
    { label: 'Compare', href: '#compare' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250, 246, 240, 0.96)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(69, 15, 42, 0.08)' : 'none',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
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

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: scrolled ? '#4A2A38' : 'rgba(250,246,240,0.85)' }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#demo"
            className="text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all"
            style={{
              background: scrolled ? '#450F2A' : 'rgba(250,246,240,0.15)',
              color: '#FAF6F0',
              border: scrolled ? 'none' : '1px solid rgba(250,246,240,0.4)',
            }}
          >
            Book a demo
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          style={{ color: scrolled ? '#450F2A' : '#FAF6F0' }}
        >
          <div className="space-y-1.5">
            <span className="block w-5 h-0.5 bg-current rounded" />
            <span className="block w-5 h-0.5 bg-current rounded" />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 pb-6 pt-2 space-y-3" style={{ background: '#FAF6F0' }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="block text-[14px] font-medium py-1"
              style={{ color: '#4A2A38' }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#demo"
            className="block text-[13px] font-semibold px-5 py-2.5 rounded-full text-center mt-2"
            style={{ background: '#450F2A', color: '#FAF6F0' }}
            onClick={() => setOpen(false)}
          >
            Book a demo
          </a>
        </div>
      )}
    </header>
  )
}
