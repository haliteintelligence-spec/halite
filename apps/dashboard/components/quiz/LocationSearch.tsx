'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface LocationSuggestion {
  label: string
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  timezone: string
  currency: string
}

interface LocationData {
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  timezone: string
  currency: string
}

interface ValidatedLocation {
  location: LocationData
  climateTag: string
  climateSnapshot: unknown
  displayName: string
}

interface Props {
  apiUrl: string
  initialValue?: LocationData
  onConfirm: (location: LocationData, climateTag: string, climateSnapshot: unknown) => void
}

export function LocationSearch({ apiUrl, initialValue, onConfirm }: Props) {
  const [query, setQuery] = useState(
    initialValue ? `${initialValue.city}, ${initialValue.country}` : ''
  )
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<LocationData | null>(initialValue ?? null)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.length < 2) { setSuggestions([]); setOpen(false); return }
      try {
        const res = await fetch(`${apiUrl}/quiz/location/suggest?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const { suggestions: s } = (await res.json()) as { suggestions: LocationSuggestion[] }
        setSuggestions(s)
        setOpen(s.length > 0)
      } catch { /* silent */ }
    },
    [apiUrl]
  )

  function handleInput(value: string) {
    setQuery(value)
    setSelected(null)
    setError(null)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  async function handleSelect(s: LocationSuggestion) {
    setQuery(s.label)
    setOpen(false)
    setSuggestions([])
    setValidating(true)
    setError(null)

    try {
      const res = await fetch(`${apiUrl}/quiz/location/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: s.city, country: s.country, countryCode: s.countryCode,
          lat: s.lat, lng: s.lng, timezone: s.timezone, currency: s.currency,
        }),
      })
      if (!res.ok) throw new Error('Could not validate location')
      const data = (await res.json()) as ValidatedLocation
      setSelected(data.location)
      setQuery(data.displayName)
    } catch {
      setError('Could not load climate data. Try another city.')
      setSelected(null)
    } finally {
      setValidating(false)
    }
  }

  function handleConfirm() {
    if (!selected) return
    setValidating(true)
    fetch(`${apiUrl}/quiz/location/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
      .then((r) => r.json())
      .then((data: ValidatedLocation) => onConfirm(data.location, data.climateTag, data.climateSnapshot))
      .catch(() => setError('Could not confirm location. Please try again.'))
      .finally(() => setValidating(false))
  }

  return (
    <div ref={containerRef} className="w-full space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="e.g. Lagos, London, NY, LOS, NG"
          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
          style={{
            border: '1px solid var(--border)',
            background: 'white',
            color: 'var(--text-1)',
          }}
          autoComplete="off"
        />
        {validating && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg overflow-hidden border"
            style={{ borderColor: 'var(--border)' }}
          >
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-[#f5f0eb] transition-colors"
                  style={{ borderColor: 'var(--border-sub)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--text-1)' }}>{s.city}</span>
                  <span className="ml-1.5" style={{ color: 'var(--text-3)' }}>{s.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {selected && !validating && (
        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--text-1)' }}
        >
          Confirm — {query}
        </button>
      )}
    </div>
  )
}
