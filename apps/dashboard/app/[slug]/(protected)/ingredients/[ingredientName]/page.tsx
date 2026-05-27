'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, Package, Users, Star, Loader2, Activity } from 'lucide-react'
import { InsightButton } from '@/components/ui/InsightButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne', HYPERPIGMENTATION: 'Hyperpigmentation', AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity', DRYNESS: 'Dryness', OILINESS: 'Oiliness',
  REDNESS: 'Redness', DULLNESS: 'Dullness', UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles', PORES: 'Pores', DEHYDRATION: 'Dehydration',
}
const SYMPTOM_LABELS: Record<string, string> = {
  BREAKOUT: 'Breakouts', DRYNESS: 'Dryness', REDNESS: 'Redness',
  IRRITATION: 'Irritation', PURGING: 'Purging', OILINESS: 'Oiliness',
  DULLNESS: 'Dullness', HYPERPIGMENTATION_FADING: 'Pigmentation fading',
  IMPROVEMENT: 'Improving', GLOW: 'Glowing', HYDRATED: 'Hydrated',
  TEXTURE_SMOOTH: 'Smooth texture',
}
const POSITIVE_SYMPTOMS = new Set(['IMPROVEMENT', 'GLOW', 'HYDRATED', 'TEXTURE_SMOOTH', 'HYPERPIGMENTATION_FADING'])

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface IngredientDetailResponse {
  name: string
  products: Array<{ id: string; name: string; category: string; concerns: string[]; imageUrl: string | null }>
  stats: {
    productCount: number
    activeConsumerCount: number
    totalConsumerCount: number
    checkInCount: number
    avgRating: number | null
  }
  topSymptoms: Array<{ symptom: string; count: number }>
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

export default function IngredientDetailPage() {
  const { slug, ingredientName } = useParams<{ slug: string; ingredientName: string }>()
  const [data, setData] = useState<IngredientDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandId, setBrandId] = useState('')

  const decodedName = decodeURIComponent(ingredientName)

  useEffect(() => {
    async function load() {
      try {
        const { token, brandId: bid } = getTokenAndBrandId()
        if (!bid) { setLoading(false); return }
        setBrandId(bid)
        const res = await fetch(`${API_URL}/brands/${bid}/ingredients/${ingredientName}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        if (res.ok) setData(await res.json() as IngredientDetailResponse)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ingredientName])

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Ingredient not found in catalog.</p>
    </div>
  )

  const { stats, products, topSymptoms } = data

  const insightContext = {
    ingredient: decodedName,
    productCount: stats.productCount,
    activeConsumerCount: stats.activeConsumerCount,
    avgRating: stats.avgRating,
    topSymptoms,
    products: products.map(p => ({ name: p.name, category: p.category })),
  }

  return (
    <div className="px-4 py-5 md:px-7 md:py-6 max-w-4xl">
      <Link
        href={`/${slug}/ingredients`}
        className="flex items-center gap-1 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--ink-3)' }}
      >
        <ArrowLeft size={12} /> Ingredients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--clay-light, #fdf0e8)', border: '1px solid var(--border)' }}
          >
            <FlaskConical size={18} style={{ color: 'var(--clay)' }} />
          </div>
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{decodedName}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Key ingredient across {stats.productCount} product{stats.productCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {brandId && (
          <InsightButton brandId={brandId} viewName={`Ingredient: ${decodedName}`} dataContext={insightContext} />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill label="Products" value={stats.productCount.toString()} icon={<Package size={12} />} />
        <StatPill label="Active Consumers" value={stats.activeConsumerCount.toLocaleString()} icon={<Users size={12} />} />
        <StatPill label="Check-in Uses" value={stats.checkInCount.toLocaleString()} icon={<Activity size={12} />} />
        <StatPill label="Avg Skin Score" value={stats.avgRating != null ? `${stats.avgRating}/5` : '—'} icon={<Star size={12} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Products containing this ingredient */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Products</p>
          </div>
          <div style={{ background: 'var(--surface)' }}>
            {products.map((p, i) => (
              <Link
                key={p.id}
                href={`/${slug}/products/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--sand-1)] transition-colors"
                style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : undefined }}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid var(--border)' }} />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>{fmt(p.category)}</span>
                    {p.concerns.slice(0, 2).map(c => (
                      <span key={c} className="text-[10px]" style={{ color: 'var(--ink-3)' }}>· {CONCERN_LABELS[c] ?? c}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Consumer signals */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Consumer Signals</p>
          {topSymptoms.length === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>
              No check-in data yet for products with this ingredient.
            </p>
          ) : (
            <>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Most reported symptoms from consumers using products with {decodedName}:
              </p>
              <div className="space-y-2">
                {topSymptoms.map(s => (
                  <Link
                    key={s.symptom}
                    href={`/${slug}/consumers/roster?symptom=${s.symptom}`}
                    className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                  >
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: POSITIVE_SYMPTOMS.has(s.symptom) ? '#ecfdf5' : '#fef2f2',
                        color: POSITIVE_SYMPTOMS.has(s.symptom) ? '#059669' : '#dc2626',
                      }}
                    >
                      {POSITIVE_SYMPTOMS.has(s.symptom) ? '+' : '−'}
                    </span>
                    <p className="text-[12px] flex-1" style={{ color: 'var(--ink)' }}>
                      {SYMPTOM_LABELS[s.symptom] ?? s.symptom}
                    </p>
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink-3)' }}>{s.count}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
