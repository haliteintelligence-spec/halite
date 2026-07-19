'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { API_URL, adminHeaders } from '@/lib/api'
import { ArrowLeft, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url, { headers: adminHeaders() }).then(r => r.json())
const cardCls = 'bg-white rounded-2xl border overflow-hidden'
const cardStyle = { borderColor: 'var(--border)' }

const TABS = ['profile', 'products', 'logs', 'preferences', 'feedback', 'activity'] as const
type Tab = (typeof TABS)[number]

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HallieTestUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const [tab, setTab] = useState<Tab>('profile')

  const { data: profileData } = useSWR(`${API_URL}/admin/hallie-test/users/${userId}`, fetcher)
  const { data: productsData } = useSWR(
    tab === 'products' ? `${API_URL}/admin/hallie-test/users/${userId}/products` : null, fetcher
  )
  const { data: logsData } = useSWR(
    tab === 'logs' ? `${API_URL}/admin/hallie-test/users/${userId}/logs` : null, fetcher
  )
  const { data: prefsData } = useSWR(
    tab === 'preferences' ? `${API_URL}/admin/hallie-test/users/${userId}/preferences` : null, fetcher
  )
  const { data: feedbackData } = useSWR(
    tab === 'feedback' ? `${API_URL}/admin/hallie-test/users/${userId}/feedback` : null, fetcher
  )
  const { data: activityData } = useSWR(
    tab === 'activity' ? `${API_URL}/admin/hallie-test/users/${userId}/activity` : null, fetcher
  )

  const user = profileData?.user

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/hallie-test" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-3)' }}>
          <ArrowLeft size={13} /> All users
        </a>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>{user.name}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          {user.email}{user.city ? ` · ${user.city}${user.country ? `, ${user.country}` : ''}` : ''}
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[13px] font-medium capitalize relative transition-colors whitespace-nowrap"
            style={{ color: tab === t ? 'var(--text-1)' : 'var(--text-3)' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--text-1)' }} />}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className={cardCls} style={cardStyle}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6">
            {[
              ['Name', user.name], ['Email', user.email], ['Phone', user.phone ?? '—'],
              ['City', user.city ?? '—'], ['Country', user.country ?? '—'], ['Timezone', user.timezone ?? '—'],
              ['Birthday', fmtDate(user.birthday)], ['Signed up', fmtDate(user.createdAt)],
              ['Points balance', user.pointsBalance], ['Synced to Halite', user.haliteConsumerId ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className={cardCls} style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                {['Brand', 'Name', 'Category', 'Rating', 'Remaining'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!productsData?.products?.length ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>{productsData ? 'No products yet.' : 'Loading…'}</td></tr>
              ) : productsData.products.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{p.brand}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{p.name}</td>
                  <td className="px-5 py-3 text-xs capitalize" style={{ color: 'var(--text-3)' }}>{p.category.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{p.rating} / 10</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{p.currentLevel}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
          {!logsData?.logs?.length ? (
            <div className={`${cardCls} p-8 text-center`} style={cardStyle}>
              <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>{logsData ? 'No logs yet.' : 'Loading…'}</p>
            </div>
          ) : logsData.logs.map((log: any) => (
            <div key={log.id} className={cardCls} style={cardStyle}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-sub)' }}>
                <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-1)' }}>{log.category.replace(/_/g, ' ')}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(log.date)}</span>
              </div>
              <div className="p-5 space-y-2">
                {(log.items ?? []).map((item: any) => (
                  <div key={item.id} className="text-sm flex items-center justify-between">
                    <span style={{ color: 'var(--text-2)' }}>{item.productBrand} {item.productName}</span>
                    {item.rating != null && <span style={{ color: 'var(--text-3)' }}>{item.rating}/5</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'preferences' && (
        <div className="space-y-3">
          {!prefsData?.preferences?.length ? (
            <div className={`${cardCls} p-8 text-center`} style={cardStyle}>
              <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>{prefsData ? 'No preferences answered yet.' : 'Loading…'}</p>
            </div>
          ) : prefsData.preferences.map((pref: any) => (
            <div key={pref.category} className={cardCls} style={cardStyle}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-sub)' }}>
                <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-1)' }}>{pref.category.replace(/_/g, ' ')}</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {Object.entries(pref.answers).map(([q, a]) => (
                  <div key={q}>
                    <p className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-0.5" style={{ color: 'var(--text-3)' }}>{q.replace(/_/g, ' ')}</p>
                    <p className="text-sm" style={{ color: 'var(--text-1)' }}>{Array.isArray(a) ? a.join(', ') : String(a)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'feedback' && (
        <div className={cardCls} style={cardStyle}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                {['Rating', 'Comment', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!feedbackData?.feedback?.length ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>{feedbackData ? 'No feedback yet.' : 'Loading…'}</td></tr>
              ) : feedbackData.feedback.map((f: any) => (
                <tr key={f.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{f.rating} / 5</td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{f.comment ?? '—'}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'activity' && activityData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Active days', activityData.activeDayCount],
              ['Logins', activityData.loginEvents?.length ?? 0],
              ['Points transactions', activityData.pointsTransactions?.length ?? 0],
              ['Milestones earned', activityData.milestoneAwards?.length ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>{label}</p>
                <p className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
              </div>
            ))}
          </div>

          <div className={cardCls} style={cardStyle}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Consent history</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                  {['Type', 'Granted', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activityData.consentHistory ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                    <td className="px-5 py-3 capitalize" style={{ color: 'var(--text-1)' }}>{c.type.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.granted ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {c.granted ? 'Granted' : 'Withdrawn'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={cardCls} style={cardStyle}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Points ledger</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                  {['Reason', 'Amount', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(activityData.pointsTransactions ?? []).map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                    <td className="px-5 py-3" style={{ color: 'var(--text-1)' }}>{t.reason}</td>
                    <td className="px-5 py-3" style={{ color: t.amount < 0 ? '#dc2626' : '#059669' }}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{fmtDate(t.createdAt)}</td>
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
