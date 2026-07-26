'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface Props {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  formatOption?: (value: string) => string
}

// A dropdown checkbox panel for filtering by several values of the same
// field at once (e.g. more than one category) — the button shows a live
// count of how many are checked, and clears itself with one click.
export function MultiSelectFilter({ label, options, selected, onChange, formatOption }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const fmt = formatOption ?? ((v: string) => v)
  const active = selected.length > 0

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap"
        style={{
          background: active ? 'var(--clay-light)' : 'var(--surface)',
          border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
          color: active ? 'var(--clay)' : 'var(--ink)',
        }}
      >
        {label}{active ? ` (${selected.length})` : ''}
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 rounded-xl shadow-lg py-1.5 max-h-64 overflow-y-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '200px' }}
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--ink-3)' }}>No options</p>
          ) : options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-black/[0.03] capitalize"
              style={{ color: 'var(--ink)' }}
            >
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {fmt(opt)}
            </label>
          ))}
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center gap-1 text-left px-3 py-1.5 mt-1 text-[11px]"
              style={{ color: 'var(--ink-3)', borderTop: '1px solid var(--border)' }}
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
