'use client'

import { Menu, Sparkles } from 'lucide-react'

export function MobileNavToggle() {
  return (
    <header
      className="md:hidden flex-shrink-0 flex items-center gap-3 px-4 h-12 z-20"
      style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        onClick={() => window.dispatchEvent(new Event('halite-toggle-nav'))}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
        style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
        aria-label="Open navigation"
      >
        <Menu size={15} />
      </button>
      <div className="flex items-center gap-2">
        <Sparkles size={11} style={{ color: 'var(--clay)' }} />
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Halite Intelligence</span>
      </div>
    </header>
  )
}
