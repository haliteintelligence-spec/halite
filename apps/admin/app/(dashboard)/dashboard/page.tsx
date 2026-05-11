'use client'

import useSWR from 'swr'
import { API_URL, adminHeaders } from '@/lib/api'
import { Store, Users, Activity, Sparkles } from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url, { headers: adminHeaders() }).then(r => r.json())

const STAT_CARDS = [
  { key: 'brands',   label: 'Active brands',     icon: Store,    color: '#f09118' },
  { key: 'users',    label: 'Total consumers',    icon: Users,    color: '#450F2A' },
  { key: 'checkIns', label: 'Check-ins (30d)',    icon: Activity, color: '#059669' },
  { key: 'routines', label: 'Routines generated', icon: Sparkles, color: '#2563eb' },
]

export default function AdminDashboardPage() {
  const { data, isLoading } = useSWR(`${API_URL}/admin/stats`, fetcher)
  const { data: brandsData } = useSWR(`${API_URL}/brands`, fetcher)

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>
          Platform Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          All brands · Halite Intelligence
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="bg-white rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-3)' }}>
                {label}
              </p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {isLoading ? '—' : (data?.[key] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Recent brands */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Recent brands</h2>
          <a href="/brands" className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            View all →
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
              {['Brand', 'Plan', 'Users', 'Products', 'Status'].map(h => (
                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!brandsData?.brands?.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>
                  {brandsData ? 'No brands yet.' : 'Loading…'}
                </td>
              </tr>
            ) : (
              brandsData.brands.slice(0, 5).map((b: any) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-[#f5f0eb] transition-colors" style={{ borderColor: 'var(--border-sub)' }}>
                  <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>
                    <a href={`/brands/${b.id}`} className="hover:underline">{b.name}</a>
                  </td>
                  <td className="px-5 py-3 capitalize text-sm" style={{ color: 'var(--text-2)' }}>
                    {b.plan.toLowerCase()}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{b._count?.endUsers ?? 0}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-2)' }}>{b._count?.products ?? 0}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.active ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                      {b.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
