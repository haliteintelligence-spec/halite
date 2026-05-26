'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, UserPlus, Power, Copy, Check, Trash2, Globe, Palette, ToggleLeft, ToggleRight, ShoppingBag, ExternalLink, Activity } from 'lucide-react'
import type { BrandDetail, BrandThemeConfig } from '@/lib/admin-api'

const PLANS = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']

interface LoginEvent {
  id: string
  adminEmail: string
  adminName: string
  ip: string | null
  method: 'LOGIN' | 'REGISTER' | 'IMPERSONATE'
  createdAt: string
}

export default function BrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const router = useRouter()
  const [brand, setBrand] = useState<BrandDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', plan: '', active: true })
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', password: '', role: 'ADMIN' })
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [wlEnabled, setWlEnabled] = useState(false)
  const [wlUrl, setWlUrl] = useState('')
  const [wlTheme, setWlTheme] = useState<BrandThemeConfig | null>(null)
  const [scraping, setScraping] = useState(false)
  const [savingWl, setSavingWl] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const [error, setError] = useState('')
  const [entering, setEntering] = useState(false)
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  function token() {
    return document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  }

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { brand: BrandDetail }
      setBrand(data.brand)
      setForm({ name: data.brand.name, plan: data.brand.plan, active: data.brand.active })
      setWlEnabled(data.brand.whiteLabelEnabled ?? false)
      setWlUrl(data.brand.brandWebsiteUrl ?? '')
      setWlTheme(data.brand.brandThemeConfig ?? null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [brandId])

  async function loadLoginEvents() {
    setLoadingEvents(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/login-events`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { events: LoginEvent[] }
      setLoginEvents(data.events)
    }
    setLoadingEvents(false)
  }

  useEffect(() => { loadLoginEvents() }, [brandId])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ name: form.name, plan: form.plan, active: form.active }),
      })
      if (!res.ok) throw new Error('Failed to save')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAddingAdmin(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify(newAdmin),
      })
      if (!res.ok) throw new Error('Failed to add admin')
      setNewAdmin({ email: '', name: '', password: '', role: 'ADMIN' })
      setShowAddAdmin(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add admin')
    } finally {
      setAddingAdmin(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleResetPassword(adminId: string) {
    if (newPassword.length < 8) return
    setResettingPassword(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/admins/${adminId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) throw new Error('Failed to reset password')
      setResetPasswordFor(null)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== brand!.slug) return
    setDeleting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}`, {
        method: 'DELETE',
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete brand')
      router.push('/admin/brands')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  async function handleScrapeTheme() {
    if (!wlUrl) return
    setScraping(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/scrape-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ url: wlUrl }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const data = await res.json() as { theme: BrandThemeConfig }
      setWlTheme(data.theme)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed')
    } finally {
      setScraping(false)
    }
  }

  async function handleSaveWhiteLabel() {
    setSavingWl(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/white-label`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ whiteLabelEnabled: wlEnabled, brandWebsiteUrl: wlUrl || null, brandThemeConfig: wlTheme }),
      })
      if (!res.ok) throw new Error('Failed to save white-label config')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingWl(false)
    }
  }

  async function enterDashboard() {
    setEntering(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/impersonate`, {
        method: 'POST',
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json() as { token: string; slug: string }
      document.cookie = `halite_token=${data.token}; path=/; max-age=86400; SameSite=Lax`
      window.open(`/${data.slug}`, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter dashboard')
    } finally {
      setEntering(false)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 p-8" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  )

  if (!brand) return <div className="p-8"><p className="text-sm" style={{ color: 'var(--ink-3)' }}>Brand not found.</p></div>

  const railwayBase = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')

  return (
    <div className="max-w-3xl">
      <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Brands
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{brand.name}</h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>{brand.slug}</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={brand.active ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#f3f4f6', color: '#6b7280' }}>
          {brand.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Consumers', value: brand._count.endUsers },
          { label: 'Products', value: brand._count.products },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
            <p className="text-xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Edit */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Brand Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Plan</label>
            <div className="flex gap-2">
              {PLANS.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, plan: p }))}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: form.plan === p ? 'var(--clay)' : 'var(--sand-1)',
                    color: form.plan === p ? 'white' : 'var(--ink)',
                    border: `1px solid ${form.plan === p ? 'var(--clay)' : 'var(--border)'}`,
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{
                background: form.active ? '#d4f4dd' : '#fee2e2',
                color: form.active ? '#1a7a3c' : '#b91c1c',
              }}>
              <Power size={12} />
              {form.active ? 'Active' : 'Inactive'}
            </button>
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Click to toggle</span>
          </div>
        </div>
        {error && <p className="text-[12px] mt-3" style={{ color: '#e57373' }}>{error}</p>}
        <button onClick={handleSave} disabled={saving}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--clay)' }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Changes
        </button>
      </div>

      {/* Login info + API key */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Dashboard Access</h2>
          <button
            onClick={enterDashboard}
            disabled={entering || !brand.active}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-85"
            style={{ background: 'var(--clay)' }}
          >
            {entering ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
            {entering ? 'Entering…' : 'Enter Dashboard'}
          </button>
        </div>
        {[
          { label: 'Slug', value: brand.slug, key: 'slug' },
          { label: 'Login URL (custom domain)', value: `${brand.slug}.haliteintelligence.com/login`, key: 'url', href: `https://${brand.slug}.haliteintelligence.com/login` },
          { label: 'Login URL (Railway)', value: `${railwayBase}/${brand.slug}/login`, key: 'rail' },
          { label: 'API Key', value: brand.apiKey, key: 'apikey' },
        ].map(({ label, value, key }, i, arr) => (
          <div key={key} className="flex items-center justify-between py-2"
            style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}>
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
              <p className="text-[12px] font-mono truncate" style={{ color: 'var(--ink)' }}>{value}</p>
            </div>
            <button onClick={() => copy(value, key)} className="flex-shrink-0">
              {copied === key ? <Check size={13} style={{ color: '#1a7a3c' }} /> : <Copy size={13} style={{ color: 'var(--ink-3)' }} />}
            </button>
          </div>
        ))}
      </div>

      {/* Shopify Integration Instructions */}
      {(() => {
        const accent = brand.primaryColor ?? '#450F2A'
        const embedCode = `<script\n  src="https://cdn.haliteintelligence.com/widget.js"\n  data-api-key="${brand.apiKey}"\n  data-accent="${accent}"\n></script>`
        return (
          <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={14} style={{ color: 'var(--ink-3)' }} />
              <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                Shopify Integration for {brand.name}
              </h2>
            </div>

            <ol className="space-y-4 text-[13px]" style={{ color: 'var(--ink)' }}>
              <li>
                <span className="font-semibold">1.</span> In the Halite dashboard, go to <strong>Settings → Widget</strong> and copy the embed code below.
                <div className="relative mt-2">
                  <pre
                    className="rounded-xl p-4 text-[12px] leading-relaxed overflow-x-auto"
                    style={{ background: 'var(--ink)', color: '#FAF6F0' }}
                  >
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(embedCode)
                      setEmbedCopied(true)
                      setTimeout(() => setEmbedCopied(false), 2000)
                    }}
                    className="absolute top-3 right-3 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: embedCopied ? 'var(--clay)' : 'rgba(255,255,255,0.15)', color: embedCopied ? 'white' : '#FAF6F0' }}
                  >
                    {embedCopied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </li>
              <li className="text-[13px]" style={{ color: 'var(--ink)' }}>
                <span className="font-semibold">2.</span> In <strong>Shopify Admin</strong>, go to <strong>Online Store → Themes → ⋯ → Edit code</strong>.
              </li>
              <li className="text-[13px]" style={{ color: 'var(--ink)' }}>
                <span className="font-semibold">3.</span> Open <code className="rounded px-1 py-0.5 text-[12px] font-mono" style={{ background: 'var(--sand-1)' }}>layout/theme.liquid</code> and paste the script tag just before <code className="rounded px-1 py-0.5 text-[12px] font-mono" style={{ background: 'var(--sand-1)' }}>&lt;/body&gt;</code>.
              </li>
              <li className="text-[13px]" style={{ color: 'var(--ink)' }}>
                <span className="font-semibold">4.</span> Add trigger attributes to any button or link to open a specific widget mode:
                <div className="mt-2 space-y-1.5">
                  {[
                    { attr: 'data-halite-quiz', label: 'Quiz + routine', example: `<button data-halite-quiz>Take the skin quiz</button>` },
                    { attr: 'data-halite-checkin', label: 'Weekly check-in', example: `<button data-halite-checkin>Log your skin update</button>` },
                    { attr: 'data-halite-progress', label: 'Progress view', example: `<button data-halite-progress>See my progress</button>` },
                    { attr: 'data-halite-reorder', label: 'Reorder reminders', example: `<button data-halite-reorder>Reorder my routine</button>` },
                  ].map(({ attr, label, example }) => (
                    <div key={attr} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--sand-1)' }}>
                      <code className="text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5" style={{ color: 'var(--clay)' }}>{attr}</code>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{label}</p>
                        <p className="text-[11px] font-mono truncate" style={{ color: 'var(--ink-3)' }}>{example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
              <li className="text-[13px]" style={{ color: 'var(--ink)' }}>
                <span className="font-semibold">5.</span> Save — the widget loads on every storefront page and activates when a trigger element is clicked.
              </li>
            </ol>
          </div>
        )
      })()}

      {/* Admins */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Team Members</h2>
          <button onClick={() => setShowAddAdmin(!showAddAdmin)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
            <UserPlus size={12} /> Add Member
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {brand.admins.map(admin => (
            <div key={admin.id}>
              <div className="flex items-center justify-between py-2" style={{ borderBottom: resetPasswordFor === admin.id ? 'none' : '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{admin.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{admin.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                    {admin.role}
                  </span>
                  <button
                    onClick={() => { setResetPasswordFor(resetPasswordFor === admin.id ? null : admin.id); setNewPassword('') }}
                    className="text-[11px] px-2 py-0.5 rounded-lg hover:underline"
                    style={{ color: 'var(--clay)' }}>
                    Reset pw
                  </button>
                </div>
              </div>
              {resetPasswordFor === admin.id && (
                <div className="flex gap-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <input type="text" placeholder="New password (min 8 chars)" value={newPassword} minLength={8}
                    onChange={e => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-mono outline-none"
                    style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
                  <button onClick={() => handleResetPassword(admin.id)} disabled={resettingPassword || newPassword.length < 8}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--clay)' }}>
                    {resettingPassword ? '…' : 'Set'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--sand-1)' }}>
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="Name" value={newAdmin.name}
                onChange={e => setNewAdmin(a => ({ ...a, name: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <input required type="email" placeholder="Email" value={newAdmin.email}
                onChange={e => setNewAdmin(a => ({ ...a, email: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="Password (min 8 chars)" value={newAdmin.password} minLength={8}
                onChange={e => setNewAdmin(a => ({ ...a, password: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <select value={newAdmin.role} onChange={e => setNewAdmin(a => ({ ...a, role: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddAdmin(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                Cancel
              </button>
              <button type="submit" disabled={addingAdmin}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--clay)' }}>
                {addingAdmin ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* White Label */}
      <div className="rounded-xl p-5 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>White Label</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>Apply the brand's own visual identity to the Halite platform.</p>
          </div>
          <button
            onClick={() => { setWlEnabled(e => !e) }}
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
                placeholder="https://brand-website.com"
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

      {/* Login Activity */}
      <div className="rounded-xl p-5 mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={13} style={{ color: 'var(--ink-3)' }} />
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Login Activity</h2>
        </div>
        {loadingEvents ? (
          <div className="flex items-center gap-2 py-2" style={{ color: 'var(--ink-3)' }}>
            <Loader2 size={13} className="animate-spin" />
            <span className="text-[12px]">Loading…</span>
          </div>
        ) : loginEvents.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>No login activity yet.</p>
        ) : (
          <div>
            {loginEvents.map((ev, i) => (
              <div key={ev.id} className="flex items-center justify-between py-2.5"
                style={i < loginEvents.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}>
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{ev.adminName}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={
                        ev.method === 'LOGIN' ? { background: '#d4f4dd', color: '#1a7a3c' } :
                        ev.method === 'REGISTER' ? { background: '#dbeafe', color: '#1d4ed8' } :
                        { background: '#fef3c7', color: '#92400e' }
                      }>
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
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-5 mt-4" style={{ background: 'var(--surface)', border: '1px solid #fca5a5' }}>
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-1" style={{ color: '#b91c1c' }}>Danger Zone</h2>
        <p className="text-[12px] mb-4" style={{ color: 'var(--ink-3)' }}>
          Permanently delete this brand and all its data — consumers, products, check-ins, and team members. This cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#dc2626' }}>
            <Trash2 size={13} /> Delete Brand
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
              Type <span className="font-mono font-bold">{brand.slug}</span> to confirm deletion:
            </p>
            <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={brand.slug}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ border: '1px solid #fca5a5', background: '#fff1f2', color: 'var(--ink)' }} />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirmText !== brand.slug}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#dc2626' }}>
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
