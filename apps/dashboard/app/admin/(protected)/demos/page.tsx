'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Clock, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react'
import type { DemoSummary } from '@/lib/admin-api'

type SortKey = 'prospect' | 'created' | 'expiry' | 'consumers'
type SortDir = 'asc' | 'desc'
type StatusFilter = '' | 'generating' | 'active' | 'expiring_soon' | 'access_expired' | 'converted'

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : { demos: [] })
      .then((d: { demos: DemoSummary[] }) => setDemos(d.demos ?? []))
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'created' || key === 'expiry' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    let out = demos
    if (filterStatus) out = out.filter(d => d.status === filterStatus)
    return [...out].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'prospect') cmp = (a.prospectName ?? '').localeCompare(b.prospectName ?? '')
      else if (sortKey === 'created') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      else if (sortKey === 'expiry') {
        const aT = a.demoLinkExpiresAt ? new Date(a.demoLinkExpiresAt).getTime() : 0
        const bT = b.demoLinkExpiresAt ? new Date(b.demoLinkExpiresAt).getTime() : 0
        cmp = aT - bT
      } else if (sortKey === 'consumers') cmp = a.consumerCount - b.consumerCount
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [demos, sortKey, sortDir, filterStatus])

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <button onClick={() => toggleSort(col)} className="flex items-center gap-1" style={{ color: active ? 'var(--clay)' : 'var(--ink-3)' }}>
        {label}
        <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.4 }} />
        {active && <span className="text-[9px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    )
  }

  const STATUS_LABELS: Record<string, string> = {
    generating: 'Generating', active: 'Active', expiring_soon: 'Expiring', access_expired: 'Expired', converted: 'Converted',
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            Demo Environments
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {loading ? '…' : `${filtered.length} of ${demos.length} demo${demos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{
                background: filterStatus ? 'var(--clay-light)' : 'var(--sand-1)',
                border: `1px solid ${filterStatus ? 'var(--clay)' : 'var(--border)'}`,
                color: filterStatus ? 'var(--clay)' : 'var(--ink)',
              }}
            >
              <SlidersHorizontal size={12} />
              Filters
              {filterStatus && (
                <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: 'var(--clay)' }}>
                  1
                </span>
              )}
            </button>
            {showFilters && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-lg p-4 space-y-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '220px' }}
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['', 'generating', 'active', 'expiring_soon', 'access_expired', 'converted'] as StatusFilter[]).map(s => (
                      <button
                        key={s || 'all'}
                        onClick={() => setFilterStatus(s)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: filterStatus === s ? 'var(--clay)' : 'var(--sand-1)',
                          color: filterStatus === s ? 'white' : 'var(--ink)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {s ? STATUS_LABELS[s] : 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                {filterStatus && (
                  <button onClick={() => setFilterStatus('')} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    <X size={10} /> Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <Link
            href="/admin/demos/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--clay)' }}
          >
            <Plus size={14} />
            New Demo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {demos.length === 0 ? 'No demos yet. Create one to get started.' : 'No demos match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="prospect" label="Prospect" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="consumers" label="Consumers" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Products
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="expiry" label="Expires" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Credentials
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="created" label="Created" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((demo, i) => (
                <tr
                  key={demo.id}
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                      {demo.prospectName ?? '—'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{demo.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={demo.status} />
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                    {demo.consumerCount}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                    {demo.productCount}
                  </td>
                  <td className="px-4 py-3">
                    {demo.demoLinkExpiresAt ? (
                      <ExpiryCell expiresAt={demo.demoLinkExpiresAt} />
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] space-y-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>
                      <p className="truncate max-w-[140px]">{demo.email ?? '—'}</p>
                      <p className="truncate max-w-[140px]">{demo.password}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {new Date(demo.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/demos/${demo.id}`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    generating:    { label: 'Generating', bg: '#fef3c7', color: '#92400e' },
    active:        { label: 'Active',     bg: '#d4f4dd', color: '#1a7a3c' },
    expiring_soon: { label: 'Expiring',   bg: '#ffe4cc', color: '#9a3800' },
    access_expired:{ label: 'Expired',    bg: '#f3f4f6', color: '#6b7280' },
    converted:     { label: 'Converted',  bg: '#ede9fe', color: '#5b21b6' },
  }
  const s = map[status] ?? map.access_expired
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ExpiryCell({ expiresAt }: { expiresAt: string }) {
  const date = new Date(expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const expired = daysLeft <= 0
  return (
    <div className="flex items-center gap-1">
      <Clock size={11} style={{ color: expired ? '#e57373' : daysLeft <= 3 ? '#f97316' : 'var(--ink-3)' }} />
      <span className="text-[12px]" style={{ color: expired ? '#e57373' : daysLeft <= 3 ? '#f97316' : 'var(--ink)' }}>
        {expired ? 'Expired' : `${daysLeft}d`}
      </span>
    </div>
  )
}
