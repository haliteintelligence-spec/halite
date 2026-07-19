'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, LogIn, ClipboardList, ShieldCheck, Package, TrendingUp } from 'lucide-react'

function adminHeaders(): Record<string, string> {
  const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type User = {
  id: string
  name: string
  email: string
  phone: string | null
  city: string | null
  country: string | null
  createdAt: string
  pointsBalance: number
  haliteConsumerId: string | null
  productCount: number
  logCount: number
  loginCount: number
  lastLoginAt: string | null
  grantedRequiredConsents: number
}

const STAT_CARDS = [
  { key: 'totalUsers', label: 'Total users', icon: Users, color: '#450F2A' },
  { key: 'uniqueLoginUsers30d', label: 'Active users (30d)', icon: LogIn, color: '#2563eb' },
  { key: 'totalLogs', label: 'Logs completed', icon: ClipboardList, color: '#059669' },
  { key: 'compliantUsers', label: 'Fully compliant', icon: ShieldCheck, color: '#f09118' },
  { key: 'totalProducts', label: 'Products entered', icon: Package, color: '#9333ea' },
  { key: 'haliteLinkedUsers', label: 'Synced to Halite', icon: TrendingUp, color: '#dc2626' },
]

const TABS = ['overview', 'users', 'products', 'usage', 'preferences', 'compliance'] as const
type Tab = (typeof TABS)[number]

function useHallieTestFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    if (!path) return
    setData(null)
    fetch(`${API_URL}${path}`, { headers: adminHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
  }, [path])
  return data
}

export default function HallieTestPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const summary = useHallieTestFetch<any>('/admin/hallie-test/summary')
  const usersData = useHallieTestFetch<{ users: User[] }>('/admin/hallie-test/users')
  const productsData = useHallieTestFetch<any>(tab === 'products' ? '/admin/hallie-test/insights/products' : null)
  const usageData = useHallieTestFetch<any>(tab === 'usage' ? '/admin/hallie-test/insights/usage' : null)
  const prefsData = useHallieTestFetch<any>(tab === 'preferences' ? '/admin/hallie-test/insights/preferences' : null)

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>Hallie Test</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Internal analytics for the Hallie Testing app — traction, compliance, and real-world usage.
        </p>
      </div>

      <div className="flex mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-2.5 text-[12px] font-medium capitalize transition-colors whitespace-nowrap"
            style={{ color: tab === t ? 'var(--ink)' : 'var(--ink-3)' }}>
            {t === 'usage' ? 'Usage & Relationships' : t}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--clay)' }} />}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab summary={summary} />}
      {tab === 'users' && <UsersTab users={usersData?.users ?? []} />}
      {tab === 'products' && <ProductsTab products={productsData?.products ?? []} />}
      {tab === 'usage' && <UsageTab usage={usageData?.usage ?? []} />}
      {tab === 'preferences' && <PreferencesTab rows={prefsData?.rows ?? []} />}
      {tab === 'compliance' && <ComplianceTab summary={summary} />}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

