'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { API_URL, adminHeaders } from '@/lib/api'
import {
  Users, LogIn, ClipboardList, ShieldCheck, Package, TrendingUp,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url, { headers: adminHeaders() }).then(r => r.json())
const cardCls = 'bg-white rounded-2xl border overflow-hidden'
const cardStyle = { borderColor: 'var(--border)' }

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

export default function HallieTestPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const { data: summary } = useSWR(`${API_URL}/admin/hallie-test/summary`, fetcher)
  const { data: usersData } = useSWR(`${API_URL}/admin/hallie-test/users`, fetcher)
  const { data: productsData } = useSWR(
    tab === 'products' ? `${API_URL}/admin/hallie-test/insights/products` : null,
    fetcher
  )
  const { data: usageData } = useSWR(
    tab === 'usage' ? `${API_URL}/admin/hallie-test/insights/usage` : null,
    fetcher
  )
  const { data: prefsData } = useSWR(
    tab === 'preferences' ? `${API_URL}/admin/hallie-test/insights/preferences` : null,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Hallie Test</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Internal analytics for the Hallie Testing app — traction, compliance, and real-world usage.
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[13px] font-medium capitalize relative transition-colors whitespace-nowrap"
            style={{ color: tab === t ? 'var(--text-1)' : 'var(--text-3)' }}>
            {t === 'usage' ? 'Usage & Relationships' : t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--text-1)' }} />}
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

function OverviewTab({ summary }: { summary: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-3)' }}>{label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {summary ? (summary[key] ?? 0).toLocaleString() : '—'}
            </p>
          </div>
        ))}
      </div>
      <div className={cardCls} style={cardStyle}>
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Growth & engagement</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x" style={{ borderColor: 'var(--border-sub)' }}>
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
            <div key={label as string} className="p-5">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1.5" style={{ color: 'var(--text-3)' }}>{label}</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{(value ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type SortField = 'name' | 'createdAt' | 'productCount' | 'logCount' | 'loginCount' | 'grantedRequiredConsents'

