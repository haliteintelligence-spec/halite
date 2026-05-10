'use client'

import { useState } from 'react'

interface UnitGroup {
  unit: string
  label: string
  options: Array<{ value: string; label: string }>
}

interface Props {
  units: UnitGroup[]
  value?: string
  onConfirm: (valueMl: string) => void
}

export function UnitSelect({ units, value, onConfirm }: Props) {
  const [activeUnit, setActiveUnit] = useState(units[0]?.unit ?? 'L')
  const [selected, setSelected] = useState<string | null>(value ?? null)

  const currentGroup = units.find((u) => u.unit === activeUnit) ?? units[0]

  return (
    <div className="w-full space-y-4">
      {/* Unit tabs */}
      <div className="flex gap-2">
        {units.map((u) => {
          const active = activeUnit === u.unit
          return (
            <button
              key={u.unit}
              type="button"
              onClick={() => { setActiveUnit(u.unit); setSelected(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--text-1)' : 'var(--bg-muted)',
                color: active ? 'white' : 'var(--text-2)',
              }}
            >
              {u.unit}
            </button>
          )
        })}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {currentGroup?.options.map((opt) => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className="w-full text-left px-5 py-3.5 rounded-2xl border text-sm transition-all"
              style={{
                borderColor: active ? '#f09118' : 'var(--border)',
                background: active ? '#fef9ee' : 'white',
                color: 'var(--text-1)',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {selected && (
        <button
          onClick={() => onConfirm(selected)}
          className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--text-1)' }}
        >
          Continue
        </button>
      )}
    </div>
  )
}
