'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpDown, Trash2 } from 'lucide-react'
import { MultiSelectFilter } from '../_multi-select-filter'

function adminHeaders(): Record<string, string> {
  const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const TABS = ['profile', 'products', 'logs', 'preferences', 'feedback', 'activity'] as const
type Tab = (typeof TABS)[number]

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Category/type fields come from hallie_testing_* tables owned by a separate
// app (see comment atop the API route) and aren't guaranteed non-null here —
// a bad row for one user shouldn't crash the whole tab.
function fmt(s: string | null | undefined) {
  return s ? s.replace(/_/g, ' ') : '—'
}

// Birthday is a date-only value serialized as UTC midnight (the source
// column has no time-of-day/timezone component), unlike the real
// timestamps fmtDate above is used for — so it must stay pinned to UTC
// here rather than rendering in the viewer's local timezone, or it
// silently displays a day earlier for anyone behind UTC.
function fmtBirthday(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function useHallieTestFetch<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; status: 'loading' | 'success' | 'error' }>({ data: null, status: 'loading' })
  useEffect(() => {
    if (!path) return
    setState({ data: null, status: 'loading' })
    fetch(`${API_URL}${path}`, { headers: adminHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Request failed (${r.status})`))))
      .then((data) => setState({ data, status: 'success' }))
      .catch(() => setState({ data: null, status: 'error' }))
  }, [path])
  return state
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
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

type ProductSortField = 'brand' | 'name' | 'categories' | 'productTypes' | 'rating' | 'initialLevel' | 'currentLevel'

const PRODUCT_COLUMNS: { label: string; field: ProductSortField }[] = [
  { label: 'Brand', field: 'brand' },
  { label: 'Name', field: 'name' },
  { label: 'Categories', field: 'categories' },
  { label: 'Product Type(s)', field: 'productTypes' },
  { label: 'Rating', field: 'rating' },
  { label: 'Initial Level', field: 'initialLevel' },
  { label: 'Current Level', field: 'currentLevel' },
]

// categories/productTypes are string[] (a product can span more than one
// category — see the API route's comment); sort on their joined text.
function productSortValue(p: any, field: ProductSortField): string | number {
  if (field === 'categories' || field === 'productTypes') {
    return Array.isArray(p[field]) ? p[field].join(', ') : ''
  }
  return p[field] ?? -Infinity
}

function UserProductsTable({ products, loading }: { products: any[]; loading: boolean }) {
  const [sort, setSort] = useState<{ field: ProductSortField; dir: 'asc' | 'desc' }>({ field: 'brand', dir: 'asc' })
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])

  const categories = useMemo(() => Array.from(new Set(products.flatMap((p) => (Array.isArray(p.categories) ? p.categories : [])))).sort(), [products])
  const types = useMemo(() => Array.from(new Set(products.flatMap((p) => (Array.isArray(p.productTypes) ? p.productTypes : [])))).sort(), [products])

  function toggleSort(field: ProductSortField) {
    setSort((s) => (s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }))
  }

  const rows = useMemo(() => {
    let r = products
    if (filterCategories.length > 0) r = r.filter((p) => Array.isArray(p.categories) && p.categories.some((c: string) => filterCategories.includes(c)))
    if (filterTypes.length > 0) r = r.filter((p) => Array.isArray(p.productTypes) && p.productTypes.some((t: string) => filterTypes.includes(t)))
    return [...r].sort((a, b) => {
      const av = productSortValue(a, sort.field)
      const bv = productSortValue(b, sort.field)
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [products, sort, filterCategories, filterTypes])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MultiSelectFilter label="Category" options={categories} selected={filterCategories} onChange={setFilterCategories} formatOption={fmt} />
        <MultiSelectFilter label="Product Type" options={types} selected={filterTypes} onChange={setFilterTypes} formatOption={fmt} />
      </div>
      <EntryCount shown={rows.length} total={products.length} label="product" />
      <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
              {PRODUCT_COLUMNS.map(({ label, field }) => (
                <th key={field} onClick={() => toggleSort(field)}
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
              <tr><td colSpan={PRODUCT_COLUMNS.length} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>{loading ? 'Loading…' : 'No products yet.'}</td></tr>
            ) : rows.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{p.brand}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.name}</td>
                <td className="px-4 py-3 text-[12px] capitalize" style={{ color: 'var(--ink-3)' }}>
                  {Array.isArray(p.categories) && p.categories.length ? p.categories.map((c: string) => fmt(c)).join(', ') : '—'}
                </td>
                <td className="px-4 py-3 text-[12px] capitalize" style={{ color: 'var(--ink-3)' }}>
                  {Array.isArray(p.productTypes) && p.productTypes.length ? p.productTypes.map((t: string) => fmt(t)).join(', ') : '—'}
                </td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.rating != null ? `${p.rating} / 10` : '—'}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.initialLevel != null ? `${p.initialLevel}%` : '—'}</td>
                <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.currentLevel != null ? `${p.currentLevel}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card>
    </div>
  )
}

export default function HallieTestUserPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('profile')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!user) return
    const confirmed = window.confirm(
      `Permanently delete ${user.name} (${user.email})? This deletes every product, log, and points record they have — this cannot be undone.`
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/admin/hallie-test/users/${userId}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/admin/hallie-test')
    } catch {
      window.alert("Couldn't delete this account — try again.")
      setDeleting(false)
    }
  }

  const { data: profileData, status: profileStatus } = useHallieTestFetch<{ user: any }>(`/admin/hallie-test/users/${userId}`)
  const { data: productsData } = useHallieTestFetch<{ products: any[] }>(tab === 'products' ? `/admin/hallie-test/users/${userId}/products` : null)
  const { data: logsData } = useHallieTestFetch<{ logs: any[] }>(tab === 'logs' ? `/admin/hallie-test/users/${userId}/logs` : null)
  const { data: prefsData } = useHallieTestFetch<{ preferences: any[] }>(tab === 'preferences' ? `/admin/hallie-test/users/${userId}/preferences` : null)
  const { data: feedbackData } = useHallieTestFetch<{ feedback: any[] }>(tab === 'feedback' ? `/admin/hallie-test/users/${userId}/feedback` : null)
  const { data: activityData } = useHallieTestFetch<any>(tab === 'activity' ? `/admin/hallie-test/users/${userId}/activity` : null)

  const user = profileData?.user

  if (profileStatus === 'error') {
    return (
      <div className="max-w-5xl">
        <Link href="/admin/hallie-test" className="inline-flex items-center gap-1.5 text-[13px] mb-4" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={13} /> All users
        </Link>
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>This user couldn&apos;t be found.</p>
      </div>
    )
  }

  if (!user) {
    return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Loading…</p>
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/hallie-test" className="inline-flex items-center gap-1.5 text-[13px] mb-4" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={13} /> All users
        </Link>
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{user.name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {user.email}{user.city ? ` · ${user.city}${user.country ? `, ${user.country}` : ''}` : ''}
        </p>
      </div>

      <div className="flex mb-6 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-2.5 text-[12px] font-medium capitalize transition-colors whitespace-nowrap"
            style={{ color: tab === t ? 'var(--ink)' : 'var(--ink-3)' }}>
            {t}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--clay)' }} />}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
            {[
              ['Name', user.name], ['Email', user.email], ['Phone', user.phone ?? '—'],
              ['City', user.city ?? '—'], ['Country', user.country ?? '—'], ['Timezone', user.timezone ?? '—'],
              ['Birthday', fmtBirthday(user.birthday)], ['Signed up', fmtDate(user.createdAt)],
              ['Points balance', user.pointsBalance], ['Synced to Halite', user.haliteConsumerId ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[10px] font-medium tracking-wide uppercase mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
                <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
              style={{ color: '#b91c1c', background: '#fee2e2', opacity: deleting ? 0.6 : 1 }}
            >
              <Trash2 size={13} />
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </Card>
      )}

      {tab === 'products' && (
        <UserProductsTable products={productsData?.products ?? []} loading={!productsData} />
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
          {logsData && <EntryCount shown={logsData.logs.length} total={logsData.logs.length} label="log" />}
          {!logsData?.logs?.length ? (
            <Card><p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>{logsData ? 'No logs yet.' : 'Loading…'}</p></Card>
          ) : logsData.logs.map((log: any) => (
            <Card key={log.id}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[13px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{fmt(log.category)}</span>
                <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>{fmtDate(log.date)}</span>
              </div>
              <div className="p-5 space-y-2">
                {(log.items ?? []).map((item: any) => (
                  <div key={item.id} className="text-[13px] flex items-center justify-between gap-2">
                    <span style={{ color: 'var(--ink)' }}>{item.productBrand} {item.productName}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {item.wouldRepurchase != null && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={item.wouldRepurchase ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#fde2e2', color: '#a11f1f' }}
                        >
                          {item.wouldRepurchase ? 'Would repurchase' : "Won't repurchase"}
                        </span>
                      )}
                      {item.rating != null && <span style={{ color: 'var(--ink-3)' }}>{item.rating}/5</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'preferences' && (
        <div className="space-y-3">
          {prefsData && <EntryCount shown={prefsData.preferences.length} total={prefsData.preferences.length} label="preference response" />}
          {!prefsData?.preferences?.length ? (
            <Card><p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>{prefsData ? 'No preferences answered yet.' : 'Loading…'}</p></Card>
          ) : prefsData.preferences.map((pref: any) => (
            <Card key={pref.category}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[13px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{fmt(pref.category)}</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {Object.entries(pref.answers ?? {}).map(([q, a]) => (
                  <div key={q}>
                    <p className="text-[10px] font-medium tracking-wide uppercase mb-0.5" style={{ color: 'var(--ink-3)' }}>{q.replace(/_/g, ' ')}</p>
                    <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{Array.isArray(a) ? a.join(', ') : String(a)}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedbackData && <EntryCount shown={feedbackData.feedback.length} total={feedbackData.feedback.length} label="feedback entry" />}
          <Card>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                  {['Rating', 'Comment', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!feedbackData?.feedback?.length ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>{feedbackData ? 'No feedback yet.' : 'Loading…'}</td></tr>
                ) : feedbackData.feedback.map((f: any) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{f.rating} / 5</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{f.comment ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>{fmtDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'activity' && activityData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Active days', activityData.activeDayCount],
              ['Logins', activityData.loginEvents?.length ?? 0],
              ['Points transactions', activityData.pointsTransactions?.length ?? 0],
              ['Milestones earned', activityData.milestoneAwards?.length ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] font-medium tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>{label}</p>
                <p className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{value}</p>
              </div>
            ))}
          </div>

          <Card>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Consent history</h2>
              <EntryCount shown={(activityData.consentHistory ?? []).length} total={(activityData.consentHistory ?? []).length} label="entry" />
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                  {['Type', 'Granted', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activityData.consentHistory ?? []).map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 text-[13px] capitalize" style={{ color: 'var(--ink)' }}>{fmt(c.type)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={c.granted ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#fee2e2', color: '#b91c1c' }}>
                        {c.granted ? 'Granted' : 'Withdrawn'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Points ledger</h2>
              <EntryCount shown={(activityData.pointsTransactions ?? []).length} total={(activityData.pointsTransactions ?? []).length} label="transaction" />
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                  {['Reason', 'Amount', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activityData.pointsTransactions ?? []).map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{t.reason}</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: t.amount < 0 ? '#b91c1c' : '#1a7a3c' }}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}
