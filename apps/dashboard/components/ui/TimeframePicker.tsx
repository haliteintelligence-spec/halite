'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'

const OPTIONS = [
  { days: 7,   label: 'Last 7 days' },
  { days: 30,  label: 'Last 30 days' },
  { days: 90,  label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
]

export function TimeframePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentDays = Number(searchParams.get('days')) || 30
  const current = OPTIONS.find(o => o.days === currentDays) ?? OPTIONS[1]!

  function select(days: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', String(days))
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--ink-3)',
        }}
      >
        {current.label}
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-lg overflow-hidden min-w-[148px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => select(opt.days)}
              className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-left transition-colors hover:opacity-80"
              style={{ color: opt.days === currentDays ? 'var(--clay)' : 'var(--ink-2)' }}
            >
              {opt.label}
              {opt.days === currentDays && <Check size={11} style={{ color: 'var(--clay)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
