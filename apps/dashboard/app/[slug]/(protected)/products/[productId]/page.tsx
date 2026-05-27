'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Package, Activity, Star, Users,
  Loader2, ThumbsUp, ThumbsDown, Minus, CheckCircle2,
} from 'lucide-react'
import { InsightButton } from '@/components/ui/InsightButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CAT_LABELS: Record<string, string> = {
  SERUM: 'Serum', MOISTURIZER: 'Moisturiser', CLEANSER: 'Cleanser',
  SPF: 'SPF', TONER: 'Toner', TREATMENT: 'Treatment',
  EYE_CREAM: 'Eye Cream', MASK: 'Mask', EXFOLIANT: 'Exfoliant',
  BODY_MOISTURIZER: 'Body Lotion', SHAMPOO: 'Shampoo', CONDITIONER: 'Conditioner',
}
const CONCERN_LABELS: Record<string, string> = {
  ACNE: 'Acne', HYPERPIGMENTATION: 'Hyperpigmentation', AGING: 'Anti-aging',
  SENSITIVITY: 'Sensitivity', DRYNESS: 'Dryness', OILINESS: 'Oiliness',
  REDNESS: 'Redness', DULLNESS: 'Dullness', UNEVEN_TEXTURE: 'Uneven texture',
  DARK_CIRCLES: 'Dark circles', PORES: 'Pores', DEHYDRATION: 'Dehydration',
}

interface ProductDetail {
  id: string
  name: string
  category: string
  description: string | null
  price: number
  currency: string
  imageUrl: string | null
  productUrl: string | null
  inStock: boolean
  concerns: string[]
  keyIngredients: string[]
}

interface ProductDetailResponse {
  product: ProductDetail
  stats: {
    routineCount: number
    checkInTotal: number
    checkInUsed: number
    usageRate: number | null
    reactions: { positive: number; neutral: number; negative: number }
  }
  topConsumers: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    checkIns: number
    avgRating: number
  }>
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

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function consumerName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const n = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return n || c.email || 'Anonymous'
}

export default function ProductDetailPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>()
  const [data, setData] = useState<ProductDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandId, setBrandId] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { token, brandId: bid } = getTokenAndBrandId()
        if (!bid) { setLoading(false); return }
        setBrandId(bid)
        const res = await fetch(`${API_URL}/brands/${bid}/products/${productId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        if (res.ok) setData(await res.json() as ProductDetailResponse)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Product not found.</p>
    </div>
  )

  const { product, stats, topConsumers } = data
  const totalReactions = stats.reactions.positive + stats.reactions.neutral + stats.reactions.negative

  const insightContext = {
    name: product.name,
    category: product.category,
    concerns: product.concerns,
    keyIngredients: product.keyIngredients,
    routineCount: stats.routineCount,
    usageRate: stats.usageRate,
    reactions: stats.reactions,
    topConsumerCount: topConsumers.length,
  }

  return (
    <div className="px-7 py-6 max-w-4xl">
      <Link
        href={`/${slug}/products`}
        className="flex items-center gap-1 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--ink-3)' }}
      >
        <ArrowLeft size={12} /> Products
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
            >
              <Package size={20} style={{ color: 'var(--ink-3)' }} />
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>{product.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}
              >
                {CAT_LABELS[product.category] ?? fmt(product.category)}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                {product.currency} {product.price.toFixed(2)}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: product.inStock ? '#ecfdf5' : '#fef2f2', color: product.inStock ? '#059669' : '#dc2626' }}
              >
                {product.inStock ? 'In stock' : 'Out of stock'}
              </span>
            </div>
          </div>
        </div>
        {brandId && (
          <InsightButton brandId={brandId} viewName={`Product: ${product.name}`} dataContext={insightContext} />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill label="In Routines" value={stats.routineCount.toLocaleString()} icon={<Activity size={12} />} />
        <StatPill label="Usage Rate" value={stats.usageRate != null ? `${stats.usageRate}%` : '—'} icon={<CheckCircle2 size={12} />} />
        <StatPill label="Check-in Uses" value={stats.checkInUsed.toLocaleString()} icon={<Star size={12} />} />
        <StatPill label="Consumers" value={topConsumers.length > 0 ? `${topConsumers.length}+` : '0'} icon={<Users size={12} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Product Info */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Product Info</p>
          {product.description && (
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{product.description}</p>
          )}
          {product.concerns.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--ink-3)' }}>Targets</p>
              <div className="flex flex-wrap gap-1.5">
                {product.concerns.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}>
                    {CONCERN_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {product.keyIngredients.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--ink-3)' }}>Key Ingredients</p>
              <div className="flex flex-wrap gap-1.5">
                {product.keyIngredients.map(ing => (
                  <Link
                    key={ing}
                    href={`/${slug}/ingredients/${encodeURIComponent(ing)}`}
                    className="px-2 py-0.5 rounded-full text-[11px] hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--sand-1)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
                  >
                    {ing}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] hover:underline"
              style={{ color: 'var(--clay)' }}
            >
              View product page →
            </a>
          )}
        </div>

        {/* Reaction Breakdown */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Consumer Reactions</p>
          {totalReactions === 0 ? (
            <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink-3)' }}>No reactions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Positive', count: stats.reactions.positive, icon: <ThumbsUp size={12} />, color: 'var(--sage)' },
                { label: 'Neutral', count: stats.reactions.neutral, icon: <Minus size={12} />, color: 'var(--gold)' },
                { label: 'Negative', count: stats.reactions.negative, icon: <ThumbsDown size={12} />, color: '#e57373' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="flex items-center gap-1 w-20 flex-shrink-0 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {r.icon} {r.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--porcelain-2, var(--sand-1))' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: totalReactions > 0 ? `${Math.round((r.count / totalReactions) * 100)}%` : '0%', background: r.color }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums w-6 text-right" style={{ color: 'var(--ink)' }}>{r.count}</span>
                </div>
              ))}
              <p className="text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>{totalReactions} total logged reactions</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Consumers */}
      {topConsumers.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="px-4 py-3" style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
              Top Consumers Using This Product
            </p>
          </div>
          <div style={{ background: 'var(--surface)' }}>
            <div
              className="grid gap-3 px-4 py-2 text-[10px] font-semibold tracking-wide uppercase"
              style={{ gridTemplateColumns: '1fr 80px 80px', color: 'var(--ink-3)', borderBottom: '1px solid var(--border)' }}
            >
              <span>Consumer</span>
              <span>Check-ins</span>
              <span>Avg Score</span>
            </div>
            {topConsumers.map((c, i) => (
              <Link
                key={c.id}
                href={`/${slug}/consumers/${c.id}`}
                className="grid gap-3 px-4 py-3 hover:bg-[var(--sand-1)] transition-colors"
                style={{
                  gridTemplateColumns: '1fr 80px 80px',
                  borderBottom: i < topConsumers.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{consumerName(c)}</p>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{c.checkIns}</span>
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-3)' }}>{c.avgRating}/5</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
