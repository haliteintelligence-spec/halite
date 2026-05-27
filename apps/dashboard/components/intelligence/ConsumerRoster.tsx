'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, ChevronRight, Loader2, SlidersHorizontal, X } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const SKIN_TYPES = ['DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE']
const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combo', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
}

const CONCERNS = [
  'ACNE', 'HYPERPIGMENTATION', 'AGING', 'SENSITIVITY', 'DRYNESS',
  'OILINESS', 'REDNESS', 'DULLNESS', 'UNEVEN_TEXTURE', 'DARK_CIRCLES', 'PORES', 'DEHYDRATION',
]
const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne', HYPERPIGMENTATION: 'Hyperpigmentation', AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity', DRYNESS: 'Dryness', OILINESS: 'Oiliness',
  REDNESS: 'Redness', DULLNESS: 'Dullness', UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles', PORES: 'Pores', DEHYDRATION: 'Dehydration',
}

const MIN_CHECKIN_OPTIONS = [
  { value: '0', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '3', label: '3+' },
  { value: '5', label: '5+' },
  { value: '10', label: '10+' },
]

interface Consumer {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  createdAt: string
  skinType: string | null
  skinConcerns: string[]
  ageRange: string | null
  monkSkinTone: number | null
  checkInCount: number
  lastCheckInDate: string | null
  lastSkinRating: number | null
}

function getToken() {
  if (typeof document === 'undefined') return null
  return document.cookie.match(/halite_token=([^;]+)/)?.[1] ?? null
}

function getBrandId() {
  const token = getToken()
  if (!token) return null
  try { return (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId }
  catch { return null }
}

function displayName(c: Consumer) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return n || c.email || 'Anonymous'
}

const SYMPTOM_LABELS: Record<string, string> = {
  BREAKOUT: 'Breakouts', DRYNESS: 'Dryness', REDNESS: 'Redness',
  IRRITATION: 'Irritation', PURGING: 'Purging', OILINESS: 'Oiliness',
  DULLNESS: 'Dullness', HYPERPIGMENTATION_FADING: 'Pigmentation fading',
  IMPROVEMENT: 'Improving', GLOW: 'Glowing', HYDRATED: 'Hydrated',
  TEXTURE_SMOOTH: 'Smooth texture',
}

