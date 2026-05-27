'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import type { BrandProfile } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const FOCUS_AREAS = [
  { value: 'SKINCARE',   label: 'Skincare' },
  { value: 'BODY',       label: 'Body' },
  { value: 'HAIR',       label: 'Hair' },
  { value: 'MAKEUP',     label: 'Makeup' },
  { value: 'FRAGRANCE',  label: 'Fragrance' },
  { value: 'NAILS',      label: 'Nails' },
  { value: 'WELLNESS',   label: 'Wellness' },
  { value: 'SUN_CARE',   label: 'Sun Care' },
  { value: 'LIP_CARE',   label: 'Lip Care' },
  { value: 'EYE_CARE',   label: 'Eye Care' },
]

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
}

export function SettingsProfileClient({ profile, token }: { profile: BrandProfile; token: string }) {
  const [name, setName] = useState(profile.name)
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? '')
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState(profile.brandWebsiteUrl ?? '')
  const [primaryColor, setPrimaryColor] = useState(profile.primaryColor ?? '#000000')
  const [focusAreas, setFocusAreas] = useState<string[]>(profile.focusAreas)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggleArea(value: string) {
    setFocusAreas(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`${API_URL}/brands/${profile.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim() || undefined,
          logoUrl: logoUrl.trim() || null,
          brandWebsiteUrl: brandWebsiteUrl.trim() || null,
          primaryColor,
          focusAreas,
        }),
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        setError((msg as any).message ?? 'Failed to save. Please try again.')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg text-[13px] border border-sand-2 bg-white text-ink outline-none focus:ring-2 focus:ring-clay/30 transition-all'
  const labelCls = 'block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5'

  return (
    <div className="space-y-6">
      {/* Brand name */}
      <div className="rounded-2xl border border-sand-2 bg-white p-6 space-y-5">
        <h2 className="text-[13px] font-semibold text-ink">Brand details</h2>

        <div>
          <label className={labelCls}>Brand name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            placeholder="Your brand name"
          />
        </div>

        <div>
          <label className={labelCls}>Logo URL</label>
          <div className="flex gap-3 items-center">
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              className={`${inputCls} flex-1`}
              placeholder="https://..."
              type="url"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo preview"
                className="w-10 h-10 rounded-lg object-contain border border-sand-2 flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Brand Website URL</label>
          <div className="relative">
            <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
            <input
              type="url"
              value={brandWebsiteUrl}
              onChange={e => setBrandWebsiteUrl(e.target.value)}
              className={`${inputCls} pl-8 font-mono`}
              placeholder="https://yourbrand.com"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Primary colour</label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-sand-2 cursor-pointer p-0.5 bg-white"
            />
            <input
              value={primaryColor}
              onChange={e => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setPrimaryColor(e.target.value)
              }}
              className={`${inputCls} w-32 font-mono`}
              maxLength={7}
            />
            <div className="w-8 h-8 rounded-lg border border-sand-2" style={{ background: primaryColor }} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Plan</label>
          <p className="text-[13px] text-ink px-3 py-2.5 rounded-lg border border-sand-2 bg-sand-1 inline-block">
            {PLAN_LABELS[profile.plan] ?? profile.plan}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">Contact Halite to change your plan.</p>
        </div>
      </div>

      {/* Focus areas */}
      <div className="rounded-2xl border border-sand-2 bg-white p-6">
        <h2 className="text-[13px] font-semibold text-ink mb-1">Focus areas</h2>
        <p className="text-[12px] text-ink-3 mb-4">Controls which quiz sections are available to your consumers.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FOCUS_AREAS.map(area => {
            const on = focusAreas.includes(area.value)
            return (
              <button
                key={area.value}
                type="button"
                onClick={() => toggleArea(area.value)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all text-left"
                style={{
                  background: on ? 'var(--clay)' : 'var(--sand-1)',
                  borderColor: on ? 'var(--clay)' : 'var(--sand-2)',
                  color: on ? 'white' : 'var(--ink-3)',
                }}
              >
                <span className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px] flex-shrink-0"
                  style={{
                    background: on ? 'rgba(255,255,255,0.25)' : 'transparent',
                    borderColor: on ? 'rgba(255,255,255,0.4)' : 'var(--sand-2)',
                    color: on ? 'white' : 'transparent',
                  }}
                >
                  ✓
                </span>
                {area.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60"
          style={{ background: 'var(--clay)' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <p className="text-[12px] text-green-600 font-medium">Saved ✓</p>}
        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>
    </div>
  )
}
