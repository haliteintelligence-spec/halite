'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, LogIn, ClipboardList, ShieldCheck, Package, TrendingUp, RefreshCw, ArrowUpDown } from 'lucide-react'
import { MultiSelectFilter } from './_multi-select-filter'

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
  { key: 'repurchaseRate', label: 'Repurchase intent', icon: RefreshCw, color: '#0d9488', suffix: '%' },
]

const TABS = ['overview', 'users', 'products', 'payouts', 'usage', 'preferences', 'compliance'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Partial<Record<Tab, string>> = {
  usage: 'Usage & Relationships',
  payouts: 'Payout Requested',
}

type PayoutRequest = {
  id: string
  userId: string
  userName: string
  userEmail: string
  pointsRedeemed: number
  amountCents: number
  status: string
  payoutMethod: string
  createdAt: string
}

// Where each Overview summary's "deeper dive" button lands — the tab (and,
// for Users, the pre-applied compliance filter / sort) that best explains
// that number. Covers both the top stat cards and the growth/engagement
// grid, keyed by the same field name used to read the value out of
// `summary`.
const DEEP_DIVE: Record<string, { tab: Tab; compliance?: 'compliant' | 'incomplete'; sort?: SortField }> = {
  totalUsers: { tab: 'users' },
  uniqueLoginUsers30d: { tab: 'users', sort: 'loginCount' },
  totalLogs: { tab: 'usage' },
  compliantUsers: { tab: 'users', compliance: 'compliant' },
  totalProducts: { tab: 'products' },
  haliteLinkedUsers: { tab: 'users' },
  repurchaseRate: { tab: 'usage' },
  newUsers7d: { tab: 'users', sort: 'createdAt' },
  newUsers30d: { tab: 'users', sort: 'createdAt' },
  logs7d: { tab: 'usage' },
  logs30d: { tab: 'usage' },
  totalLogins: { tab: 'users', sort: 'loginCount' },
  profileCompleteUsers: { tab: 'users' },
  pointsAwarded: { tab: 'users', sort: 'pointsBalance' },
  payoutCount: { tab: 'payouts' },
}

const GROWTH_ITEMS: { key: string; label: string }[] = [
  { key: 'newUsers7d', label: 'New users (7d)' },
  { key: 'newUsers30d', label: 'New users (30d)' },
  { key: 'logs7d', label: 'Logs (7d)' },
  { key: 'logs30d', label: 'Logs (30d)' },
  { key: 'totalLogins', label: 'Total logins' },
  { key: 'profileCompleteUsers', label: 'Profile-complete users' },
  { key: 'pointsAwarded', label: 'Points awarded' },
  { key: 'payoutCount', label: 'Payout requests' },
]

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
  // Seeded from an Overview "deeper dive" button click — `token` is bumped
  // on every click (even to the same target) so UsersTab, keyed on it
  // below, fully remounts and picks up the fresh initial filter/sort
  // instead of keeping whatever the user had left set from before.
  const [usersSeed, setUsersSeed] = useState<{ compliance: 'all' | 'compliant' | 'incomplete'; sort: SortField; token: number }>({
    compliance: 'all',
    sort: 'createdAt',
    token: 0,
  })
  const summary = useHallieTestFetch<any>('/admin/hallie-test/summary')
  const usersData = useHallieTestFetch<{ users: User[] }>('/admin/hallie-test/users')
  const productsData = useHallieTestFetch<any>(tab === 'products' ? '/admin/hallie-test/insights/products' : null)
  const payoutsData = useHallieTestFetch<{ payoutRequests: PayoutRequest[] }>(tab === 'payouts' ? '/admin/hallie-test/payouts' : null)
  const usageData = useHallieTestFetch<any>(tab === 'usage' ? '/admin/hallie-test/insights/usage' : null)
  const prefsData = useHallieTestFetch<any>(tab === 'preferences' ? '/admin/hallie-test/insights/preferences' : null)

  function handleDeepDive(key: string) {
    const target = DEEP_DIVE[key]
    if (!target) return
    if (target.tab === 'users') {
      setUsersSeed((s) => ({ compliance: target.compliance ?? 'all', sort: target.sort ?? 'createdAt', token: s.token + 1 }))
    }
    setTab(target.tab)
  }

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
            {TAB_LABELS[t] ?? t}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--clay)' }} />}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab summary={summary} onDeepDive={handleDeepDive} />}
      {tab === 'users' && (
        <UsersTab key={usersSeed.token} users={usersData?.users ?? []} initialCompliance={usersSeed.compliance} initialSort={usersSeed.sort} />
      )}
      {tab === 'products' && <ProductsTab products={productsData?.products ?? []} />}
      {tab === 'payouts' && <PayoutsTab payoutRequests={payoutsData?.payoutRequests ?? []} />}
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