export function ConsumerRoster({ brandId, initialSymptom, initialConcern }: { brandId: string; initialSymptom?: string; initialConcern?: string }) {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  const [consumers, setConsumers] = useState<Consumer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(!!(initialSymptom ?? initialConcern))

  const [search, setSearch] = useState('')
  const [skinType, setSkinType] = useState('')
  const [concern, setConcern] = useState(initialConcern ?? '')
  const [symptom, setSymptom] = useState(initialSymptom ?? '')
  const [minCheckIns, setMinCheckIns] = useState('0')
  const [page, setPage] = useState(1)

  const limit = 25

  const fetchConsumers = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (skinType) params.set('skinType', skinType)
      if (concern) params.set('concern', concern)
      if (symptom) params.set('symptom', symptom)
      if (minCheckIns !== '0') params.set('minCheckIns', minCheckIns)

      const res = await fetch(`${API_URL}/brands/${brandId}/consumers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json() as { consumers: Consumer[]; total: number }
        setConsumers(data.consumers)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [brandId, search, skinType, concern, symptom, minCheckIns, page])

  useEffect(() => { fetchConsumers() }, [fetchConsumers])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, skinType, concern, symptom, minCheckIns])

  const activeFilterCount = [skinType, concern, symptom, minCheckIns !== '0'].filter(Boolean).length
  const totalPages = Math.ceil(total / limit)

  return (
    <div
      className="rounded-xl overflow-hidden mt-4"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header + filters */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[11px] font-semibold tracking-wide uppercase flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
            Consumer Roster
          </p>
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>({total.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="pl-7 pr-3 py-1.5 rounded-lg text-[12px] outline-none w-48"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </div>
          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{
              background: filtersOpen || activeFilterCount > 0 ? 'var(--clay)' : 'var(--surface)',
              color: filtersOpen || activeFilterCount > 0 ? 'white' : 'var(--ink-3)',
              border: `1px solid ${filtersOpen || activeFilterCount > 0 ? 'var(--clay)' : 'var(--border)'}`,
            }}
          >
            <SlidersHorizontal size={11} />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {filtersOpen && (
        <div
          className="px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          {/* Skin type */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Skin type</span>
            <select
              value={skinType}
              onChange={e => setSkinType(e.target.value)}
              className="px-2 py-1 rounded-lg text-[11px] outline-none"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              <option value="">All</option>
              {SKIN_TYPES.map(t => <option key={t} value={t}>{SKIN_TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          {/* Concern */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Concern</span>
            <select
              value={concern}
              onChange={e => setConcern(e.target.value)}
              className="px-2 py-1 rounded-lg text-[11px] outline-none"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              <option value="">All</option>
              {CONCERNS.map(c => <option key={c} value={c}>{CONCERN_LABELS[c]}</option>)}
            </select>
          </div>

          {/* Symptom */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Symptom</span>
            <select
              value={symptom}
              onChange={e => setSymptom(e.target.value)}
              className="px-2 py-1 rounded-lg text-[11px] outline-none"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              <option value="">All</option>
              {Object.entries(SYMPTOM_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Min check-ins */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Check-ins</span>
            <div className="flex gap-1">
              {MIN_CHECKIN_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setMinCheckIns(o.value)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-all"
                  style={{
                    background: minCheckIns === o.value ? 'var(--clay)' : 'var(--sand-1)',
                    color: minCheckIns === o.value ? 'white' : 'var(--ink-3)',
                    border: `1px solid ${minCheckIns === o.value ? 'var(--clay)' : 'var(--border)'}`,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSkinType(''); setConcern(''); setSymptom(''); setMinCheckIns('0') }}
              className="flex items-center gap-1 text-[11px] transition-opacity hover:opacity-70 ml-auto"
              style={{ color: 'var(--ink-3)' }}
            >
              <X size={10} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2" style={{ background: 'var(--surface)' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--clay)' }} />
          <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Loading…</span>
        </div>
      ) : consumers.length === 0 ? (
        <div className="py-10 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>No consumers match the current filters.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)' }}>
          {/* Column headers */}
          <div
            className="grid gap-3 px-4 py-2 text-[10px] font-semibold tracking-wide uppercase"
            style={{ gridTemplateColumns: '1fr 90px 120px 60px 80px 24px', color: 'var(--ink-3)', borderBottom: '1px solid var(--border)' }}
          >
            <span>Consumer</span>
            <span>Skin Type</span>
            <span>Top Concern</span>
            <span>Check-ins</span>
            <span>Last Check-in</span>
            <span />
          </div>

          {consumers.map((c, i) => (
            <button
              key={c.id}
              onClick={() => router.push(`/${slug}/consumers/${c.id}`)}
              className="w-full grid gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--sand-1)] group"
              style={{
                gridTemplateColumns: '1fr 90px 120px 60px 80px 24px',
                borderBottom: i < consumers.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {displayName(c)}
                </p>
                {c.email && [c.firstName, c.lastName].some(Boolean) && (
                  <p className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>{c.email}</p>
                )}
              </div>
              <span className="text-[12px] self-center" style={{ color: 'var(--ink-2)' }}>
                {c.skinType ? SKIN_TYPE_LABELS[c.skinType] ?? c.skinType : '—'}
              </span>
              <span className="text-[12px] self-center truncate" style={{ color: 'var(--ink-2)' }}>
                {c.skinConcerns[0] ? (CONCERN_LABELS[c.skinConcerns[0]] ?? c.skinConcerns[0]) : '—'}
              </span>
              <span className="text-[12px] font-semibold tabular-nums self-center" style={{ color: 'var(--ink)' }}>
                {c.checkInCount}
              </span>
              <span className="text-[11px] self-center" style={{ color: 'var(--ink-3)' }}>
                {c.lastCheckInDate
                  ? new Date(c.lastCheckInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </span>
              <ChevronRight size={13} className="self-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--ink-3)' }} />
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--sand-1)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-40 transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-40 transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
