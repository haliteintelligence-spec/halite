'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, Activity, Star, CheckCircle2, XCircle,
  Loader2, Calendar, Droplets, Sun, Zap,
} from 'lucide-react'
import { InsightButton } from '@/components/ui/InsightButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne', HYPERPIGMENTATION: 'Hyperpigmentation', AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity', DRYNESS: 'Dryness', OILINESS: 'Oiliness',
  REDNESS: 'Redness', DULLNESS: 'Dullness', UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles', PORES: 'Pores', DEHYDRATION: 'Dehydration',
}
const SKIN_TYPE_LABELS: Record<string, string> = {
  DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combination', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
}
const AGE_LABELS: Record<string, string> = {
  under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
  '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
}

interface BeautyProfile {
  skinType: string | null
  skinConcerns: string[]
  ageRange: string | null
  monkSkinTone: number | null
  city: string | null
  country: string | null
  sleepHours: number | null
  stressLevel: number | null
}

interface CheckInProduct {
  used: boolean
  reaction: string | null
  product: { id: string; name: string; category: string }
}

interface CheckIn {
  id: string
  date: string
  skinRating: number
  compliant: boolean
  symptoms: string[]
  notes: string | null
  products: CheckInProduct[]
}

interface RoutineStep {
  step: number
  timeOfDay: string
  product: { id: string; name: string; category: string; keyIngredients: string[] }
}

interface ConsumerDetail {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  createdAt: string
  beautyProfile: BeautyProfile | null
  checkIns: CheckIn[]
  routines: Array<{ id: string; focusArea: string; steps: RoutineStep[] }>
  stats: { totalCheckIns: number; complianceRate: number | null; avgSkinRating: number | null }
}

