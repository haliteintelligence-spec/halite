'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const PLANS = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']
const FOCUS_AREAS = ['SKINCARE', 'HAIR', 'BODY', 'MAKEUP', 'FRAGRANCE', 'WELLNESS']

export default function NewBrandPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'STARTER',
    focusAreas: [] as string[],
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  function toggleArea(area: string) {
    setForm(f => ({
      ...f,
      focusAreas: f.focusAreas.includes(area)
        ? f.focusAreas.filter(a => a !== area)
        : [...f.focusAreas, area],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { brand?: { id: string }; error?: string }
      if (!res.ok || !data.brand) throw new Error(data.error ?? 'Failed to create brand')
      router.push(`/admin/brands/${data.brand.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={12} /> Brands
        </Link>
      </div>

      <h1 className="text-2xl font-semibold font-display mb-6" style={{ color: 'var(--ink)' }}>
        Onboard New Brand
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl p-6 mb-4 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Brand Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Brand Name *</label>
              <input
                type="text" required value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Glowlab"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Slug *</label>
              <input
                type="text" required value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="e.g. glowlab"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Plan</label>
            <div className="flex gap-2">
              {PLANS.map(p => (
                <button key={p} type="button" onClick={() => setForm(f => ({ ...f, plan: p }))}
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

          <div>
            <label className="block text-[11px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>Focus Areas</label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(area => {
                const active = form.focusAreas.includes(area)
                return (
                  <button key={area} type="button" onClick={() => toggleArea(area)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: active ? 'var(--clay)' : 'var(--sand-1)',
                      color: active ? 'white' : 'var(--ink)',
                      border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
                    }}>
                    {area}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-6 mb-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Brand Admin Account</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Admin Name *</label>
              <input
                type="text" required value={form.adminName}
                onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Admin Email *</label>
              <input
                type="email" required value={form.adminEmail}
                onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                placeholder="jane@glowlab.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)' }}>Initial Password *</label>
            <input
              type="text" required value={form.adminPassword} minLength={8}
              onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
              placeholder="Min 8 characters"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>Share this with the brand — they can change it after first login.</p>
          </div>
        </div>

        {error && <p className="text-[12px] mb-4" style={{ color: '#e57373' }}>{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--clay)' }}
        >
          {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Creating…</span> : 'Create Brand'}
        </button>
      </form>
    </div>
  )
}