function OverviewTab({ summary }: { summary: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {summary ? (summary[key] ?? 0).toLocaleString() : '—'}
            </p>
          </div>
        ))}
      </div>
      <Card>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Growth & engagement</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            ['New users (7d)', summary?.newUsers7d],
            ['New users (30d)', summary?.newUsers30d],
            ['Logs (7d)', summary?.logs7d],
            ['Logs (30d)', summary?.logs30d],
            ['Total logins', summary?.totalLogins],
            ['Profile-complete users', summary?.profileCompleteUsers],
            ['Points awarded', summary?.pointsAwarded],
            ['Payout requests', summary?.payoutCount],
          ].map(([label, value]) => (
            <div key={label as string} className="p-5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[10px] font-medium tracking-wide uppercase mb-1.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>{(value ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

type SortField = 'name' | 'createdAt' | 'productCount' | 'logCount' | 'loginCount' | 'grantedRequiredConsents'

function UsersTab({ users }: { users: User[] }) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('all')
  const [compliance, setCompliance] = useState<'all' | 'compliant' | 'incomplete'>('all')
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'createdAt', dir: 'desc' })

  const cities = useMemo(() => Array.from(new Set(users.map((u) => u.city).filter(Boolean))) as string[], [users])

  const rows = useMemo(() => {
    let r = users
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((u) => `${u.name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q))
    }
    if (city !== 'all') r = r.filter((u) => u.city === city)
    if (compliance !== 'all') r = r.filter((u) => (u.grantedRequiredConsents === 5) === (compliance === 'compliant'))
    return [...r].sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [users, search, city, compliance, sort])

  function toggleSort(field: SortField) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' }))
  }

  const inputCls = 'px-3 py-1.5 rounded-lg text-[13px] outline-none'
  const inputStyle = { border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--surface)' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…"
          className={`${inputCls} flex-1 min-w-[200px]`} style={inputStyle} />
        <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="all">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={compliance} onChange={(e) => setCompliance(e.target.value as any)} className={inputCls} style={inputStyle}>
          <option value="all">All compliance</option>
          <option value="compliant">Fully compliant</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                {[
                  ['Name', 'name'], ['Signed up', 'createdAt'], ['Products', 'productCount'],
                  ['Logs', 'logCount'], ['Logins', 'loginCount'], ['Compliance', 'grantedRequiredConsents'],
                ].map(([label, field]) => (
                  <th key={label} onClick={() => toggleSort(field as SortField)}
                    className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase cursor-pointer select-none"
                    style={{ color: sort.field === field ? 'var(--clay)' : 'var(--ink-3)' }}>
                    {label} {sort.field === field ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No users match these filters.</td></tr>
              ) : rows.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/hallie-test/${u.id}`} className="text-[13px] font-medium hover:underline" style={{ color: 'var(--ink)' }}>{u.name}</Link>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{u.email}{u.city ? ` · ${u.city}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{u.productCount}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{u.logCount}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{u.loginCount}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={u.grantedRequiredConsents === 5 ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#fef3c7', color: '#92400e' }}>
                      {u.grantedRequiredConsents}/5
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function ProductsTab({ products }: { products: any[] }) {
  const byCategory = useMemo(() => {
    const groups: Record<string, { count: number; avgRating: number; avgLevel: number }> = {}
    for (const p of products) {
      const g = (groups[p.category] ??= { count: 0, avgRating: 0, avgLevel: 0 })
      g.count++; g.avgRating += p.rating; g.avgLevel += p.currentLevel
    }
    for (const g of Object.values(groups)) { g.avgRating = g.count ? g.avgRating / g.count : 0; g.avgLevel = g.count ? g.avgLevel / g.count : 0 }
    return groups
  }, [products])

  return (
    <Card>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Products by category</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
            {['Category', 'Count', 'Avg rating', 'Avg remaining'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(byCategory).length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No products yet.</td></tr>
          ) : Object.entries(byCategory).map(([cat, g]) => (
            <tr key={cat} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-3 text-[13px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{cat.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.count}</td>
              <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.avgRating.toFixed(1)} / 10</td>
              <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.avgLevel.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function UsageTab({ usage }: { usage: any[] }) {
  const [groupBy, setGroupBy] = useState<'city' | 'month'>('city')
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {}
    for (const u of usage) {
      const key = groupBy === 'city' ? (u.city ? String(u.city).trim() : 'Unknown') : new Date(u.date).toLocaleString('en-US', { month: 'short', year: 'numeric' })
      const g = (groups[key] ??= {})
      g[u.category] = (g[u.category] ?? 0) + 1
    }
    return groups
  }, [usage, groupBy])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Group by</span>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg text-[13px] outline-none" style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}>
          <option value="city">City</option>
          <option value="month">Month logged</option>
        </select>
      </div>
      {groupBy === 'city' && (
        <p className="text-[12px] italic" style={{ color: 'var(--ink-3)' }}>
          City is freeform text entered by each user — variations in spelling/format aren&apos;t normalized.
        </p>
      )}
      <Card>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                {groupBy === 'city' ? 'City' : 'Month'}
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Category breakdown</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No log activity yet.</td></tr>
            ) : Object.entries(grouped).map(([key, byCat]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{key}</td>
                <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                  {Object.entries(byCat).map(([cat, n]) => `${cat.replace(/_/g, ' ')}: ${n}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PreferencesTab({ rows }: { rows: any[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {}
    for (const r of rows) {
      if (!r.classifier) continue
      const g = (groups[r.preferenceCategory] ??= {})
      g[r.classifier] = (g[r.classifier] ?? 0) + 1
    }
    return groups
  }, [rows])

  return (
    <div className="space-y-4">
      {Object.keys(grouped).length === 0 ? (
        <Card><p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No preference data yet.</p></Card>
      ) : Object.entries(grouped).map(([category, byClassifier]) => (
        <Card key={category}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[13px] font-semibold capitalize" style={{ color: 'var(--ink)' }}>{category.replace(/_/g, ' ')}</h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(byClassifier).map(([val, count]) => (
              <div key={val} className="flex items-center gap-3">
                <span className="text-[13px] w-32 flex-shrink-0 capitalize" style={{ color: 'var(--ink)' }}>{val.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sand-1)' }}>
                  <div className="h-full rounded-full" style={{ background: 'var(--clay)', width: `${Math.min(100, count * 15)}%` }} />
                </div>
                <span className="text-[13px] w-8 text-right" style={{ color: 'var(--ink-3)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ComplianceTab({ summary }: { summary: any }) {
  const total = summary?.totalUsers ?? 0
  const byType: Record<string, number> = summary?.consentByType ?? {}
  return (
    <Card>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Consent grant rates</h2>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>Out of {total} total users</p>
      </div>
      <div className="p-5 space-y-3">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="flex items-center gap-3">
            <span className="text-[13px] w-48 flex-shrink-0 capitalize" style={{ color: 'var(--ink)' }}>{type.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sand-1)' }}>
              <div className="h-full rounded-full" style={{ background: 'var(--clay)', width: `${total ? (count / total) * 100 : 0}%` }} />
            </div>
            <span className="text-[13px] w-16 text-right" style={{ color: 'var(--ink-3)' }}>{count}/{total}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
