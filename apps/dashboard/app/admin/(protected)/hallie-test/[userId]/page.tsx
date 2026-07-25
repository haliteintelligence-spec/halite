'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

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
        <Card>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'Name', 'Category', 'Rating', 'Initial level'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!productsData?.products?.length ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-3)' }}>{productsData ? 'No products yet.' : 'Loading…'}</td></tr>
              ) : productsData.products.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{p.brand}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.name}</td>
                  <td className="px-4 py-3 text-[12px] capitalize" style={{ color: 'var(--ink-3)' }}>{fmt(p.category)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.rating} / 10</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>{p.initialLevel}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
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
