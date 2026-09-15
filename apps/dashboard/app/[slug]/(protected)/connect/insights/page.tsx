import Link from 'next/link'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { MetricTile } from '@/components/ui/MetricTile'
import { getConnectInsights } from '@/lib/api'

export const metadata = { title: 'Audience insights | Halite Intelligence' }

interface Props { params: Promise<{ slug: string }> }

function label(attr: string): string {
  return attr.replace(/_/g, ' ')
}

export default async function AudienceInsightsPage({ params }: Props) {
  const { slug } = await params
  const d = await getConnectInsights()

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
            Audience insights
          </h1>
        </div>
        {d && !d.suppressed && (
          <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
            {d.cohort} connected consumers
          </span>
        )}
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6 space-y-6">
        {!d ? (
          <InsightCard title="Could not load insights" subtitle="Try again in a moment">
            <p className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>No data came back.</p>
          </InsightCard>
        ) : d.suppressed ? (
          <InsightCard title="Not enough people yet" subtitle={`${d.cohort} of ${d.minimumCohort} needed`} accent="gold">
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Aggregates are withheld until enough consumers have connected that a row cannot be traced
              back to one person. At {d.cohort} {d.cohort === 1 ? 'profile' : 'profiles'}, a single
              preference would identify someone — so nothing is shown rather than something misleading.
            </p>
            <p className="text-[12.5px] mt-3" style={{ color: 'var(--ink-2)' }}>
              <Link href={`/${slug}/connect/setup`} className="underline">Place the Connect prompt</Link>{' '}
              on more of your storefront to get there faster.
            </p>
          </InsightCard>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricTile label="Connected consumers" value={d.cohort.toLocaleString()} sub="Everything here is aggregated" />
              <MetricTile label="Products in scope" value={(d.catalogSize ?? 0).toLocaleString()} sub="Inside your categories" />
              <MetricTile
                label="Unmet demand"
                value={d.unmet.length.toLocaleString()}
                sub={d.unmet.length ? 'Wanted, barely stocked' : 'Assortment covers demand'}
              />
              <MetricTile
                label="Typical budget"
                value={d.budget ? `$${d.budget.median}` : '—'}
                sub={d.budget ? `median of ${d.budget.sample} who stated one` : 'No budgets stated'}
              />
            </div>

            <AIBadge>{headline(d)}</AIBadge>

            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6 items-start">
              <InsightCard
                title="Demand against your catalog"
                subtitle="What connected shoppers want vs. what you stock"
                accent="clay"
              >
                <div className="flex gap-4 mb-4">
                  <Legend colour="var(--clay)" text="Shoppers who want it" />
                  <Legend colour="var(--gold)" text="Your catalog" />
                </div>
                <div className="space-y-3.5">
                  {d.demand.map(row => {
                    const gap = row.wantedPct - row.stockedPct
                    return (
                      <div key={row.attribute}>
                        <div className="flex justify-between mb-1.5 gap-3">
                          <span className="text-[12px] capitalize truncate" style={{ color: 'var(--ink)' }}>
                            {label(row.attribute)}
                          </span>
                          <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                            {row.wantedPct}% want ·{' '}
                            <span style={{ color: gap > 15 ? 'var(--blush)' : 'var(--ink-3)', fontWeight: gap > 15 ? 600 : 400 }}>
                              {row.stockedPct}% stocked
                            </span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Bar pct={row.wantedPct} colour="var(--clay)" />
                          <Bar pct={row.stockedPct} colour="var(--gold)" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </InsightCard>

              <div className="space-y-6">
                <InsightCard title="Asked for, barely stocked" subtitle="Where the assortment is thin">
                  {d.unmet.length === 0 ? (
                    <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                      Nothing stands out — your catalog covers what this audience asks for.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {d.unmet.map(u => (
                        <div key={u.attribute} className="flex justify-between items-start gap-3 pb-3" style={{ borderBottom: '1px solid var(--porcelain-2)' }}>
                          <div>
                            <p className="text-[12.5px] font-medium capitalize" style={{ color: 'var(--ink)' }}>{label(u.attribute)}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                              {u.people} shoppers · {u.products} {u.products === 1 ? 'product' : 'products'}
                            </p>
                          </div>
                          <span className="text-[11.5px] font-semibold whitespace-nowrap" style={{ color: 'var(--blush)' }}>
                            {u.stockedPct === 0 ? 'no match' : `${u.stockedPct}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </InsightCard>

                {d.overstocked && d.overstocked.length > 0 && (
                  <InsightCard title="Stocked beyond demand" subtitle="The other half of an assortment gap">
                    <div className="space-y-2.5">
                      {d.overstocked.map(o => (
                        <div key={o.attribute} className="flex justify-between items-center gap-3">
                          <span className="text-[12.5px] capitalize" style={{ color: 'var(--ink)' }}>{label(o.attribute)}</span>
                          <span className="text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                            {o.stockedPct}% stocked · <span style={{ color: 'var(--gold)' }}>{o.wantedPct}% want</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                )}

                {d.concerns && d.concerns.length > 0 && (
                  <InsightCard title="What they are solving for" subtitle="Concerns across the audience">
                    <div className="space-y-2.5">
                      {d.concerns.map(c => (
                        <div key={c.concern}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[12px] capitalize" style={{ color: 'var(--ink)' }}>
                              {c.concern.toLowerCase().replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11.5px]" style={{ color: 'var(--ink-2)' }}>{c.pct}%</span>
                          </div>
                          <Bar pct={c.pct} colour="var(--clay)" />
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                )}
              </div>
            </div>

            {d.avoided && d.avoided.length > 0 && (
              <InsightCard title="What they steer away from" subtitle="Repeatedly reported as not working">
                <div className="flex flex-wrap gap-2">
                  {d.avoided.map(a => (
                    <span
                      key={a.attribute}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-full capitalize"
                      style={{ background: 'var(--blush-light)', color: 'var(--blush)' }}
                    >
                      {label(a.attribute)} · {a.pct}%
                    </span>
                  ))}
                </div>
              </InsightCard>
            )}

            <InsightCard title="What works, once they buy it" subtitle="Recommended products, and what happened next">
              {d.outcomes.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  No purchases attributed yet.{' '}
                  <Link href={`/${slug}/connect/setup`} className="underline">Send purchase events</Link> and this fills in.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 560 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Product', 'Added to bag', 'Purchased', 'Returned', 'Kept', 'Revenue'].map((h, i) => (
                          <th key={h} className={`py-2 text-[10px] font-semibold tracking-[0.12em] uppercase ${i ? 'text-right' : ''}`} style={{ color: 'var(--ink-3)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.outcomes.map(o => (
                        <tr key={o.productId} style={{ borderBottom: '1px solid var(--porcelain-2)' }}>
                          <td className="py-2.5 text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{o.name}</td>
                          <td className="py-2.5 text-[12.5px] text-right" style={{ color: 'var(--ink-2)' }}>{o.addedToCart}</td>
                          <td className="py-2.5 text-[12.5px] text-right" style={{ color: 'var(--ink-2)' }}>{o.purchases}</td>
                          <td className="py-2.5 text-[12.5px] text-right" style={{ color: o.returns ? 'var(--blush)' : 'var(--ink-2)' }}>{o.returns}</td>
                          <td className="py-2.5 text-[12.5px] text-right font-semibold" style={{ color: o.keptPct >= 90 ? 'var(--sage)' : 'var(--ink-2)' }}>{o.keptPct}%</td>
                          <td className="py-2.5 text-[12.5px] text-right font-semibold" style={{ color: 'var(--ink)' }}>${o.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </InsightCard>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/${slug}/products`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                Product performance →
              </Link>
              <Link href={`/${slug}/catalog`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                Fix the gaps in your catalog →
              </Link>
              <Link href={`/${slug}/connect/consumers`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                Who these people are →
              </Link>
            </div>

            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Aggregated across the {d.cohort} consumers who granted you access, and withheld entirely
              below {d.minimumCohort}. Nothing here is traceable to an individual, and nothing comes
              from another brand&rsquo;s customers.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Bar({ pct, colour }: { pct: number; colour: string }) {
  return (
    <div className="h-2 rounded-sm overflow-hidden" style={{ background: 'var(--porcelain-2)' }}>
      <div className="h-full rounded-sm" style={{ width: `${Math.min(100, pct)}%`, background: colour }} />
    </div>
  )
}

function Legend({ colour, text }: { colour: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink-2)' }}>
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colour }} />
      {text}
    </span>
  )
}

function headline(d: NonNullable<Awaited<ReturnType<typeof getConnectInsights>>>): string {
  const parts: string[] = []
  const worst = d.unmet[0]
  if (worst) {
    parts.push(
      `${worst.wantedPct}% of your connected shoppers look for ${label(worst.attribute)}, and ${
        worst.stockedPct === 0 ? 'nothing in your catalog offers it' : `only ${worst.stockedPct}% of your catalog does`
      }.`,
    )
  }
  const over = d.overstocked?.[0]
  if (over) {
    parts.push(`Meanwhile ${over.stockedPct}% of your assortment leans on ${label(over.attribute)}, which ${over.wantedPct}% ask for.`)
  }
  const best = d.outcomes[0]
  if (best) {
    parts.push(`${best.name} is carrying the most attributed revenue, kept by ${best.keptPct}% of the people who bought it.`)
  }
  if (parts.length === 0) {
    parts.push(`Across ${d.cohort} connected shoppers, your catalog covers what they ask for — no single attribute stands out as a gap yet.`)
  }
  return parts.join(' ')
}
