'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, UserPlus, Power, Copy, Check } from 'lucide-react'
import type { BrandDetail } from '@/lib/admin-api'

const PLANS = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']

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
  const [error, setError] = useState('')

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
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [brandId])

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

  if (loading) return (
    <div className="flex items-center gap-2 p-8" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  )

  if (!brand) return <div className="p-8"><p className="text-sm" style={{ color: 'var(--ink-3)' }}>Brand not found.</p></div>

  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? ''}/` + brand.slug + '/login'

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

      {/* Login info */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>Dashboard Access</h2>
        <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--ink-3)' }}>Login URL</p>
            <p className="text-[12px] font-mono" style={{ color: 'var(--ink)' }}>{brand.slug}.haliteintelligence.com</p>
          </div>
          <button onClick={() => copy(`https://${brand.slug}.haliteintelligence.com/login`, 'url')}>
            {copied === 'url' ? <Check size={13} style={{ color: '#1a7a3c' }} /> : <Copy size={13} style={{ color: 'var(--ink-3)' }} />}
          </button>
        </div>
      </div>

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
            <div key={admin.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{admin.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{admin.email}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                {admin.role}
              </span>
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
    </div>
  )
}
