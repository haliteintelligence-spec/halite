'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { DemoDetailTabs } from '../_tabs'

interface LoginEvent {
  id: string
  adminEmail: string
  adminName: string
  ip: string | null
  method: 'LOGIN' | 'REGISTER' | 'IMPERSONATE'
  createdAt: string
}

export default function DemoActivityPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const [demoName, setDemoName] = useState('')
  const [events, setEvents] = useState<LoginEvent[]>([])
  const [loading, setLoading] = useState(true)

  function token() {
    return document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  }

  useEffect(() => {
    async function load() {
      const [demoRes, eventsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
          headers: token() ? { Authorization: `Bearer ${token()}` } : {},
          cache: 'no-store',
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}/login-events`, {
          headers: token() ? { Authorization: `Bearer ${token()}` } : {},
          cache: 'no-store',
        }),
      ])
      if (demoRes.ok) {
        const data = await demoRes.json() as { demo: { prospectName?: string; slug: string } }
        setDemoName(data.demo.prospectName ?? data.demo.slug)
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json() as { events: LoginEvent[] }
        setEvents(data.events)
      }
      setLoading(false)
    }
    load()
  }, [demoId])

  const methodStyle = (method: LoginEvent['method']) => {
    if (method === 'LOGIN') return { background: '#d4f4dd', color: '#1a7a3c' }
    if (method === 'REGISTER') return { background: '#dbeafe', color: '#1d4ed8' }
    return { background: '#fef3c7', color: '#92400e' }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/demos" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Demos
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{demoName}</h1>
        <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>{demoId}</p>
      </div>

      <DemoDetailTabs demoId={demoId} />

      <div className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Login Activity</h2>
        </div>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center gap-2 py-6" style={{ color: 'var(--ink-3)' }}>
              <Loader2 size={13} className="animate-spin" />
              <span className="text-[12px]">Loading…</span>
            </div>
          ) : events.length === 0 ? (
            <p className="text-[12px] py-6" style={{ color: 'var(--ink-3)' }}>No login activity yet.</p>
          ) : (
            events.map((ev, i) => (
              <div key={ev.id} className="flex items-center justify-between py-3"
                style={i < events.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{ev.adminName}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={methodStyle(ev.method)}>
                      {ev.method}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {ev.adminEmail}{ev.ip ? ` · ${ev.ip}` : ''}
                  </p>
                </div>
                <p className="text-[11px] flex-shrink-0 tabular-nums" style={{ color: 'var(--ink-3)' }}>
                  {new Date(ev.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
