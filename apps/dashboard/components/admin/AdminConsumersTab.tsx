'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ChevronLeft, ChevronRight, ChevronRight as Arrow } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface BeautyProfile {
  skinType: string | null
  ageRange: string | null
  city: string | null
  country: string | null
  monkSkinTone: string | null
  skinConcerns: string[]
  hairProfile: unknown | null
}

interface ConsumerRow {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  createdAt: string
  beautyProfile: BeautyProfile | null
  consumer: { id: string; _count: { endUsers: number } } | null
  _count: { checkIns: number; routines: number }
}

interface Props {
  brandId: string
  detailBaseHref: string
}

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getToken() {
  return typeof document !== 'undefined'
    ? document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    : undefined
}

const SKIN_TYPES = ['DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE']

export function AdminConsumersTab({ brandId, detailBaseHref }: Props) {
  const router = useRouter()
  const [consumers, setConsumers] = useState<ConsumerRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [skinType, setSkinType] = useState('')
  const [city, setCity] = useState('')
  const [minBrands, setMinBrands] = useState(0)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (search) params.set('search', search)
    if (skinType) params.set('skinType', skinType)
    if (city) params.set('city', city)
    const t = getToken()
    const res = await fetch(`${API_URL}/admin/brands/${brandId}/consumers?${params}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
    if (res.ok) {
      const data = await res.json() as { consumers: ConsumerRow[]; total: number; page: number; pages: number }
      let rows = data.consumers
      if (minBrands > 1) rows = rows.filter(c => (c.consumer?._count.endUsers ?? 1) >= minBrands)
      setConsumers(rows)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    }
    setLoading(false)
  }, [brandId, search, skinType, city, minBrands])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input
            type="search"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
        </div>
        <select
          value={skinType}
          onChange={e => setSkinType(e.target.value)}
          className="px-3 py-2 rounded-lg text-[12px] outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: skinType ? 'var(--ink)' : 'var(--ink-3)' }}
        >
          <option value="">All skin types</option>
          {SKIN_TYPES.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
        </select>
        <input
          type="text"
          placeholder="City…"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="px-3 py-2 rounded-lg text-[12px] outline-none w-36"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
        />
        <select
          value={minBrands}
          onChange={e => setMinBrands(Number(e.target.value))}
          className="px-3 py-2 rounded-lg text-[12px] outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: minBrands > 1 ? 'var(--ink)' : 'var(--ink-3)' }}
        >
          <option value={0}>All consumers</option>
          <option value={2}>Cross-brand (2+ brands)</option>
          <option value={3}>3+ brands</option>
          <option value={4}>4+ brands</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--ink-3)' }} />
          </div>
        ) : consumers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No consumers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--sand-1)' }}>
                  {['Consumer', 'Location', 'Skin Type', 'Concerns', 'Brands', 'Check-ins', 'Routines', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {consumers.map(c => {
                  const brandCount = c.consumer?._count.endUsers ?? 1
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || '—'
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`${detailBaseHref}/${c.id}`)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--sand-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--ink)' }}>{name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{c.email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                        {c.beautyProfile?.city ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.beautyProfile?.skinType ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                            {fmt(c.beautyProfile.skinType)}
                          </span>
                        ) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-[10px] truncate" style={{ color: 'var(--ink-3)' }}>
                          {(c.beautyProfile?.skinConcerns ?? []).map(fmt).join(', ') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: brandCount > 1 ? '#eff6ff' : 'var(--sand-1)',
                            color: brandCount > 1 ? '#2563eb' : 'var(--ink-3)',
                          }}>
                          {brandCount} {brandCount === 1 ? 'brand' : 'brands'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{c._count.checkIns}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{c._count.routines}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Arrow size={13} style={{ color: 'var(--ink-3)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {total.toLocaleString()} consumer{total !== 1 ? 's' : ''} total
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40 hover:bg-sand-1 transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--ink-3)' }}
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{page} / {pages}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={page === pages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40 hover:bg-sand-1 transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--ink-3)' }}
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
