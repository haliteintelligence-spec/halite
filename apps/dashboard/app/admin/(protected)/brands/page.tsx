'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, Users, Package, Plus, ArrowUpDown, SlidersHorizontal, Check, X } from 'lucide-react'
import type { BrandSummary } from '@/lib/admin-api'

type SortKey = 'name' | 'plan' | 'consumers' | 'products' | 'joined'
type SortDir = 'asc' | 'desc'

const PLAN_ORDER: Record<string, number> = { STARTER: 0, GROWTH: 1, PRO: 2, ENTERPRISE: 3 }

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : { brands: [] })
      .then((d: { brands: BrandSummary[] }) => setBrands(d.brands ?? []))
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'joined' ? 'desc' : 'asc')
    }
  }

  const filtered = useMemo(() => {
    let out = brands
    if (filterPlan) out = out.filter(b => b.plan === filterPlan)
    if (filterStatus === 'active') out = out.filter(b => b.active)
    if (filterStatus === 'inactive') out = out.filter(b => !b.active)
    return [...out].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'plan') cmp = (PLAN_ORDER[a.plan] ?? 0) - (PLAN_ORDER[b.plan] ?? 0)
      else if (sortKey === 'consumers') cmp = a._count.endUsers - b._count.endUsers
      else if (sortKey === 'products') cmp = a._count.products - b._count.products
      else if (sortKey === 'joined') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [brands, sortKey, sortDir, filterPlan, filterStatus])

  const activeFilterCount = (filterPlan ? 1 : 0) + (filterStatus ? 1 : 0)

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 group"
        style={{ color: active ? 'var(--clay)' : 'var(--ink-3)' }}
      >
        {label}
        <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.4 }} />
        {active && <span className="text-[9px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            Active Brands
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {loading ? '…' : `${filtered.length} of ${brands.length} brand${brands.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{
                background: activeFilterCount > 0 ? 'var(--clay-light)' : 'var(--sand-1)',
                border: `1px solid ${activeFilterCount > 0 ? 'var(--clay)' : 'var(--border)'}`,
                color: activeFilterCount > 0 ? 'var(--clay)' : 'var(--ink)',
              }}
            >
              <SlidersHorizontal size={12} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: 'var(--clay)' }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-lg p-4 space-y-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '220px' }}
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Plan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'].map(p => (
                      <button
                        key={p || 'all'}
                        onClick={() => setFilterPlan(p)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: filterPlan === p ? 'var(--clay)' : 'var(--sand-1)',
                          color: filterPlan === p ? 'white' : 'var(--ink)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {p || 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Status</p>
                  <div className="flex gap-1.5">
                    {(['', 'active', 'inactive'] as const).map(s => (
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
                        {s || 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setFilterPlan(''); setFilterStatus('') }}
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <X size={10} /> Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
          <Link
            href="/admin/brands/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--clay)' }}
          >
            <Plus size={14} />
            Onboard Brand
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
            {brands.length === 0 ? 'No active brands yet.' : 'No brands match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="name" label="Brand" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="plan" label="Plan" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="consumers" label="Consumers" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="products" label="Products" />
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  <SortBtn col="joined" label="Joined" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((brand, i) => (
                <tr
                  key={brand.id}
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
                        <Building2 size={12} style={{ color: 'var(--ink-3)' }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{brand.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{brand.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={brand.plan} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink)' }}>
                      <Users size={11} style={{ color: 'var(--ink-3)' }} />
                      {brand._count.endUsers.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink)' }}>
                      <Package size={11} style={{ color: 'var(--ink-3)' }} />
                      {brand._count.products.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={brand.active ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#f3f4f6', color: '#6b7280' }}>
                      {brand.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/brands/${brand.id}`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    PRO:        { bg: '#ede9fe', color: '#5b21b6' },
    GROWTH:     { bg: '#dbeafe', color: '#1e40af' },
    STARTER:    { bg: '#f3f4f6', color: '#374151' },
    ENTERPRISE: { bg: '#fef3c7', color: '#92400e' },
  }
  const s = styles[plan.toUpperCase()] ?? styles.STARTER
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={s}>{plan}</span>
}
