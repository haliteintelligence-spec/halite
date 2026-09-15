import Link from 'next/link'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { getConnectedConsumer } from '@/lib/api'

export const metadata = { title: 'Connected consumer | Halite Intelligence' }

interface Props {
  params: Promise<{ slug: string; consumerId: string }>
}

const EVENT_LABELS: Record<string, string> = {
  RECOMMENDATION_SHOWN: 'Saw ranked products',
  PRODUCT_VIEWED: 'Opened a product',
  ADD_TO_CART: 'Added to bag',
  WISHLISTED: 'Saved to their Hallie wishlist',
  PURCHASE: 'Purchased',
  RETURNED: 'Returned',
  RATED: 'Rated',
  CONNECT_ACCEPTED: 'Connected their Hallie profile',
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

export default async function ConnectedConsumerPage({ params }: Props) {
  const { slug, consumerId } = await params
  const d = await getConnectedConsumer(consumerId)

  if (!d) {
    return (
      <div className="px-4 py-5 md:px-7 md:py-6">
        <InsightCard title="No permission for this consumer" subtitle="Nothing is shown without a live grant">
          <p className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
            Either they never connected to you, or they have disconnected since.{' '}
            <Link href={`/${slug}/connect/consumers`} className="underline">Back to the list</Link>
          </p>
        </InsightCard>
      </div>
    )
  }

  const revoked = d.permission.status !== 'active'

  return (
    <div className="min-h-full">
      <div
        className="sticky top-0 z-10 px-4 py-3 md:px-7 md:py-4 flex items-start justify-between gap-3"
        style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Connected consumer
          </p>
          <h1 className="font-display text-xl leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>
            {d.identity.name ?? d.identity.email ?? d.consumerId}
          </h1>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-3)' }}>
            {d.identity.email && `${d.identity.email} · `}
            <span className="font-mono">{d.consumerId}</span>
          </p>
        </div>
        <span
          className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={revoked
            ? { background: 'var(--blush-light)', color: 'var(--blush)' }
            : { background: 'var(--sage-light)', color: 'var(--sage)' }}
        >
          {revoked ? 'Disconnected' : 'Permission active'}
        </span>
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6 grid grid-cols-1 xl:grid-cols-[1fr_1.45fr] gap-6 items-start">
        <div className="space-y-6">
          <InsightCard title="What you were granted" subtitle={`Recorded ${when(d.permission.grantedAt)}`}>
            <dl className="text-[12px]">
              <Row k="Categories" v={d.permission.categories.join(', ').toLowerCase() || '—'} />
              <Row k="Purpose" v={d.permission.purpose.replace(/_/g, ' ')} />
              <Row k="Lasts" v={d.permission.expiresAt ? `Until ${when(d.permission.expiresAt)}` : 'Until they disconnect'} />
              <Row k="You may store" v="Recommendations only" last />
            </dl>
          </InsightCard>

          {d.context && (
            <>
              <InsightCard title="Preference profile" subtitle={`Derived by Halite · confidence ${d.context.confidence}`}>
                <div className="space-y-4">
                  <Tags label="Drawn to" items={d.context.preferences.liked} tone="clay" />
                  <Tags label="Steers away from" items={d.context.preferences.avoided} tone="blush" />
                  {d.context.intent.budget_max != null && (
                    <p className="text-[12px] pt-1" style={{ color: 'var(--ink-2)' }}>
                      Tends to spend up to{' '}
                      <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                        {d.context.intent.currency} {d.context.intent.budget_max}
                      </span>
                    </p>
                  )}
                </div>
              </InsightCard>

              <InsightCard
                title="Their collection"
                subtitle="Yours in full — everything else as ingredients"
              >
                <div className="space-y-3">
                  <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[11.5px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                      {d.context.collection.yours.length} of yours — named in full
                    </p>
                    {d.context.collection.yours.length === 0 ? (
                      <p className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                        Nothing of yours in their collection yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {d.context.collection.yours.map(p => (
                          <li key={p.productId} className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
                            {p.name}
                            {p.outcome && (
                              <span className="ml-1.5" style={{ color: p.outcome === 'NEGATIVE' ? 'var(--blush)' : 'var(--sage)' }}>
                                · {p.outcome.toLowerCase()}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[11.5px] font-semibold mb-2" style={{ color: 'var(--ink-3)' }}>
                      {d.context.collection.elsewhere.length} from elsewhere — ingredients only
                    </p>
                    <p className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>
                      {d.context.collection.elsewhere.length === 0
                        ? 'Nothing recorded outside your range.'
                        : summariseElsewhere(d.context.collection.elsewhere)}
                    </p>
                    <p className="text-[11px] mt-2" style={{ color: 'var(--ink-3)' }}>
                      No brands, no product names, no prices — by design.
                    </p>
                  </div>
                </div>
              </InsightCard>
            </>
          )}
        </div>

        <div className="space-y-6">
          {d.context && d.recommendations.length > 0 && (
            <AIBadge>{explain(d)}</AIBadge>
          )}

          <InsightCard title="Ranked against your catalog" subtitle="In stock, inside their stated budget" accent="clay">
            {d.recommendations.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                Nothing in your catalog matches their permitted categories yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {d.recommendations.map((r, i) => (
                  <div
                    key={r.productId}
                    className="rounded-xl p-3.5 flex gap-3.5"
                    style={{ border: i === 0 ? '1.5px solid var(--clay)' : '1px solid var(--border)' }}
                  >
                    <div
                      className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                      style={i === 0
                        ? { background: 'var(--clay)', color: '#fff' }
                        : { background: 'var(--porcelain-2)', color: 'var(--ink-2)' }}
                    >
                      {Math.round(r.score * 100)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-3">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{r.name}</p>
                        <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                          {r.currency} {r.price}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {r.reasons.map(x => (
                          <li key={x} className="text-[11.5px] leading-snug" style={{ color: 'var(--ink-2)' }}>· {x}</li>
                        ))}
                        {r.warnings.map(x => (
                          <li key={x} className="text-[11.5px] leading-snug" style={{ color: 'var(--blush)' }}>· {x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InsightCard>

          <InsightCard title="Since they connected" subtitle="Your own store events, and what you sent back">
            {d.activity.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Nothing recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {d.activity.map((a, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: a.type === 'PURCHASE' ? 'var(--clay)' : 'var(--sand-3)' }}
                    />
                    <div className="flex-1 flex justify-between gap-3">
                      <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                        {EVENT_LABELS[a.type] ?? a.type}
                        {a.sku && <span className="ml-1.5 font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>{a.sku}</span>}
                      </p>
                      <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{when(a.at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </InsightCard>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      className="flex justify-between py-2 gap-4"
      style={last ? {} : { borderBottom: '1px solid var(--porcelain-2)' }}
    >
      <dt style={{ color: 'var(--ink-3)' }}>{k}</dt>
      <dd className="font-medium text-right capitalize" style={{ color: 'var(--ink)' }}>{v}</dd>
    </div>
  )
}

function Tags({ label, items, tone }: { label: string; items: string[]; tone: 'clay' | 'blush' }) {
  if (items.length === 0) return null
  const style = tone === 'clay'
    ? { background: 'var(--clay-light)', color: 'var(--clay-dim)' }
    : { background: 'var(--blush-light)', color: 'var(--blush)' }
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => (
          <span key={i} className="text-[11.5px] font-medium px-2.5 py-1 rounded-full" style={style}>{i}</span>
        ))}
      </div>
    </div>
  )
}

function summariseElsewhere(items: Array<{ category: string; attributes: string[] }>): string {
  const byCategory = new Map<string, number>()
  for (const i of items) {
    const k = i.category.toLowerCase().replace(/_/g, ' ')
    byCategory.set(k, (byCategory.get(k) ?? 0) + 1)
  }
  return [...byCategory.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
}

function explain(d: NonNullable<Awaited<ReturnType<typeof getConnectedConsumer>>>): string {
  const top = d.recommendations[0]
  const liked = d.context?.preferences.liked.slice(0, 3) ?? []
  const avoided = d.context?.preferences.avoided.slice(0, 2) ?? []
  const parts: string[] = []
  if (liked.length) parts.push(`They lean towards ${liked.join(', ')}.`)
  if (avoided.length) parts.push(`They steer clear of ${avoided.join(' and ')}.`)
  if (top) parts.push(`Lead with ${top.name} — ${Math.round(top.score * 100)}% match${top.reasons[0] ? `, because it ${top.reasons[0].toLowerCase()}` : ''}.`)
  return parts.join(' ')
}
