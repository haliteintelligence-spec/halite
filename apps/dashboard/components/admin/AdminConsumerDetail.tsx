'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Users, Activity, Package, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return typeof document !== 'undefined'
    ? document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    : undefined
}

function deterministicPhone(id: string) {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
  const n = (h % 9000000000) + 1000000000
  const s = String(n)
  return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6, 10)}`
}

function ageFromRange(ageRange: string | null, id: string) {
  const ranges: Record<string, [number, number]> = {
    under_18: [14, 17], '18_24': [18, 24], '25_34': [25, 34],
    '35_44': [35, 44], '45_54': [45, 54], '55_64': [55, 64], '65_plus': [65, 75],
  }
  const [min, max] = ranges[ageRange ?? '25_34'] ?? [25, 34]
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
  return min + (h % (max - min + 1))
}

function birthdayFromAge(age: number, id: string) {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) ^ id.charCodeAt(i)) >>> 0
  const year = new Date().getFullYear() - age
  const month = (h % 12) + 1
  const day = ((h >> 4) % 28) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function fmt(s: string | null | undefined) {
  if (!s) return '—'
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const AGE_LABELS: Record<string, string> = {
  under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
  '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
}

interface Props {
  brandId: string
  userId: string
  backHref: string
}

export function AdminConsumerDetail({ brandId, userId, backHref }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    fetch(`${API_URL}/admin/brands/${brandId}/consumers/${userId}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [brandId, userId])

  if (loading) return (
    <div className="flex items-center gap-2 py-12" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  )
  if (!data?.consumer) return (
    <div className="py-12"><p className="text-sm" style={{ color: 'var(--ink-3)' }}>Consumer not found.</p></div>
  )

  const c = data.consumer
  const bp = c.beautyProfile
  const quiz = data.quizSession
  const quizAnswers = quiz?.answers as Record<string, unknown> ?? {}
  const age = bp ? ageFromRange(bp.ageRange, c.id) : null
  const birthday = age ? birthdayFromAge(age, c.id) : null
  const phone = deterministicPhone(c.id)
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown'
  const allBrands: Array<{ id: string; brandId: string; brand: { name: string; slug: string; demoLinkExpiresAt: string | null } }> = c.consumer?.endUsers ?? []
  const crossBrandCount = allBrands.length

  const cardCls = 'rounded-xl p-5 mb-4'
  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)' }
  const labelCls = 'text-[10px] font-semibold tracking-wide uppercase mb-0.5'
  const labelStyle = { color: 'var(--ink-3)' }
  const valCls = 'text-[13px]'
  const valStyle = { color: 'var(--ink)' }

  function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div>
        <p className={labelCls} style={labelStyle}>{label}</p>
        <p className={valCls} style={valStyle}>{value ?? '—'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <Link href={backHref} className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Back to Consumers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{name}</h1>
          <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>{c.email ?? '—'}</p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: crossBrandCount > 1 ? '#eff6ff' : 'var(--sand-1)', color: crossBrandCount > 1 ? '#2563eb' : 'var(--ink-3)' }}>
          {crossBrandCount} {crossBrandCount === 1 ? 'brand' : 'brands'}
        </span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Brands', value: crossBrandCount, icon: Users },
          { label: 'Check-ins', value: c._count?.checkIns ?? c.checkIns?.length ?? 0, icon: Activity },
          { label: 'Routines', value: c._count?.routines ?? c.routines?.length ?? 0, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} style={{ color: 'var(--ink-3)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>{label}</p>
            </div>
            <p className="text-xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Contact & Identity */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Contact & Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Consumer ID" value={c.id} />
          <Field label="Phone" value={phone} />
          {age && <Field label="Age" value={age} />}
          {birthday && <Field label="Birthday" value={birthday} />}
          <Field label="City" value={bp?.city} />
          <Field label="Country" value={bp?.country ?? 'United States'} />
          <Field label="Age Range" value={bp?.ageRange ? AGE_LABELS[bp.ageRange] ?? bp.ageRange : null} />
          <Field label="Joined" value={new Date(c.createdAt).toLocaleDateString()} />
        </div>
      </div>

      {/* Skin & Beauty Profile */}
      {bp && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Beauty Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Skin Type" value={bp.skinType ? fmt(bp.skinType) : null} />
            <Field label="Monk Skin Tone" value={bp.monkSkinTone ?? null} />
            <div className="col-span-2">
              <p className={labelCls} style={labelStyle}>Skin Concerns</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(bp.skinConcerns ?? []).length > 0
                  ? (bp.skinConcerns as string[]).map((s: string) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                      {fmt(s)}
                    </span>
                  ))
                  : <span className={valCls} style={valStyle}>—</span>}
              </div>
            </div>
            {bp.hairType && <Field label="Hair Type" value={fmt(bp.hairType)} />}
            {bp.climateTag && <Field label="Climate" value={fmt(bp.climateTag)} />}
          </div>
        </div>
      )}

      {/* Quiz Results */}
      {quiz && (
        <div className={cardCls} style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} style={{ color: 'var(--clay)' }} />
            <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Quiz Results</h2>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--ink-3)' }}>
              {quiz.completedAt ? new Date(quiz.completedAt).toLocaleDateString() : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quizAnswers['SH0'] && <Field label="Age Range" value={AGE_LABELS[String(quizAnswers['SH0'])] ?? String(quizAnswers['SH0'])} />}
            {quizAnswers['S1'] && <Field label="Skin Type" value={fmt(String(quizAnswers['S1']))} />}
            {quizAnswers['S5'] && <Field label="Monk Skin Tone" value={String(quizAnswers['S5'])} />}
            {quizAnswers['S2'] && <Field label="Breakout Frequency" value={fmt(String(quizAnswers['S2']))} />}
            {quizAnswers['S3'] && <Field label="Sensitivity" value={fmt(String(quizAnswers['S3']))} />}
            {quizAnswers['S4'] && (
              <div className="col-span-2">
                <p className={labelCls} style={labelStyle}>Skin Concerns</p>
                <p className={valCls} style={valStyle}>
                  {Array.isArray(quizAnswers['S4'])
                    ? (quizAnswers['S4'] as string[]).map(fmt).join(', ')
                    : fmt(String(quizAnswers['S4']))}
                </p>
              </div>
            )}
            {quizAnswers['H1'] && <Field label="Hair Type" value={fmt(String(quizAnswers['H1']))} />}
            {quizAnswers['H2'] && (
              <div>
                <p className={labelCls} style={labelStyle}>Hair Concerns</p>
                <p className={valCls} style={valStyle}>
                  {Array.isArray(quizAnswers['H2'])
                    ? (quizAnswers['H2'] as string[]).map(fmt).join(', ')
                    : fmt(String(quizAnswers['H2']))}
                </p>
              </div>
            )}
            {quizAnswers['H3'] && <Field label="Scalp Type" value={fmt(String(quizAnswers['H3']))} />}
            {quizAnswers['H4'] && <Field label="Hair Porosity" value={fmt(String(quizAnswers['H4']))} />}
            {quizAnswers['SH1'] && <Field label="Routine Preference" value={fmt(String(quizAnswers['SH1']))} />}
            {quizAnswers['SH2'] && <Field label="Water Intake" value={fmt(String(quizAnswers['SH2']))} />}
            {quizAnswers['SH3'] && <Field label="Sleep Hours" value={fmt(String(quizAnswers['SH3']))} />}
            {quizAnswers['SH4'] && <Field label="Stress Level" value={fmt(String(quizAnswers['SH4']))} />}
          </div>
        </div>
      )}

      {/* Routines */}
      {(c.routines ?? []).length > 0 && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Active Routines</h2>
          <div className="space-y-3">
            {(c.routines as any[]).map((r: any) => (
              <div key={r.id} className="rounded-lg p-3" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--clay)' }}>{fmt(r.focusArea)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['AM', 'PM'] as const).map(tod => {
                    const steps = (r.steps as any[]).filter((s: any) => s.timeOfDay === tod || s.timeOfDay === 'BOTH')
                    if (steps.length === 0) return null
                    return (
                      <div key={tod}>
                        <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--ink-3)' }}>{tod}</p>
                        <ul className="space-y-0.5">
                          {steps.map((s: any) => (
                            <li key={s.id} className="text-[11px]" style={{ color: 'var(--ink)' }}>
                              {s.product.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-ins */}
      {(c.checkIns ?? []).length > 0 && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Recent Check-ins</h2>
          <div className="space-y-2">
            {(c.checkIns as any[]).map((ci: any) => (
              <div key={ci.id} className="flex items-start justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
                    {ci.symptoms?.length > 0 ? ci.symptoms.join(', ') : 'No symptoms'}
                  </p>
                  {ci.notes && <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{ci.notes}</p>}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
                    {new Date(ci.createdAt).toLocaleDateString()} · {ci.compliant ? 'Compliant' : 'Not compliant'}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: ci.skinRating >= 4 ? '#ecfdf5' : ci.skinRating >= 3 ? '#fef9c3' : '#fef2f2',
                      color: ci.skinRating >= 4 ? '#059669' : ci.skinRating >= 3 ? '#854d0e' : '#dc2626',
                    }}>
                    {ci.skinRating}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-brand presence */}
      {allBrands.length > 0 && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-[11px] font-semibold tracking-wide uppercase mb-4" style={{ color: 'var(--ink-3)' }}>Brand Presence</h2>
          <div className="space-y-2">
            {allBrands.map((eu: any) => (
              <div key={eu.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{eu.brand.name}</p>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--ink-3)' }}>{eu.brand.slug}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: eu.brand.demoLinkExpiresAt ? '#fef3c7' : '#ecfdf5',
                    color: eu.brand.demoLinkExpiresAt ? '#92400e' : '#059669',
                  }}>
                  {eu.brand.demoLinkExpiresAt ? 'Demo' : 'Brand'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
