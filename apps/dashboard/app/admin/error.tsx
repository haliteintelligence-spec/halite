'use client'

import { useEffect } from 'react'
import { RefreshCw, Home } from 'lucide-react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin dashboard error:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--ink)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--clay)' }}>
          Halite Intelligence
        </p>
        <h1 className="text-xl font-semibold font-display mb-2" style={{ color: 'var(--ink)' }}>
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
          This page hit an unexpected error. You can try again, or head back to the overview.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--clay)' }}
          >
            <RefreshCw size={13} /> Try again
          </button>
          <a
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            <Home size={13} /> Overview
          </a>
        </div>
      </div>
    </div>
  )
}
