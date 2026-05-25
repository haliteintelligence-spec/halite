'use client'

import { Menu } from 'lucide-react'

export function MobileNavToggle() {
  return (
    <button
      className="md:hidden fixed bottom-6 left-4 z-30 w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
      style={{ background: 'var(--ink)', color: 'white' }}
      onClick={() => window.dispatchEvent(new Event('halite-toggle-nav'))}
      aria-label="Toggle navigation"
    >
      <Menu size={16} />
    </button>
  )
}