function UsersTab({ users }: { users: User[] }) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('all')
  const [compliance, setCompliance] = useState<'all' | 'compliant' | 'incomplete'>('all')
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'createdAt', dir: 'desc' })

  const cities = useMemo(
    () => Array.from(new Set(users.map(u => u.city).filter(Boolean))) as string[],
    [users]
  )

  const rows = useMemo(() => {
    let r = users
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(u => `${u.name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q))
    }
    if (city !== 'all') r = r.filter(u => u.city === city)
    if (compliance !== 'all') {
      r = r.filter(u => (u.grantedRequiredConsents === 5) === (compliance === 'compliant'))
    }
    return [...r].sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [users, search, city, compliance, sort])

  function toggleSort(field: SortField) {
    setSort(s => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' }))
  }

  const inputCls = 'px-3 py-2 rounded-lg border text-sm outline-none'
  const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-1)' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…"
          className={`${inputCls} flex-1 min-w-[200px]`} style={inputStyle} />
        <select value={city} onChange={e => setCity(e.target.value)} className={inputCls} style={inputStyle}>
          <option value="all">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={compliance} onChange={e => setCompliance(e.target.value as any)} className={inputCls} style={inputStyle}>
          <option value="all">All compliance</option>
          <option value="compliant">Fully compliant</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      <div className={cardCls} style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
              {[
                ['Name', 'name'], ['Signed up', 'createdAt'], ['Products', 'productCount'],
                ['Logs', 'logCount'], ['Logins', 'loginCount'], ['Compliance', 'grantedRequiredConsents'],
              ].map(([label, field]) => (
                <th key={label} onClick={() => toggleSort(field as SortField)}
                  className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer select-none"
                  style={{ color: sort.field === field ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {label} {sort.field === field ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>No users match these filters.</td></tr>
            ) : rows.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-[#f5f0eb] transition-colors" style={{ borderColor: 'var(--border-sub)' }}>
                <td className="px-5 py-3">
                  <a href={`/hallie-test/${u.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-1)' }}>{u.name}</a>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{u.email}{u.city ? ` · ${u.city}` : ''}</p>
                </td>
                <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{u.productCount}</td>
                <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{u.logCount}</td>
                <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{u.loginCount}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.grantedRequiredConsents === 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {u.grantedRequiredConsents}/5
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductsTab({ products }: { products: any[] }) {
  const byCategory = useMemo(() => {
    const groups: Record<string, { count: number; avgRating: number; avgLevel: number }> = {}
    for (const p of products) {
      const g = (groups[p.category] ??= { count: 0, avgRating: 0, avgLevel: 0 })
      g.count++
      g.avgRating += p.rating
      g.avgLevel += p.currentLevel
    }
    for (const g of Object.values(groups)) {
      g.avgRating = g.count ? g.avgRating / g.count : 0
      g.avgLevel = g.count ? g.avgLevel / g.count : 0
    }
    return groups
  }, [products])

  return (
    <div className={cardCls} style={cardStyle}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Products by category</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
            {['Category', 'Count', 'Avg rating', 'Avg remaining'].map(h => (
              <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(byCategory).length === 0 ? (
            <tr><td colSpan={4} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>No products yet.</td></tr>
          ) : Object.entries(byCategory).map(([cat, g]) => (
            <tr key={cat} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
              <td className="px-5 py-3 font-medium capitalize" style={{ color: 'var(--text-1)' }}>{cat.replace(/_/g, ' ')}</td>
              <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{g.count}</td>
              <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{g.avgRating.toFixed(1)} / 10</td>
              <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{g.avgLevel.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UsageTab({ usage }: { usage: any[] }) {
  const [groupBy, setGroupBy] = useState<'city' | 'month'>('city')

  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {}
    for (const u of usage) {
      const key = groupBy === 'city'
        ? (u.city ? String(u.city).trim() : 'Unknown')
        : new Date(u.date).toLocaleString('en-US', { month: 'short', year: 'numeric' })
      const g = (groups[key] ??= {})
      g[u.category] = (g[u.category] ?? 0) + 1
    }
    return groups
  }, [usage, groupBy])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Group by</span>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
          className="px-3 py-1.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}>
          <option value="city">City</option>
          <option value="month">Month logged</option>
        </select>
      </div>
      {groupBy === 'city' && (
        <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>
          City is freeform text entered by each user — variations in spelling/format aren&apos;t normalized.
        </p>
      )}
      <div className={cardCls} style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>
                {groupBy === 'city' ? 'City' : 'Month'}
              </th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>Category breakdown</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr><td colSpan={2} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>No log activity yet.</td></tr>
            ) : Object.entries(grouped).map(([key, byCat]) => (
              <tr key={key} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{key}</td>
                <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-2)' }}>
                  {Object.entries(byCat).map(([cat, n]) => `${cat.replace(/_/g, ' ')}: ${n}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <div className={`${cardCls} p-8 text-center`} style={cardStyle}>
          <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No preference data yet.</p>
        </div>
      ) : Object.entries(grouped).map(([category, byClassifier]) => (
        <div key={category} className={cardCls} style={cardStyle}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
            <h2 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-1)' }}>{category.replace(/_/g, ' ')}</h2>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(byClassifier).map(([val, count]) => (
              <div key={val} className="flex items-center gap-3">
                <span className="text-sm w-32 flex-shrink-0 capitalize" style={{ color: 'var(--text-2)' }}>{val.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                  <div className="h-full rounded-full" style={{ background: 'var(--text-1)', width: `${Math.min(100, count * 15)}%` }} />
                </div>
                <span className="text-sm w-8 text-right" style={{ color: 'var(--text-3)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ComplianceTab({ summary }: { summary: any }) {
  const total = summary?.totalUsers ?? 0
  const byType: Record<string, number> = summary?.consentByType ?? {}
  return (
    <div className={cardCls} style={cardStyle}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Consent grant rates</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Out of {total} total users</p>
      </div>
      <div className="p-6 space-y-3">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="flex items-center gap-3">
            <span className="text-sm w-48 flex-shrink-0 capitalize" style={{ color: 'var(--text-2)' }}>{type.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
              <div className="h-full rounded-full" style={{ background: 'var(--text-1)', width: `${total ? (count / total) * 100 : 0}%` }} />
            </div>
            <span className="text-sm w-16 text-right" style={{ color: 'var(--text-3)' }}>{count}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