function OverviewTab({ summary, onDeepDive }: { summary: any; onDeepDive: (key: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, suffix }) => (
          <button
            key={key}
            type="button"
            onClick={() => onDeepDive(key)}
            className="text-left rounded-xl p-5 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', outlineColor: 'var(--clay)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {!summary ? '—' : summary[key] == null ? '—' : `${summary[key].toLocaleString()}${suffix ?? ''}`}
            </p>
            {key === 'repurchaseRate' && summary?.repurchaseAnsweredCount != null && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>
                {summary.repurchaseAnsweredCount.toLocaleString()} responses
              </p>
            )}
          </button>
        ))}
      </div>
      <Card>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Growth & engagement</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {GROWTH_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onDeepDive(key)}
              className="text-left p-5 transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2"
              style={{ borderTop: '1px solid var(--border)', outlineColor: 'var(--clay)' }}
            >
              <p className="text-[10px] font-medium tracking-wide uppercase mb-1.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
              <p className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>{(summary?.[key] ?? 0).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

type SortField = 'name' | 'createdAt' | 'productCount' | 'logCount' | 'loginCount' | 'grantedRequiredConsents' | 'pointsBalance'

function UsersTab({
  users,
  initialCompliance = 'all',
  initialSort = 'createdAt',
}: {
  users: User[]
  /** Seeded from an Overview deep-dive click (e.g. "Fully compliant") — see HallieTestPage. */
  initialCompliance?: 'all' | 'compliant' | 'incomplete'
  initialSort?: SortField
}) {
  const [search, setSearch] = useState('')
  const [cities_, setCities_] = useState<string[]>([])
  const [compliance, setCompliance] = useState<string[]>(initialCompliance === 'all' ? [] : [initialCompliance])
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: initialSort, dir: 'desc' })

  const cities = useMemo(() => Array.from(new Set(users.map((u) => u.city).filter(Boolean))) as string[], [users])

  const rows = useMemo(() => {
    let r = users
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((u) => `${u.name} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q))
    }
    if (cities_.length > 0) r = r.filter((u) => u.city && cities_.includes(u.city))
    if (compliance.length > 0) r = r.filter((u) => compliance.includes(u.grantedRequiredConsents === 4 ? 'compliant' : 'incomplete'))
    return [...r].sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [users, search, cities_, compliance, sort])

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
        <MultiSelectFilter label="City" options={cities} selected={cities_} onChange={setCities_} />
        <MultiSelectFilter
          label="Compliance"
          options={['compliant', 'incomplete']}
          selected={compliance}
          onChange={setCompliance}
          formatOption={(v) => (v === 'compliant' ? 'Fully compliant' : 'Incomplete')}
        />
      </div>

      <EntryCount shown={rows.length} total={users.length} label="user" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                {[
                  ['Name', 'name'], ['Signed up', 'createdAt'], ['Products', 'productCount'],
                  ['Logs', 'logCount'], ['Logins', 'loginCount'], ['Points earned', 'pointsBalance'],
                  ['Compliance', 'grantedRequiredConsents'],
                ].map(([label, field]) => (
                  <th key={label} onClick={() => toggleSort(field as SortField)}
                    className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase cursor-pointer select-none whitespace-nowrap"
                    style={{ color: sort.field === field ? 'var(--clay)' : 'var(--ink-3)' }}>
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <ArrowUpDown size={10} style={{ opacity: sort.field === field ? 1 : 0.4 }} />
                      {sort.field === field && <span className="text-[9px]">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No users match these filters.</td></tr>
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
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{u.pointsBalance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={u.grantedRequiredConsents === 4 ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#fef3c7', color: '#92400e' }}>
                      {u.grantedRequiredConsents}/4
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

type PayoutSortField = 'userName' | 'amountCents' | 'status' | 'createdAt'

function PayoutsTab({ payoutRequests }: { payoutRequests: PayoutRequest[] }) {
  const [search, setSearch] = useState('')
  const [paidFilter, setPaidFilter] = useState<string[]>([])
  const [sort, setSort] = useState<{ field: PayoutSortField; dir: 'asc' | 'desc' }>({ field: 'createdAt', dir: 'desc' })

  const rows = useMemo(() => {
    let r = payoutRequests
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((p) => `${p.userName} ${p.userEmail}`.toLowerCase().includes(q))
    }
    if (paidFilter.length > 0) r = r.filter((p) => paidFilter.includes(p.status === 'paid' ? 'paid' : 'pending'))
    return [...r].sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [payoutRequests, search, paidFilter, sort])

  function toggleSort(field: PayoutSortField) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: field === 'userName' ? 'asc' : 'desc' }))
  }

  const inputCls = 'px-3 py-1.5 rounded-lg text-[13px] outline-none'
  const inputStyle = { border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--surface)' }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email…"
          className={`${inputCls} flex-1 min-w-[200px]`} style={inputStyle} />
        <MultiSelectFilter
          label="Paid"
          options={['paid', 'pending']}
          selected={paidFilter}
          onChange={setPaidFilter}
          formatOption={(v) => (v === 'paid' ? 'Paid' : 'Not paid')}
        />
      </div>

      <EntryCount shown={rows.length} total={payoutRequests.length} label="payout request" />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                <SortableTh label="User" field="userName" sort={sort} onSort={toggleSort} />
                <SortableTh label="Amount requested" field="amountCents" sort={sort} onSort={toggleSort} />
                <SortableTh label="Requested" field="createdAt" sort={sort} onSort={toggleSort} />
                <SortableTh label="Paid" field="status" sort={sort} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No payout requests match these filters.</td></tr>
              ) : rows.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/hallie-test/payouts/${p.id}`} className="text-[13px] font-medium hover:underline" style={{ color: 'var(--ink)' }}>
                      {p.userName}
                    </Link>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{p.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                    ${(p.amountCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={p.status === 'paid' ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#fef3c7', color: '#92400e' }}>
                      {p.status === 'paid' ? 'Yes' : 'No'}
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

function fmtTag(s: string | null | undefined) {
  return s ? s.replace(/_/g, ' ') : '—'
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null
}

// Shown above every filterable table so it's always clear how many rows the
// current filters left in view, out of how many exist unfiltered.
function EntryCount({ shown, total, label }: { shown: number; total: number; label: string }) {
  return (
    <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
      {shown === total
        ? `${total.toLocaleString()} ${label}${total !== 1 ? 's' : ''}`
        : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} ${label}${total !== 1 ? 's' : ''}`}
    </p>
  )
}

function SortableTh<F extends string>({
  label, field, sort, onSort,
}: {
  label: string
  field: F
  sort: { field: F; dir: 'asc' | 'desc' }
  onSort: (field: F) => void
}) {
  const active = sort.field === field
  return (
    <th onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase cursor-pointer select-none whitespace-nowrap"
      style={{ color: active ? 'var(--clay)' : 'var(--ink-3)' }}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.4 }} />
        {active && <span className="text-[9px]">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  )
}

type CategorySortField = 'category' | 'count' | 'avgRating' | 'avgLevel'

function ProductsTab({ products }: { products: any[] }) {
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<{ field: CategorySortField; dir: 'asc' | 'desc' }>({ field: 'count', dir: 'desc' })
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])

  const allCategories = useMemo(() => Array.from(new Set(products.flatMap((p) => (Array.isArray(p.categories) ? p.categories : [])))).sort(), [products])
  const allTypes = useMemo(() => Array.from(new Set(products.flatMap((p) => (Array.isArray(p.productTypes) ? p.productTypes : [])))).sort(), [products])

  const filteredProducts = useMemo(() => {
    let r = products
    if (filterCategories.length > 0) r = r.filter((p) => Array.isArray(p.categories) && p.categories.some((c: string) => filterCategories.includes(c)))
    if (filterTypes.length > 0) r = r.filter((p) => Array.isArray(p.productTypes) && p.productTypes.some((t: string) => filterTypes.includes(t)))
    return r
  }, [products, filterCategories, filterTypes])

  // A product can span more than one category (e.g. a 2-in-1), so it's
  // counted under each of its categories rather than forced into just one.
  const rows = useMemo(() => {
    const groups: Record<string, { count: number; avgRating: number; avgLevel: number }> = {}
    for (const p of filteredProducts) {
      const cats: string[] = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : ['uncategorized']
      for (const cat of cats) {
        const g = (groups[cat] ??= { count: 0, avgRating: 0, avgLevel: 0 })
        g.count++
        g.avgRating += p.rating ?? 0
        g.avgLevel += p.initialLevel ?? 0
      }
    }
    for (const g of Object.values(groups)) { g.avgRating = g.count ? g.avgRating / g.count : 0; g.avgLevel = g.count ? g.avgLevel / g.count : 0 }
    return Object.entries(groups)
      .map(([cat, g]) => ({ category: cat, ...g }))
      .sort((a, b) => {
        const av = a[sort.field]
        const bv = b[sort.field]
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
        return sort.dir === 'asc' ? cmp : -cmp
      })
  }, [filteredProducts, sort])

  function toggleSort(field: CategorySortField) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: field === 'category' ? 'asc' : 'desc' }))
  }

  if (category) {
    return <CategoryDetail category={category} products={filteredProducts} onBack={() => setCategory(null)} />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MultiSelectFilter label="Category" options={allCategories} selected={filterCategories} onChange={setFilterCategories} formatOption={fmtTag} />
        <MultiSelectFilter label="Product Type" options={allTypes} selected={filterTypes} onChange={setFilterTypes} formatOption={fmtTag} />
      </div>
      <EntryCount shown={filteredProducts.length} total={products.length} label="product entry" />
      <Card>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Products by category</h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>Click a category to see every product entered under it.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
              <SortableTh label="Category" field="category" sort={sort} onSort={toggleSort} />
              <SortableTh label="Count" field="count" sort={sort} onSort={toggleSort} />
              <SortableTh label="Avg rating" field="avgRating" sort={sort} onSort={toggleSort} />
              <SortableTh label="Avg initial level" field="avgLevel" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No products yet.</td></tr>
            ) : rows.map((g) => (
              <tr key={g.category} onClick={() => setCategory(g.category)}
                className="cursor-pointer transition-colors hover:bg-black/[0.02]"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-[13px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{fmtTag(g.category)}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.count}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.avgRating.toFixed(1)} / 10</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.avgLevel.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card>
    </div>
  )
}

type ProductDetailSortField = 'name' | 'brand' | 'userCount' | 'avgRating' | 'avgInitialLevel' | 'avgCurrentLevel'

function CategoryDetail({ category, products, onBack }: { category: string; products: any[]; onBack: () => void }) {
  const [sort, setSort] = useState<{ field: ProductDetailSortField; dir: 'asc' | 'desc' }>({ field: 'userCount', dir: 'desc' })
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterBrands, setFilterBrands] = useState<string[]>([])

  const inCategory = useMemo(() => products.filter((p) => Array.isArray(p.categories) && p.categories.includes(category)), [products, category])
  const allTypes = useMemo(() => Array.from(new Set(inCategory.flatMap((p) => (Array.isArray(p.productTypes) ? p.productTypes : [])))).sort(), [inCategory])
  const allBrands = useMemo(() => Array.from(new Set(inCategory.map((p) => p.brand).filter(Boolean))).sort(), [inCategory])
  const filtered = useMemo(() => {
    let r = inCategory
    if (filterTypes.length > 0) r = r.filter((p) => Array.isArray(p.productTypes) && p.productTypes.some((t: string) => filterTypes.includes(t)))
    if (filterBrands.length > 0) r = r.filter((p) => filterBrands.includes(p.brand))
    return r
  }, [inCategory, filterTypes, filterBrands])

  // Makeup is the one category where shade genuinely distinguishes two
  // otherwise-identical products (see hallie-api's duplicate-check logic —
  // same brand/name in a different shade is a different product), so it
  // joins the grouping key there and gets shown as its own column; every
  // other category groups exactly as before.
  const isMakeup = category === 'makeup'
  const totalDistinctProducts = useMemo(
    () => new Set(inCategory.map((p) => (isMakeup ? `${p.brand}::${p.name}::${p.shade ?? ''}` : `${p.brand}::${p.name}`))).size,
    [inCategory, isMakeup]
  )

  const rows = useMemo(() => {
    type Group = { name: string; brand: string; shade: string | null; users: Set<string>; ratings: number[]; initialLevels: number[]; currentLevels: number[]; types: Set<string> }
    const groups: Record<string, Group> = {}
    for (const p of filtered) {
      const key = isMakeup ? `${p.brand}::${p.name}::${p.shade ?? ''}` : `${p.brand}::${p.name}`
      const g = (groups[key] ??= { name: p.name, brand: p.brand, shade: p.shade ?? null, users: new Set(), ratings: [], initialLevels: [], currentLevels: [], types: new Set() })
      g.users.add(p.userId)
      if (p.rating != null) g.ratings.push(p.rating)
      if (p.initialLevel != null) g.initialLevels.push(p.initialLevel)
      if (p.currentLevel != null) g.currentLevels.push(p.currentLevel)
      for (const t of p.productTypes ?? []) g.types.add(t)
    }
    return Object.values(groups)
      .map((g) => ({
        name: g.name,
        brand: g.brand,
        shade: g.shade,
        userCount: g.users.size,
        avgRating: avg(g.ratings),
        avgInitialLevel: avg(g.initialLevels),
        avgCurrentLevel: avg(g.currentLevels),
        types: Array.from(g.types),
      }))
      .sort((a, b) => {
        const av = a[sort.field]
        const bv = b[sort.field]
        const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av ?? -Infinity) - (bv as number ?? -Infinity)
        return sort.dir === 'asc' ? cmp : -cmp
      })
  }, [filtered, sort, isMakeup])

  const totalUsers = useMemo(() => new Set(filtered.map((p) => p.userId)).size, [filtered])

  function toggleSort(field: ProductDetailSortField) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: field === 'name' || field === 'brand' ? 'asc' : 'desc' }))
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-[12px] hover:underline" style={{ color: 'var(--ink-3)' }}>← Back to categories</button>
      <Card>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-[13px] font-semibold capitalize" style={{ color: 'var(--ink)' }}>{fmtTag(category)}</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                {totalUsers} user{totalUsers !== 1 ? 's' : ''} with at least one matching product in this category
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiSelectFilter label="Brand" options={allBrands} selected={filterBrands} onChange={setFilterBrands} />
              <MultiSelectFilter label="Product Type" options={allTypes} selected={filterTypes} onChange={setFilterTypes} formatOption={fmtTag} />
            </div>
          </div>
          <div className="mt-2">
            <EntryCount shown={rows.length} total={totalDistinctProducts} label="product" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                <SortableTh label="Product" field="name" sort={sort} onSort={toggleSort} />
                <SortableTh label="Brand" field="brand" sort={sort} onSort={toggleSort} />
                {isMakeup && (
                  <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Shade</th>
                )}
                <SortableTh label="Users" field="userCount" sort={sort} onSort={toggleSort} />
                <SortableTh label="Avg rating" field="avgRating" sort={sort} onSort={toggleSort} />
                <SortableTh label="Avg initial level" field="avgInitialLevel" sort={sort} onSort={toggleSort} />
                <SortableTh label="Avg current level" field="avgCurrentLevel" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Type(s)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={isMakeup ? 8 : 7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No products in this category.</td></tr>
              ) : rows.map((r) => (
                <tr key={`${r.brand}::${r.name}::${r.shade ?? ''}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{r.name}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.brand}</td>
                  {isMakeup && (
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.shade ?? '—'}</td>
                  )}
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.userCount}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.avgRating != null ? `${r.avgRating.toFixed(1)} / 10` : '—'}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.avgInitialLevel != null ? `${r.avgInitialLevel.toFixed(0)}%` : '—'}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{r.avgCurrentLevel != null ? `${r.avgCurrentLevel.toFixed(0)}%` : '—'}</td>
                  <td className="px-4 py-3 text-[12px] capitalize" style={{ color: 'var(--ink-3)' }}>{r.types.length ? r.types.map((t) => fmtTag(t)).join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
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

  const repurchaseByCategory = useMemo(() => {
    const groups: Record<string, { answered: number; yes: number }> = {}
    for (const u of usage) {
      if (u.wouldRepurchase == null) continue
      const g = (groups[u.category] ??= { answered: 0, yes: 0 })
      g.answered++
      if (u.wouldRepurchase) g.yes++
    }
    return groups
  }, [usage])

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
      <EntryCount shown={usage.length} total={usage.length} label="usage log entry" />
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

      <Card>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Repurchase intent by category</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
            Asked when a product&apos;s estimated remaining level drops to 15% or below.
          </p>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
              {['Category', 'Responses', 'Would repurchase'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(repurchaseByCategory).length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>No repurchase responses yet.</td></tr>
            ) : Object.entries(repurchaseByCategory).map(([cat, g]) => (
              <tr key={cat} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-[13px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{cat.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{g.answered}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{Math.round((g.yes / g.answered) * 100)}%</td>
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
      <EntryCount shown={rows.length} total={rows.length} label="preference response" />
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
