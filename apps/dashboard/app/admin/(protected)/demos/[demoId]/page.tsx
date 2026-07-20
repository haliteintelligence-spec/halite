'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, RefreshCw, Trash2, ExternalLink, Clock, Check, Loader2, ArrowLeft, Globe, Palette, ToggleLeft, ToggleRight, Save, Power, ChevronDown, ChevronRight, ArrowRight, Zap } from 'lucide-react'
import type { DemoDetail, BrandThemeConfig } from '@/lib/admin-api'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { DemoDetailTabs } from './_tabs'

export default function DemoDetailPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const router = useRouter()
  const [demo, setDemo] = useState<DemoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [showExtendInput, setShowExtendInput] = useState(false)
  const [extendDays, setExtendDays] = useState(15)
  const [wlEnabled, setWlEnabled] = useState(false)
  const [wlUrl, setWlUrl] = useState('')
  const [wlTheme, setWlTheme] = useState<BrandThemeConfig | null>(null)
  const [scraping, setScraping] = useState(false)
  const [savingWl, setSavingWl] = useState(false)
  const [brandUrl, setBrandUrl] = useState('')
  const [savingBrandUrl, setSavingBrandUrl] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [wlOpen, setWlOpen] = useState(false)
  const [demoName, setDemoName] = useState('')
  const [demoFocusAreas, setDemoFocusAreas] = useState<string[]>([])
  const [savingSettings, setSavingSettings] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertForm, setConvertForm] = useState({ plan: 'STARTER', adminEmail: '', adminName: '', adminPhone: '', adminPassword: '' })
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')
  const [convertedBrandId, setConvertedBrandId] = useState<string | null>(null)
  const [seedingUploads, setSeedingUploads] = useState(false)
  const [uploadSeeded, setUploadSeeded] = useState(false)
  const [retryingGeneration, setRetryingGeneration] = useState(false)

  const FOCUS_AREAS = ['SKINCARE', 'HAIR', 'BODY', 'MAKEUP', 'FRAGRANCE', 'WELLNESS']
  const PLANS = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']

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
      setBrandUrl(data.demo.brandWebsiteUrl ?? '')
      setWlTheme(data.demo.brandThemeConfig ?? null)
      setDemoName(data.demo.name ?? data.demo.prospectName ?? '')
      setDemoFocusAreas(data.demo.focusAreas ?? [])
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

  async function handleRetryGeneration() {
    setRetryingGeneration(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      })
      await load()
    } finally {
      setRetryingGeneration(false)
    }
  }

  async function extendAccess() {
    setExtending(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ days: extendDays }),
    })
    await load()
    setExtending(false)
    setShowExtendInput(false)
  }

  async function toggleActive() {
    if (!demo) return
    setTogglingActive(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ active: !demo.active }),
    })
    await load()
    setTogglingActive(false)
  }

  async function enterDashboard() {
    if (!demo) return
    setEntering(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}/impersonate`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json() as { token: string; slug: string }
      document.cookie = `halite_token=${data.token}; path=/${data.slug}; max-age=86400; SameSite=Lax`
      window.open(`https://portal.haliteintelligence.com/${data.slug}`, '_blank')
    } finally {
      setEntering(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete demo for "${demo?.prospectName}"? This cannot be undone.`)) return
    setDeleting(true)
    setDeleteError('')
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Failed to delete demo (${res.status})`)
      router.push('/admin/demos')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  async function handleSaveBrandUrl() {
    setSavingBrandUrl(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ brandWebsiteUrl: brandUrl || null }),
      })
      setWlUrl(brandUrl)
    } finally {
      setSavingBrandUrl(false)
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${demoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: demoName, focusAreas: demoFocusAreas, brandWebsiteUrl: brandUrl || null }),
      })
      setWlUrl(brandUrl)
      await load()
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSeedUploads() {
    setSeedingUploads(true)
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}/seed-uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) setUploadSeeded(true)
    } finally {
      setSeedingUploads(false)
    }
  }

  async function handleConvert() {
    setConverting(true)
    setConvertError('')
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(convertForm),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error ?? 'Conversion failed')
      }
      const data = await res.json() as { brandId: string }
      setConvertedBrandId(data.brandId)
      await load()
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setConverting(false)
    }
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
          <button
            onClick={toggleActive}
            disabled={togglingActive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity disabled:opacity-40"
            style={{
              background: demo.active ? '#d4f4dd' : '#fee2e2',
              color: demo.active ? '#1a7a3c' : '#b91c1c',
            }}
          >
            {togglingActive ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
            {demo.active ? 'Active' : 'Inactive'}
          </button>
          <StatusBadge status={demo.status} />
        </div>
      </div>

      <DemoDetailTabs demoId={demoId} />

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

      {demo.status === 'failed' && (
        <div
          className="rounded-xl p-5 mb-6 flex items-center justify-between gap-5"
          style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}
        >
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#b91c1c' }}>
              Demo generation failed
            </p>
            <p className="text-[12px]" style={{ color: '#991b1b' }}>
              {demo.demoProvisioningError?.message ?? 'Provisioning failed after 3 attempts.'}
            </p>
          </div>
          <button
            onClick={handleRetryGeneration}
            disabled={retryingGeneration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: '#b91c1c' }}
          >
            {retryingGeneration ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {retryingGeneration ? 'Retrying…' : 'Retry Generation'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Consumers" value={demo.stats?.consumers ?? demo.consumerCount} />
        <StatCard label="Products" value={demo.stats?.products ?? demo.productCount} />
        <StatCard label="Routines" value={demo.stats?.routines ?? '—'} />
        <StatCard label="Check-ins" value={demo.stats?.checkIns ?? '—'} />
      </div>

      <div
        className="rounded-xl mb-4 overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={() => setAccessOpen(o => !o)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
              Access Credentials
            </h2>
            {accessOpen ? <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />}
          </button>
          <button
            onClick={enterDashboard}
            disabled={entering || !demo.active}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-85"
            style={{ background: 'var(--clay)' }}
          >
            {entering ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            {entering ? 'Entering…' : 'Enter Dashboard'}
          </button>
        </div>
        {accessOpen && (
          <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <CredRow
              label="Login URL"
              value={`https://portal.haliteintelligence.com/${demo.slug}/login`}
              onCopy={() => copyText(`https://portal.haliteintelligence.com/${demo.slug}/login`, 'url')}
              copied={copied === 'url'}
              isLink
            />
            <CredRow label="Email" value={demo.email ?? ''} onCopy={() => copyText(demo.email ?? '', 'email')} copied={copied === 'email'} />
            <CredRow label="Password" value={demo.password} onCopy={() => copyText(demo.password, 'pw')} copied={copied === 'pw'} />
          </div>
        )}
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
          {!showExtendInput ? (
            <button
              onClick={() => setShowExtendInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              <RefreshCw size={12} />
              {daysLeft !== null && daysLeft > 0 ? 'Extend' : 'Reactivate'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={extendDays}
                  onChange={e => setExtendDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-10 text-center text-[12px] outline-none bg-transparent"
                  style={{ color: 'var(--ink)' }}
                />
                <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>days</span>
              </div>
              <button
                onClick={() => setShowExtendInput(false)}
                className="px-2 py-1.5 rounded-lg text-[11px]"
                style={{ color: 'var(--ink-3)' }}
              >
                Cancel
              </button>
              <button
                onClick={extendAccess}
                disabled={extending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--clay)' }}
              >
                {extending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demo Settings */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Demo Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Prospect / Brand Name</label>
            <input
              type="text" value={demoName} onChange={e => setDemoName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Brand Website URL</label>
            <div className="relative">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
              <input
                type="url" placeholder="https://prospect-website.com" value={brandUrl}
                onChange={e => { setBrandUrl(e.target.value); setWlUrl(e.target.value) }}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Focus Areas</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(a => {
                const active = demoFocusAreas.includes(a)
                return (
                  <button key={a} type="button"
                    onClick={() => setDemoFocusAreas(f => active ? f.filter(x => x !== a) : [...f, a])}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{ background: active ? 'var(--clay)' : 'var(--sand-1)', color: active ? 'white' : 'var(--ink)', border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}` }}>
                    {a}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={savingSettings}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--clay)' }}>
          {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Settings
        </button>
      </div>

      {/* Seed AI-generated catalog files */}
      {!uploadSeeded && (
        <div className="rounded-xl p-5 mb-4 flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-0.5" style={{ color: 'var(--ink-3)' }}>AI Generated Files</h2>
            <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Seed downloadable XLSX files in the catalog upload history.</p>
          </div>
          <button
            onClick={handleSeedUploads}
            disabled={seedingUploads}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: 'var(--clay)' }}
          >
            {seedingUploads ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {seedingUploads ? 'Seeding…' : 'Seed Files'}
          </button>
        </div>
      )}
      {uploadSeeded && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-2" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <Check size={13} style={{ color: '#16a34a' }} />
          <p className="text-[12px] font-medium" style={{ color: '#166534' }}>AI files seeded — visit the brand's catalog page to download them.</p>
        </div>
      )}

      {/* Convert to Paying Brand */}
      {demo.converted ? (
        <div className="rounded-xl p-5 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-1" style={{ color: '#166534' }}>Converted to Paying Brand</h2>
              <p className="text-[12px]" style={{ color: '#15803d' }}>This demo has been converted. The demo data is preserved here.</p>
            </div>
            {convertedBrandId && (
              <button onClick={() => router.push(`/admin/brands/${convertedBrandId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                style={{ background: '#16a34a' }}>
                View Brand <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl mb-4 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setConvertOpen(o => !o)}
            className="w-full flex items-center justify-between p-5 hover:bg-black/[0.02] transition-colors"
          >
            <div>
              <h2 className="text-[11px] font-semibold tracking-wide uppercase text-left" style={{ color: 'var(--ink-3)' }}>Convert to Paying Brand</h2>
              <p className="text-[11px] mt-0.5 text-left" style={{ color: 'var(--ink-3)' }}>Create a new active brand account from this demo.</p>
            </div>
            {convertOpen ? <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />}
          </button>
          {convertOpen && (
            <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-[12px] mt-4 mb-4" style={{ color: 'var(--ink-3)' }}>
                Creates a new active brand account. The demo environment is preserved and set to inactive.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Admin Email *</label>
                    <input type="email" value={convertForm.adminEmail}
                      onChange={e => setConvertForm(f => ({ ...f, adminEmail: e.target.value }))}
                      placeholder="admin@brand.com"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Admin Name *</label>
                    <input type="text" value={convertForm.adminName}
                      onChange={e => setConvertForm(f => ({ ...f, adminName: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Phone</label>
                    <input type="tel" value={convertForm.adminPhone}
                      onChange={e => setConvertForm(f => ({ ...f, adminPhone: e.target.value }))}
                      placeholder="+1 555 000 0000"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Initial Password *</label>
                    <input type="text" value={convertForm.adminPassword} minLength={8}
                      onChange={e => setConvertForm(f => ({ ...f, adminPassword: e.target.value }))}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                      style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Plan</label>
                  <div className="flex gap-2">
                    {PLANS.map(p => (
                      <button key={p} type="button" onClick={() => setConvertForm(f => ({ ...f, plan: p }))}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                        style={{ background: convertForm.plan === p ? 'var(--clay)' : 'var(--sand-1)', color: convertForm.plan === p ? 'white' : 'var(--ink)', border: `1px solid ${convertForm.plan === p ? 'var(--clay)' : 'var(--border)'}` }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {convertError && <p className="text-[12px] mt-3" style={{ color: '#e57373' }}>{convertError}</p>}
              <button onClick={handleConvert}
                disabled={converting || !convertForm.adminEmail || !convertForm.adminName || convertForm.adminPassword.length < 8}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--clay)' }}>
                {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                {converting ? 'Converting…' : 'Convert to Paying Brand'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* White Label */}
      <div className="rounded-xl mb-4 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setWlOpen(o => !o)}
          className="w-full flex items-center justify-between p-5 hover:bg-black/[0.02] transition-colors"
        >
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide uppercase text-left" style={{ color: 'var(--ink-3)' }}>White Label Demo</h2>
            <p className="text-[11px] mt-0.5 text-left" style={{ color: 'var(--ink-3)' }}>Scrape the prospect's site to show them Halite in their own visual style.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[11px] font-semibold" style={{ color: wlEnabled ? 'var(--clay)' : 'var(--ink-3)' }}>
              {wlEnabled ? 'On' : 'Off'}
            </span>
            {wlOpen ? <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--ink-3)' }} />}
          </div>
        </button>

        {wlOpen && (
          <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mt-4 mb-4">
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Enable white-label theming for this demo</p>
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
        )}
      </div>

      <div className="flex flex-col items-end gap-2 mt-2">
        {deleteError && (
          <p className="text-[12px] font-medium" style={{ color: '#b91c1c' }}>{deleteError}</p>
        )}
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
    failed:        { label: 'Failed',     bg: '#fee2e2', color: '#b91c1c' },
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
