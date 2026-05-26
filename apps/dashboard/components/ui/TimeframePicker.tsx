'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, Check, Calendar } from 'lucide-react'

const PRESETS = [
  { days: 7,   label: 'Last 7 days' },
  { days: 30,  label: 'Last 30 days' },
  { days: 90,  label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
]

const COOKIE_NAME = 'halite_tf'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function saveCookie(qs: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(qs)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function readCookie(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)halite_tf=([^;]+)/)
  return m ? decodeURIComponent(m[1]!) : ''
}

export function TimeframePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const urlFrom = searchParams.get('from') ?? ''
  const urlTo = searchParams.get('to') ?? ''
  const urlDays = Number(searchParams.get('days')) || 0

  const isCustom = !!urlFrom
  // Effective days for display: URL param, or fall back to 30 for preset label
  const currentDays = urlDays || 30

  const [customFrom, setCustomFrom] = useState(urlFrom || '')
  const [customTo, setCustomTo] = useState(urlTo || todayISO())

  // On mount: if this page has no timeframe in the URL, restore the saved cookie
  useEffect(() => {
    if (urlFrom || urlDays) return
    const saved = readCookie()
    if (!saved) return
    const p = new URLSearchParams(saved)
    const params = new URLSearchParams(searchParams.toString())
    if (p.get('from')) {
      params.set('from', p.get('from')!)
      if (p.get('to')) params.set('to', p.get('to')!)
      else params.delete('to')
    } else if (p.get('days')) {
      params.set('days', p.get('days')!)
      params.delete('from')
      params.delete('to')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buttonLabel = isCustom
    ? `${fmtDate(urlFrom)} – ${urlTo ? fmtDate(urlTo) : 'Today'}`
    : (PRESETS.find(p => p.days === currentDays)?.label ?? 'Last 30 days')

  function selectPreset(days: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', String(days))
    params.delete('from')
    params.delete('to')
    saveCookie(`days=${days}`)
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
    setShowCustom(false)
  }

  function applyCustom() {
    if (!customFrom) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', customFrom)
    if (customTo) { params.set('to', customTo) } else { params.delete('to') }
    params.delete('days')
    saveCookie(`from=${customFrom}${customTo ? `&to=${customTo}` : ''}`)
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
    setShowCustom(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCustom(false)
      }
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
          border: `1px solid ${isCustom ? 'var(--clay)' : 'var(--border)'}`,
          color: isCustom ? 'var(--clay)' : 'var(--ink-3)',
        }}
      >
        {isCustom && <Calendar size={10} />}
        {buttonLabel}
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            minWidth: showCustom ? '240px' : '160px',
          }}
        >
          {PRESETS.map(opt => (
            <button
              key={opt.days}
              onClick={() => selectPreset(opt.days)}
              className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-left transition-colors hover:opacity-80"
              style={{ color: !isCustom && opt.days === currentDays ? 'var(--clay)' : 'var(--ink-2)' }}
            >
              {opt.label}
              {!isCustom && opt.days === currentDays && <Check size={11} style={{ color: 'var(--clay)' }} />}
            </button>
          ))}

          <div className="mx-3" style={{ height: '1px', background: 'var(--border)' }} />

          {!showCustom ? (
            <button
              onClick={() => {
                setShowCustom(true)
                if (!customFrom) setCustomFrom(todayISO().slice(0, 8) + '01')
                if (!customTo) setCustomTo(todayISO())
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:opacity-80"
              style={{ color: isCustom ? 'var(--clay)' : 'var(--ink-2)' }}
            >
              <Calendar size={11} />
              Custom range
              {isCustom && <Check size={11} className="ml-auto" style={{ color: 'var(--clay)' }} />}
            </button>
          ) : (
            <div className="px-3 py-3 space-y-2">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>From</p>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || todayISO()}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full text-[12px] px-2 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>To</p>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={todayISO()}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full text-[12px] px-2 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--porcelain-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCustom(false)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] transition-opacity hover:opacity-70"
                  style={{ background: 'var(--porcelain-2)', color: 'var(--ink-3)' }}
                >
                  Back
                </button>
                <button
                  onClick={applyCustom}
                  disabled={!customFrom}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'var(--clay)', color: 'white' }}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
