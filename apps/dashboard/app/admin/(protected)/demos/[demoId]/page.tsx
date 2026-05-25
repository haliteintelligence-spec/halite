'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, RefreshCw, Trash2, ExternalLink, Clock, Check, Loader2, ArrowLeft, Globe, Palette, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import type { DemoDetail, BrandThemeConfig } from '@/lib/admin-api'
import { CircularProgress } from '@/components/ui/CircularProgress'

export default function DemoDetailPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const router = useRouter()
  const [demo, setDemo] = useState<DemoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [wlEnabled, setWlEnabled] = useState(false)
  const [wlUrl, setWlUrl] = useState('')
  const [wlTheme, setWlTheme] = useState<BrandThemeConfig | null>(null)
  const [scraping, setScraping] = useState(false)
  const [savingWl, setSavingWl] = useState(false)

  async function load() {
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { demo: DemoDetail }
      setDemo(data.demo)
      setWlEnabled(data.demo.whiteLabelEnabled ?? false)
      setWlUrl(data.demo.brandWebsiteUrl ?? '')
      setWlTheme(data.demo.brandThemeConfig ?? null)
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

  async function handleScrapeTheme() {
    if (!wlUrl) return
    setScraping(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}/scrape-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: wlUrl }),
      })
      if (res.ok) {
        const data = await res.json() as { theme: BrandThemeConfig }
        setWlTheme(data.theme)
      }
    } finally {
      setScraping(false)
    }
  }

  async function handleSaveWhiteLabel() {
    setSavingWl(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}/white-label`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ whiteLabelEnabled: wlEnabled, brandWebsiteUrl: wlUrl || null, brandThemeConfig: wlTheme }),
      })
    } finally {
      setSavingWl(false)
    }
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
          className="rounded-xl p-5 mb-6 flex items-center gap-5"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <div className="flex-shrink-0">
            <CircularProgress
              size={72}
              showLabel={false}
              startTime={new Date(demo.createdAt).getTime()}
            />
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#92400e' }}>
              Generating demo environment
            </p>
            <p className="text-[12px]" style={{ color: '#a16207' }}>
              Building synthetic consumers and routines — this takes 2–3 minutes. Auto-refreshing every 5 s.
            </p>
          </div>
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

      {/* White Label */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>White Label Demo</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Scrape the prospect's site to show them Halite in their own visual style.
            </p>
          </div>
          <button
            onClick={() => setWlEnabled(e => !e)}
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: wlEnabled ? 'var(--clay)' : 'var(--ink-3)' }}
          >
            {wlEnabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            {wlEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
              <input
                type="url"
                placeholder="https://prospect-website.com"
                value={wlUrl}
                onChange={e => setWlUrl(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] outline-none font-mono"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
            <button
              onClick={handleScrapeTheme}
              disabled={!wlUrl || scraping}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold disabled:opacity-40"
              style={{ background: 'var(--clay)', color: 'white' }}
            >
              {scraping ? <Loader2 size={12} className="animate-spin" /> : <Palette size={12} />}
              {scraping ? 'Scraping…' : 'Extract Theme'}
            </button>
          </div>

          {wlTheme && (
            <div className="rounded-lg p-3 space-y-3" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Extracted Theme Preview</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['Primary', wlTheme.primary],
                  ['Primary Light', wlTheme.primaryLight],
                  ['Accent', wlTheme.accent],
                  ['Background', wlTheme.background],
                  ['Text', wlTheme.text],
                  ['Border', wlTheme.border],
                ] as [string, string][]).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border" style={{ background: color, borderColor: 'var(--border)' }} />
                    <div>
                      <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>{label}</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--ink)' }}>{color}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-[11px]" style={{ color: 'var(--ink-2)' }}>
                <span>Sans: <strong>{wlTheme.fontSans}</strong></span>
                <span>Display: <strong>{wlTheme.fontDisplay}</strong></span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveWhiteLabel}
          disabled={savingWl}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--clay)' }}
        >
          {savingWl ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save White Label
        </button>
      </div>

      <div className="flex justify-end mt-2">
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
