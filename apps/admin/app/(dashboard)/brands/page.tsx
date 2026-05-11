'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { API_URL, adminHeaders, adminFetch } from '@/lib/api'
import { X, Eye, EyeOff, Loader2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url, { headers: adminHeaders() }).then(r => r.json())

const PLANS = ['STARTER', 'GROWTH', 'ENTERPRISE'] as const

interface OnboardForm {
  name: string; slug: string; plan: typeof PLANS[number]
  ownerName: string; ownerEmail: string; ownerPassword: string
}

const emptyForm: OnboardForm = {
  name: '', slug: '', plan: 'STARTER',
  ownerName: '', ownerEmail: '', ownerPassword: '',
}

export default function BrandsPage() {
  const { data, isLoading, mutate } = useSWR(`${API_URL}/brands`, fetcher)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<OnboardForm>(emptyForm)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function set<K extends keyof OnboardForm>(k: K, v: OnboardForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function onboard() {
    setSaving(true); setError('')
    try {
      await adminFetch('/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      await mutate()
      setShowModal(false)
      setForm(emptyForm)
    } catch (e: any) {
      setError(e.message ?? 'Failed to create brand.')
    }
    setSaving(false)
  }

  const brands = data?.brands ?? []
  const canSubmit = form.name && form.slug && form.ownerName && form.ownerEmail && form.ownerPassword.length >= 8

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Brands</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {brands.length} onboarded
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }}
          className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--text-1)' }}
        >
          + Onboard brand
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Brand', 'Plan', 'Users', 'Products', 'Shopify', 'Status', ''].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>Loading…</td></tr>
            ) : !brands.length ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>No brands onboarded yet.</td></tr>
            ) : brands.map((b: any) => (
              <tr key={b.id} className="border-b last:border-0 hover:bg-[#f5f0eb] transition-colors" style={{ borderColor: 'var(--border-sub)' }}>
                <td className="px-5 py-4">
                  <p className="font-medium" style={{ color: 'var(--text-1)' }}>{b.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{b.slug}</p>
                </td>
                <td className="px-5 py-4 capitalize text-sm" style={{ color: 'var(--text-2)' }}>
                  {b.plan.toLowerCase()}
                </td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{b._count?.endUsers ?? 0}</td>
                <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-2)' }}>{b._count?.products ?? 0}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.shopifyShop ? 'bg-emerald-50 text-emerald-700' : ''}`}
                    style={!b.shopifyShop ? { background: 'var(--bg-muted)', color: 'var(--text-3)' } : {}}>
                    {b.shopifyShop ? 'Connected' : 'Not connected'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.active ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                    {b.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <a href={`/brands/${b.id}`} className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--text-3)' }}>
                    View →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>Onboard brand</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[#f5f0eb]">
                  <X size={15} style={{ color: 'var(--text-3)' }} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Brand details */}
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-3)' }}>Brand</p>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Brand name</label>
                  <input type="text" value={form.name}
                    onChange={e => { set('name', e.target.value); set('slug', slugify(e.target.value)) }}
                    placeholder="Luminae Beauty"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Slug</label>
                  <input type="text" value={form.slug}
                    onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="luminae-beauty"
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-2)' }}>Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLANS.map(p => (
                      <button key={p} type="button" onClick={() => set('plan', p)}
                        className="py-2 rounded-lg text-xs font-semibold border transition-all"
                        style={{
                          background: form.plan === p ? 'var(--text-1)' : 'var(--bg-muted)',
                          borderColor: form.plan === p ? 'var(--text-1)' : 'var(--border)',
                          color: form.plan === p ? 'white' : 'var(--text-2)',
                        }}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Owner details */}
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase pt-1" style={{ color: 'var(--text-3)' }}>Owner account</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Full name</label>
                    <input type="text" value={form.ownerName} onChange={e => set('ownerName', e.target.value)}
                      placeholder="Sarah Chen"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Email</label>
                    <input type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)}
                      placeholder="sarah@brand.com"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Temporary password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.ownerPassword}
                      onChange={e => set('ownerPassword', e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={onboard} disabled={saving || !canSubmit}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'var(--text-1)' }}>
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    {saving ? 'Creating…' : 'Create brand'}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
