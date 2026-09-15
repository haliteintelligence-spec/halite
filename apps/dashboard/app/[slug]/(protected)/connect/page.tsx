import { MetricTile } from '@/components/ui/MetricTile'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { Users, Lock, TrendingUp, Package } from 'lucide-react'
import { getConnectAnalytics, getTimeframe } from '@/lib/api'
import Link from 'next/link'

export const metadata = { title: 'Connect | Halite Intelligence' }

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

const SURFACE_LABELS: Record<string, string> = {
  pdp: 'Product page',
  collection: 'Collection page',
  quiz: 'Quiz',
  search: 'Search results',
  checkout: 'Checkout',
  account: 'Account',
  agent: 'AI agent',
  unspecified: 'Unlabelled',
}

function money(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n)
}

export default async function ConnectPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { days } = await getTimeframe(await searchParams)
  const data = await getConnectAnalytics(days)
  const s = data?.summary
  const f = data?.funnel

  return (
    <div className="min-h-full">
      <div
        className="sticky top-0 z-10 px-4 py-3 md:px-7 md:py-4 flex items-center justify-between gap-3"
        style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Halite Connect
          </p>
          <h1 className="font-display text-xl leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>
            Performance
          </h1>
        </div>
        <TimeframePicker />
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6 space-y-6">
        {!data ? (
          <EmptyState slug={slug} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricTile
                label="Connected consumers"
                value={s!.connectedConsumers.toLocaleString()}
                sub={`${s!.newConnections} new this period`}
                icon={<Users size={14} />}
                {...(s!.newConnectionsDelta != null
                  ? { trend: { delta: s!.newConnectionsDelta, label: 'vs previous' } }
                  : {})}
                href={`/${slug}/connect/consumers`}
              />
              <MetricTile
                label="Consent accepted"
                value={s!.promptsShown ? `${s!.acceptanceRate}%` : '—'}
                sub={`${s!.promptsShown.toLocaleString()} prompts shown`}
                icon={<Lock size={14} />}
              />
              <MetricTile
                label="Orders from connected"
                value={s!.orders.toLocaleString()}
                sub={s!.averageOrderValue ? `AOV ${money(s!.averageOrderValue)}` : 'No orders yet'}
                icon={<TrendingUp size={14} />}
              />
              <MetricTile
                label="Revenue influenced"
                value={money(s!.revenueInfluenced)}
                sub={`${s!.revoked} disconnected this period`}
                icon={<Package size={14} />}
                {...(s!.revenueDelta != null
                  ? { trend: { delta: s!.revenueDelta, label: 'vs previous' } }
                  : {})}
              />
            </div>

            <AIBadge>{headline(data)}</AIBadge>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <InsightCard
                title="What connected shoppers did"
                subtitle="Only people who granted you access"
                accent="clay"
              >
                <div className="space-y-4">
                  <FunnelRow label="Saw a ranked recommendation" value={f!.recommendationsShown} max={f!.recommendationsShown} />
                  <FunnelRow label="Opened a recommended product" value={f!.productViews} max={f!.recommendationsShown} />
                  <FunnelRow label="Added to bag" value={f!.addToCart} max={f!.recommendationsShown} note={`${f!.viewToCartRate}% of views`} />
                  <FunnelRow label="Saved to their Hallie wishlist" value={f!.saved} max={f!.recommendationsShown} />
                  <FunnelRow label="Purchased" value={f!.purchases} max={f!.recommendationsShown} note={`${f!.cartToPurchaseRate}% of bags`} />
                  <FunnelRow label="Returned within the window" value={f!.returns} max={f!.recommendationsShown} note={`${f!.returnRate}% of orders`} negative />
                </div>
              </InsightCard>

              <InsightCard
                title="Where they connect"
                subtitle="Acceptance rate by placement"
                accent="gold"
              >
                {data.surfaces.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    No prompts recorded yet. Add <code className="font-mono">data-halite-connect</code> to a
                    button on your storefront and the placements will appear here.
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {data.surfaces.map(row => (
                      <div key={row.surface}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[12px]" style={{ color: 'var(--ink)' }}>
                            {SURFACE_LABELS[row.surface] ?? row.surface}
                          </span>
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                            {row.acceptanceRate}%
                          </span>
                        </div>
                        <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'var(--porcelain-2)' }}>
                          <div
                            className="h-full rounded-sm"
                            style={{ width: `${Math.min(100, row.acceptanceRate)}%`, background: 'var(--clay)' }}
                          />
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>
                          {row.shown.toLocaleString()} shown · {row.accepted.toLocaleString()} connected
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </InsightCard>
            </div>

            <InsightCard
              title="Recommendations that converted"
              subtitle="Ranked by revenue Halite can attribute"
            >
              {data.topProducts.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  Nothing to attribute yet. Send purchase events to <code className="font-mono">/v1/events</code> and
                  this fills in.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 640 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <Th>Product</Th>
                        <Th right>Shown</Th>
                        <Th right>Avg match</Th>
                        <Th right>Add to bag</Th>
                        <Th right>Purchased</Th>
                        <Th right>Revenue</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map(p => (
                        <tr key={p.productId} style={{ borderBottom: '1px solid var(--porcelain-2)' }}>
                          <td className="py-2.5 text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                            {p.name}
                            {p.sku && <span className="ml-1.5 font-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>{p.sku}</span>}
                          </td>
                          <Td>{p.shown.toLocaleString()}</Td>
                          <Td>{p.avgMatch.toFixed(2)}</Td>
                          <Td>{p.addToCartRate}%</Td>
                          <Td>{p.purchases.toLocaleString()}</Td>
                          <td className="py-2.5 text-[12.5px] font-semibold text-right" style={{ color: 'var(--ink)' }}>
                            {money(p.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </InsightCard>

            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
              Every figure here comes from consumers who granted you access. Access runs until they
              disconnect — see <Link href={`/${slug}/connect/consumers`} className="underline">connected consumers</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function headline(d: NonNullable<Awaited<ReturnType<typeof getConnectAnalytics>>>): string {
  const { summary: s, funnel: f, surfaces } = d
  if (s.promptsShown === 0) {
    return 'Connect is installed but no prompt has been shown yet. Place the Connect button on a product page — that placement accepts at roughly twice the rate of checkout.'
  }
  const best = surfaces.filter(x => x.shown >= 20).sort((a, b) => b.acceptanceRate - a.acceptanceRate)[0]
  const worst = surfaces.filter(x => x.shown >= 20).sort((a, b) => a.acceptanceRate - b.acceptanceRate)[0]
  const parts: string[] = [
    `${s.accepted.toLocaleString()} of ${s.promptsShown.toLocaleString()} shoppers who saw the prompt connected — ${s.acceptanceRate}%.`,
  ]
  if (best && worst && best.surface !== worst.surface) {
    parts.push(`${SURFACE_LABELS[best.surface] ?? best.surface} accepts at ${best.acceptanceRate}% against ${worst.acceptanceRate}% on ${(SURFACE_LABELS[worst.surface] ?? worst.surface).toLowerCase()}.`)
  }
  if (f.purchases > 0) {
    parts.push(`${f.purchases.toLocaleString()} orders followed a Halite recommendation, worth ${money(s.revenueInfluenced)}.`)
  } else if (f.addToCart > 0) {
    parts.push(`${f.addToCart} bags have been started from recommendations but no purchase event has arrived — check that your store is posting purchases to /v1/events.`)
  }
  return parts.join(' ')
}

function FunnelRow({ label, value, max, note, negative }: {
  label: string; value: number; max: number; note?: string; negative?: boolean
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span className="text-[11.5px] font-semibold" style={{ color: 'var(--ink)' }}>
          {value.toLocaleString()}{note && <span className="font-normal ml-1.5" style={{ color: 'var(--ink-3)' }}>{note}</span>}
        </span>
      </div>
      <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'var(--porcelain-2)' }}>
        <div
          className="h-full rounded-sm"
          style={{ width: `${width}%`, background: negative ? 'var(--blush)' : 'var(--clay)' }}
        />
      </div>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`py-2 text-[10px] font-semibold tracking-[0.12em] uppercase ${right ? 'text-right' : ''}`}
      style={{ color: 'var(--ink-3)' }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-2.5 text-[12.5px] text-right" style={{ color: 'var(--ink-2)' }}>{children}</td>
  )
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <InsightCard title="Connect is not reporting yet" subtitle="Two things switch it on" accent="clay">
      <ol className="space-y-3 text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
        <li>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>1. Set your categories.</span>{' '}
          They decide what Connect may ask a shopper for.{' '}
          <Link href={`/${slug}/settings`} className="underline">Settings</Link>
        </li>
        <li>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>2. Place the prompt.</span>{' '}
          Add the widget script and a <code className="font-mono">data-halite-connect</code> button to a product page.{' '}
          <Link href={`/${slug}/settings/widget`} className="underline">Widget setup</Link>
        </li>
      </ol>
    </InsightCard>
  )
}
