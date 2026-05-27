'use client'

import { Menu } from 'lucide-react'

export function AdminMobileHeader() {
  return (
    <header
      className="md:hidden flex-shrink-0 flex items-center gap-3 px-4 h-12 z-20"
      style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={() => window.dispatchEvent(new Event('halite-admin-toggle-nav'))}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
        aria-label="Open navigation"
      >
        <Menu size={15} />
      </button>
      <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Halite Admin</span>
    </header>
  )
}