function getTokenAndBrandId() {
  const token = document.cookie.match(/halite_token=([^;]+)/)?.[1] ?? null
  const brandId = token ? (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId : null
  return { token, brandId }
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

export default function ConsumerDetailPage() {
  const { slug, consumerId } = useParams<{ slug: string; consumerId: string }>()
  const [consumer, setConsumer] = useState<ConsumerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandId, setBrandId] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { token, brandId: bid } = getTokenAndBrandId()
        if (!bid) { setLoading(false); return }
        setBrandId(bid)
        const res = await fetch(`${API_URL}/brands/${bid}/consumers/${consumerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json() as { consumer: ConsumerDetail }
          setConsumer(data.consumer)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [consumerId])

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!consumer) return (
    <div className="p-8">
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Consumer not found.</p>
    </div>
  )

  const name = [consumer.firstName, consumer.lastName].filter(Boolean).join(' ') || consumer.email || 'Anonymous'
  const bp = consumer.beautyProfile
  const activeRoutine = consumer.routines[0]

  const insightContext = {
    name,
    skinType: bp?.skinType,
    skinConcerns: bp?.skinConcerns,
    ageRange: bp?.ageRange,
    monkSkinTone: bp?.monkSkinTone,
    totalCheckIns: consumer.stats.totalCheckIns,
    complianceRate: consumer.stats.complianceRate,
    avgSkinRating: consumer.stats.avgSkinRating,
    recentCheckIns: consumer.checkIns.slice(0, 5).map(c => ({
      date: c.date, skinRating: c.skinRating, compliant: c.compliant, symptoms: c.symptoms,
    })),
    routineSteps: activeRoutine?.steps.map(s => ({ product: s.product.name, timeOfDay: s.timeOfDay })),
  }

  return (
    <div className="px-7 py-6 max-w-4xl">
      <Link
        href={`/${slug}/consumers/roster`}
        className="flex items-center gap-1 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--ink-3)' }}
      >
        <ArrowLeft size={12} /> Consumer Roster
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
            style={{ background: 'var(--clay)' }}
          >
            {(consumer.firstName?.[0] ?? consumer.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{name}</h1>
            {consumer.email && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>{consumer.email}</p>
            )}
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Joined {new Date(consumer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        {brandId && (
          <InsightButton brandId={brandId} viewName={`Consumer: ${name}`} dataContext={insightContext} />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill label="Check-ins" value={consumer.stats.totalCheckIns.toLocaleString()} icon={<Calendar size={12} />} />
        <StatPill label="Compliance" value={consumer.stats.complianceRate != null ? `${consumer.stats.complianceRate}%` : '—'} icon={<Activity size={12} />} />
        <StatPill label="Avg Skin Score" value={consumer.stats.avgSkinRating != null ? `${consumer.stats.avgSkinRating}/5` : '—'} icon={<Star size={12} />} />
        <StatPill label="Skin Tone (MST)" value={bp?.monkSkinTone != null ? `MST ${bp.monkSkinTone}` : '—'} icon={<Sun size={12} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Skin Profile */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Skin Profile</p>
          <div className="space-y-2">
            <Row label="Skin Type" value={bp?.skinType ? (SKIN_TYPE_LABELS[bp.skinType] ?? bp.skinType) : '—'} />
            <Row label="Age Range" value={bp?.ageRange ? (AGE_LABELS[bp.ageRange] ?? bp.ageRange) : '—'} />
            <Row label="Location" value={[bp?.city, bp?.country].filter(Boolean).join(', ') || '—'} />
            <Row label="Sleep" value={bp?.sleepHours != null ? `${bp.sleepHours}h/night` : '—'} />
            <Row label="Stress Level" value={bp?.stressLevel != null ? `${bp.stressLevel}/5` : '—'} />
          </div>
          {bp?.skinConcerns && bp.skinConcerns.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>Concerns</p>
              <div className="flex flex-wrap gap-1.5">
                {bp.skinConcerns.map(c => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded-full text-[11px]"
                    style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
                  >
                    {CONCERN_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Routine */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
            Active Routine {activeRoutine ? `· ${activeRoutine.focusArea.replace('_', ' ')}` : ''}
          </p>
          {activeRoutine ? (
            <div className="space-y-2">
              {activeRoutine.steps.map(step => (
                <div key={step.step} className="flex items-center gap-2.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}
                  >
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

      {/* Check-in History */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
            Recent Check-ins
          </p>
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>({consumer.stats.totalCheckIns} total)</span>
        </div>

        {consumer.checkIns.length === 0 ? (
          <div className="py-8 text-center" style={{ background: 'var(--surface)' }}>
            <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>No check-ins yet.</p>
          </div>
        ) : (
          consumer.checkIns.map((ci, i) => (
            <div
              key={ci.id}
              className="px-4 py-3"
              style={{
                background: 'var(--surface)',
                borderBottom: i < consumer.checkIns.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  {ci.compliant
                    ? <CheckCircle2 size={13} style={{ color: '#1a7a3c' }} />
                    : <XCircle size={13} style={{ color: '#e57373' }} />}
                  <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>
                    {new Date(ci.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={10}
                      fill={j < ci.skinRating ? 'var(--clay)' : 'none'}
                      style={{ color: j < ci.skinRating ? 'var(--clay)' : 'var(--border)' }}
                    />
                  ))}
                  <span className="text-[11px] ml-0.5 tabular-nums" style={{ color: 'var(--ink-3)' }}>{ci.skinRating}/5</span>
                </div>
              </div>

              {ci.symptoms.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {ci.symptoms.map(s => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--blush-light, #fde8e8)', color: 'var(--blush, #c0392b)' }}
                    >
                      {s.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}

              {ci.notes && (
                <p className="text-[11px] italic mb-1.5" style={{ color: 'var(--ink-3)' }}>"{ci.notes}"</p>
              )}

              {ci.products.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {ci.products.map((cp, j) => (
                    <span
                      key={j}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}
                    >
                      {cp.product.name}
                      {cp.reaction && ` · ${cp.reaction}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
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
