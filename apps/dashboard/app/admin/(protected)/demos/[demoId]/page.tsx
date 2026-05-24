'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, RefreshCw, Trash2, ExternalLink, Clock, Check, Loader2, ArrowLeft } from 'lucide-react'
import type { DemoDetail } from '@/lib/admin-api'

export default function DemoDetailPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const router = useRouter()
  const [demo, setDemo] = useState<DemoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { demo: DemoDetail }
      setDemo(data.demo)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [demoId])

  // poll while generating
  useEffect(() => {
    if (demo?.status !== 'generating') return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [demo?.status])

  async function extendAccess() {
    setExtending(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    await load()
    setExtending(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete demo for "${demo?.prospectName}"? This cannot be undone.`)) return
    setDeleting(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    router.push('/admin/demos')
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!demo) return (
    <p className="text-sm py-12" style={{ color: 'var(--ink-3)' }}>Demo not found.</p>
  )

  const daysLeft = demo.demoLinkExpiresAt
    ? Math.ceil((new Date(demo.demoLinkExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/demos" className="text-[12px] hover:underline flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={12} /> Demos
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            {demo.prospectName ?? demo.slug}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>{demo.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={demo.status} />
        </div>
      </div>

      {demo.status === 'generating' && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <Loader2 size={14} className="animate-spin" style={{ color: '#92400e' }} />
          <p className="text-sm" style={{ color: '#92400e' }}>
            Generating synthetic consumers and routines — this takes 2–3 minutes. Auto-refreshing.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Consumers" value={demo.stats?.consumers ?? demo.consumerCount} />
        <StatCard label="Products" value={demo.stats?.products ?? demo.productCount} />
        <StatCard label="Routines" value={demo.stats?.routines ?? '—'} />
        <StatCard label="Check-ins" value={demo.stats?.checkIns ?? '—'} />
      </div>

      <div
        className="rounded-xl p-5 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>
          Access Credentials
        </h2>
        <div className="space-y-3">
          <CredRow label="Login URL" value={demo.loginUrl} onCopy={() => copyText(demo.loginUrl, 'url')} copied={copied === 'url'} isLink />
          <CredRow label="Email" value={demo.email ?? ''} onCopy={() => copyText(demo.email ?? '', 'email')} copied={copied === 'email'} />
          <CredRow label="Password" value={demo.password} onCopy={() => copyText(demo.password, 'pw')} copied={copied === 'pw'} />
        </div>
      </div>

      <div
        className="rounded-xl p-5 mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>
          Access Window
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: 'var(--ink-3)' }} />
            {daysLeft === null ? (
              <span className="text-sm" style={{ color: 'var(--ink-3)' }}>No active window</span>
            ) : daysLeft <= 0 ? (
              <span className="text-sm" style={{ color: '#e57373' }}>Link expired</span>
            ) : (
              <span className="text-sm" style={{ color: 'var(--ink)' }}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                {demo.demoLinkExpiresAt && (
                  <span className="ml-1" style={{ color: 'var(--ink-3)' }}>
                    (expires {new Date(demo.demoLinkExpiresAt).toLocaleDateString()})
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={extendAccess}
            disabled={extending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            {extending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {daysLeft !== null && daysLeft > 0 ? 'Extend 15 days' : 'Reactivate'}
          </button>
        </div>
      </div>

      {demo.focusAreas?.length > 0 && (
        <div
          className="rounded-xl p-5 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
            Focus Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {demo.focusAreas.map(a => (
              <span
                key={a}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-50"
          style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c' }}
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete Demo
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--ink-3)' }}>
        {label}
      </p>
      <p className="text-xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    generating:    { label: 'Generating', bg: '#fef3c7', color: '#92400e' },
    active:        { label: 'Active',     bg: '#d4f4dd', color: '#1a7a3c' },
    expiring_soon: { label: 'Expiring',   bg: '#ffe4cc', color: '#9a3800' },
    access_expired:{ label: 'Expired',    bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status] ?? map.access_expired
  return (
    <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function CredRow({
  label, value, onCopy, copied, isLink,
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
  isLink?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink-3)' }}>
          {label}
        </p>
        <p className="text-[13px] font-mono" style={{ color: 'var(--ink)' }}>{value}</p>
      </div>
      <div className="flex items-center gap-2">
        {isLink && value && (
          <a href={value} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} style={{ color: 'var(--ink-3)' }} />
          </a>
        )}
        <button onClick={onCopy} className="p-1">
          {copied ? <Check size={13} style={{ color: '#1a7a3c' }} /> : <Copy size={13} style={{ color: 'var(--ink-3)' }} />}
        </button>
      </div>
    </div>
  )
}
