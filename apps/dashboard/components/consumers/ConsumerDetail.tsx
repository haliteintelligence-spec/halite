'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Activity, Star, CheckCircle2, XCircle,
  Calendar, Sun, Sparkles, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react'

const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne', HYPERPIGMENTATION: 'Hyperpigmentation', AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity', DRYNESS: 'Dryness', OILINESS: 'Oiliness',
  REDNESS: 'Redness', DULLNESS: 'Dullness', UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles', PORES: 'Pores', DEHYDRATION: 'Dehydration',
}
const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combination', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
}

function calcAge(birthday: string): number {
  const dob = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function fmt(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export interface BeautyProfile {
  skinType: string | null
  skinConcerns: string[]
  ageRange: string | null
  monkSkinTone: number | null
  city: string | null
  country: string | null
  climateTag: string | null
  sleepHours: string | null
  stressLevel: number | null
  waterIntakeMl: string | null
  hairProfile: Record<string, unknown> | null
  bodyProfile: Record<string, unknown> | null
  makeupProfile: Record<string, unknown> | null
  fragranceProfile: Record<string, unknown> | null
  nailsProfile: Record<string, unknown> | null
  wellnessProfile: Record<string, unknown> | null
  sunCareProfile: Record<string, unknown> | null
  lipProfile: Record<string, unknown> | null
  eyeProfile: Record<string, unknown> | null
}

export interface CheckInProductRow {
  used: boolean
  reaction: string | null
  product: { id: string; name: string; category: string }
}

export interface CheckInRow {
  id: string
  date: string
  skinRating: number
  compliant: boolean
  symptoms: string[]
  notes: string | null
  products: CheckInProductRow[]
}

export interface CheckInGroup {
  brandId: string
  brandName: string
  checkIns: CheckInRow[]
}

export interface RoutineStepRow {
  step: number
  timeOfDay: string
  product: { id: string; name: string; category: string; keyIngredients: string[] }
}

export interface BrandPresenceRow {
  name: string
  slug: string
  joinedAt: string
  isDemo?: boolean
}

export interface ConsumerDetailProps {
  backHref: string
  backLabel?: string
  name: string
  email: string | null
  createdAt: string
  birthday: string | null
  quizCompletedAt: string | null
  brandPresence: BrandPresenceRow[]
  beautyProfile: BeautyProfile | null
  activeRoutine: { focusArea: string; steps: RoutineStepRow[] } | null
  stats: { totalCheckIns: number; complianceRate: number | null; avgSkinRating: number | null }
  checkInGroups: CheckInGroup[]
  onFetchCheckInResult: (checkInId: string, brandId: string) => Promise<{ aiResult: string; generatedAt: string }>
  headerSlot?: React.ReactNode
  crossBrandBadge?: React.ReactNode
}

function StatPill({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span style={{ color: 'var(--clay)' }}>{icon}</span>}
        <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <p className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}

function CheckInItem({
  checkIn, brandId, onFetchCheckInResult,
}: {
  checkIn: CheckInRow
  brandId: string
  onFetchCheckInResult: ConsumerDetailProps['onFetchCheckInResult']
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && result === null && !loading) {
      setLoading(true)
      setError('')
      try {
        const data = await onFetchCheckInResult(checkIn.id, brandId)
        setResult(data.aiResult)
      } catch {
        setError('Could not load AI interpretation.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="px-4 py-3">
      <button onClick={toggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={12} style={{ color: 'var(--ink-3)' }} /> : <ChevronRight size={12} style={{ color: 'var(--ink-3)' }} />}
            {checkIn.compliant
              ? <CheckCircle2 size={13} style={{ color: '#1a7a3c' }} />
              : <XCircle size={13} style={{ color: '#e57373' }} />}
            <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
              {new Date(checkIn.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                size={10}
                fill={j < checkIn.skinRating ? 'var(--clay)' : 'none'}
                style={{ color: j < checkIn.skinRating ? 'var(--clay)' : 'var(--border)' }}
              />
            ))}
            <span className="text-[11px] ml-0.5 tabular-nums" style={{ color: 'var(--ink-3)' }}>{checkIn.skinRating}/5</span>
          </div>
        </div>

        {checkIn.symptoms.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {checkIn.symptoms.map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#fde8e8', color: '#c0392b' }}>
                {fmt(s)}
              </span>
            ))}
          </div>
        )}

        {checkIn.notes && (
          <p className="text-[11px] italic mb-1.5" style={{ color: 'var(--ink-3)' }}>&ldquo;{checkIn.notes}&rdquo;</p>
        )}

        {checkIn.products.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {checkIn.products.map((cp, j) => (
              <span key={j} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                {cp.product.name}{cp.reaction && ` · ${fmt(cp.reaction)}`}
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="mt-2.5 rounded-lg p-3 flex items-start gap-2" style={{ background: 'var(--clay-light, #faf1ec)', border: '1px solid var(--border)' }}>
          <Sparkles size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--clay)' }} />
          {loading ? (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink-3)' }}>
              <Loader2 size={12} className="animate-spin" /> Generating AI interpretation…
            </div>
          ) : error ? (
            <p className="text-[12px]" style={{ color: '#e57373' }}>{error}</p>
          ) : (
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>{result}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ConsumerDetail({
  backHref, backLabel = 'Back', name, email, createdAt, birthday, quizCompletedAt,
  brandPresence, beautyProfile: bp, activeRoutine, stats, checkInGroups,
  onFetchCheckInResult, headerSlot, crossBrandBadge,
}: ConsumerDetailProps) {
  const totalCheckInsShown = checkInGroups.reduce((s, g) => s + g.checkIns.length, 0)
  const showBrandLabels = checkInGroups.length > 1

  return (
    <div className="px-4 py-5 md:px-7 md:py-6 max-w-4xl">
      <Link href={backHref} className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> {backLabel}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
            style={{ background: 'var(--clay)' }}
          >
            {(name[0] ?? email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{name}</h1>
            {email && <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>{email}</p>}
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Joined {new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {quizCompletedAt && (
                <span> · Quiz completed {new Date(quizCompletedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              )}
            </p>
            {brandPresence.length > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Also at: {brandPresence.map(b => b.name).join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {crossBrandBadge}
          {headerSlot}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill label="Check-ins" value={stats.totalCheckIns.toLocaleString()} icon={<Calendar size={12} />} />
        <StatPill label="Compliance" value={stats.complianceRate != null ? `${stats.complianceRate}%` : '—'} icon={<Activity size={12} />} />
        <StatPill label="Avg Skin Score" value={stats.avgSkinRating != null ? `${stats.avgSkinRating}/5` : '—'} icon={<Star size={12} />} />
        <StatPill label="Skin Tone (MST)" value={bp?.monkSkinTone != null ? `MST ${bp.monkSkinTone}` : '—'} icon={<Sun size={12} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Profile */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Profile</p>
          <div className="space-y-2">
            <Row label="Skin Type" value={bp?.skinType ? (SKIN_TYPE_LABELS[bp.skinType] ?? bp.skinType) : '—'} />
            <Row label="Birthday" value={birthday ? new Date(birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
            <Row label="Age" value={birthday ? String(calcAge(birthday)) : '—'} />
            <Row label="Location" value={[bp?.city, bp?.country].filter(Boolean).join(', ') || '—'} />
            <Row label="Climate" value={bp?.climateTag ? fmt(bp.climateTag) : '—'} />
            <Row label="Sleep" value={bp?.sleepHours ?? '—'} />
            <Row label="Water" value={bp?.waterIntakeMl ?? '—'} />
            <Row label="Stress" value={bp?.stressLevel != null ? `${bp.stressLevel}/5` : '—'} />
          </div>
          {bp?.skinConcerns && bp.skinConcerns.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>Skin Concerns</p>
              <div className="flex flex-wrap gap-1.5">
                {bp.skinConcerns.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}>
                    {CONCERN_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {[
            { key: 'hairProfile', label: 'Hair' },
            { key: 'bodyProfile', label: 'Body' },
            { key: 'makeupProfile', label: 'Makeup' },
            { key: 'fragranceProfile', label: 'Fragrance' },
            { key: 'nailsProfile', label: 'Nails' },
            { key: 'wellnessProfile', label: 'Wellness' },
            { key: 'sunCareProfile', label: 'Sun Care' },
            { key: 'lipProfile', label: 'Lip' },
            { key: 'eyeProfile', label: 'Eye' },
          ].map(({ key, label }) => {
            const data = bp?.[key as keyof BeautyProfile] as Record<string, unknown> | null | undefined
            if (!data || Object.keys(data).length === 0) return null
            return (
              <div key={key}>
                <p className="text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--ink-3)' }}>{label} Profile</p>
                <div className="space-y-1">
                  {Object.entries(data).map(([k, v]) => (
                    <Row key={k} label={fmt(k)} value={Array.isArray(v) ? (v as string[]).map(fmt).join(', ') || '—' : v != null ? fmt(String(v)) : '—'} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Active Routine */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
            Active Routine {activeRoutine ? `· ${fmt(activeRoutine.focusArea)}` : ''}
          </p>
          {activeRoutine ? (
            <div className="space-y-2">
              {activeRoutine.steps.map(step => (
                <div key={`${step.timeOfDay}-${step.step}`} className="flex items-center gap-2.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                    {step.timeOfDay === 'MORNING' ? 'AM' : step.timeOfDay === 'EVENING' ? 'PM' : step.timeOfDay}
                  </span>
                  <p className="text-[12px] truncate" style={{ color: 'var(--ink)' }}>{step.product.name}</p>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--ink-3)' }}>{step.product.category}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>No active routine.</p>
          )}
        </div>
      </div>

      {/* Check-in History — grouped by brand when there's more than one */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Check-ins</p>
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>({totalCheckInsShown} shown · click a check-in for its AI interpretation)</span>
        </div>

        {totalCheckInsShown === 0 ? (
          <div className="py-8 text-center" style={{ background: 'var(--surface)' }}>
            <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>No check-ins yet.</p>
          </div>
        ) : (
          checkInGroups.filter(g => g.checkIns.length > 0).map(group => (
            <div key={group.brandId}>
              {showBrandLabels && (
                <div className="px-4 py-2" style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: 'var(--clay)' }}>{group.brandName}</p>
                </div>
              )}
              {group.checkIns.map((ci, i) => (
                <div key={ci.id} style={{ background: 'var(--surface)', borderBottom: i < group.checkIns.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <CheckInItem checkIn={ci} brandId={group.brandId} onFetchCheckInResult={onFetchCheckInResult} />
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Brand Presence */}
      {brandPresence.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>Brand Presence</p>
          <div className="space-y-2">
            {brandPresence.map(b => (
              <div key={b.slug} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{b.name}</p>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--ink-3)' }}>{b.slug}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: b.isDemo ? '#fef3c7' : '#ecfdf5', color: b.isDemo ? '#92400e' : '#059669' }}>
                  {b.isDemo ? 'Demo' : 'Brand'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
