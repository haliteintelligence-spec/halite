import Link from 'next/link'
import { InsightCard } from '@/components/ui/InsightCard'
import { getConnectSetup } from '@/lib/api'
import { WIDGET_URL } from '@/lib/widget-url'

export const metadata = { title: 'Connect setup | Halite Intelligence' }

interface Props { params: Promise<{ slug: string }> }

const SURFACE_LABELS: Record<string, string> = {
  pdp: 'Product page', collection: 'Collection page', quiz: 'Quiz',
  search: 'Search results', checkout: 'Checkout', account: 'Account',
  agent: 'AI agent', unspecified: 'Unlabelled',
}

const PLACEMENTS = [
  { value: 'pdp', label: 'Product page', note: 'Highest acceptance — the shopper is already deciding' },
  { value: 'quiz', label: 'Finder quiz', note: 'They are already answering questions about themselves' },
  { value: 'collection', label: 'Collection & search', note: 'Good for reordering a long list' },
  { value: 'checkout', label: 'Checkout', note: 'Rarely worth it — the choice is already made' },
]

function when(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ConnectSetupPage({ params }: Props) {
  const { slug } = await params
  const d = await getConnectSetup()

  if (!d) {
    return (
      <div className="px-4 py-5 md:px-7 md:py-6">
        <InsightCard title="Could not load setup" subtitle="Try again in a moment">
          <p className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
            The Connect setup details could not be read.
          </p>
        </InsightCard>
      </div>
    )
  }

  const embed = `<script src="${WIDGET_URL}"\n        data-api-key="${d.brand.apiKey}"\n        data-accent="${d.brand.accentColor}"></script>`
  const prompt = `<div data-halite-connect="pdp"></div>`
  const eventSnippet = `POST /v1/events\nAuthorization: Bearer ${d.brand.apiKey.slice(0, 10)}…\n\n{\n  "event": "purchase",\n  "consumer_id": "hl_…",\n  "recommendation_id": "rec_…",\n  "sku": "YOUR-SKU",\n  "value": 48.00\n}`

  return (
    <div className="min-h-full">
      <div
        className="sticky top-0 z-10 px-4 py-3 md:px-7 md:py-4"
        style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Halite Connect
        </p>
        <h1 className="font-display text-xl leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>Set up</h1>
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6 space-y-6">

        {/* Progress across the four things that have to be true */}
        <div className="bg-surface rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {d.steps.map((s, i) => (
              <div key={s.key} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                  style={s.done
                    ? { background: 'var(--sage)', color: '#fff' }
                    : { border: '1.5px solid var(--border)', color: 'var(--ink-3)' }}
                >
                  {s.done ? '✓' : i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold" style={{ color: s.done ? 'var(--ink)' : 'var(--ink-2)' }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] mt-0.5 capitalize" style={{ color: s.done ? 'var(--ink-3)' : 'var(--gold)' }}>
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">

            <InsightCard
              title="Your categories"
              subtitle="They decide what Connect may ask a shopper for"
              accent="clay"
            >
              {d.brand.categories.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: 'var(--blush)' }}>
                  None set. Connect refuses to show a consent screen until at least one is chosen —
                  ask your Halite contact to set them.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {d.brand.categories.map(c => (
                      <span
                        key={c}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-full capitalize"
                        style={{ background: 'var(--clay)', color: '#fff' }}
                      >
                        {c.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11.5px] mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                    A shopper is asked for these and nothing else. Anything outside them stays out of
                    every response, whatever your integration requests.
                  </p>
                </>
              )}
            </InsightCard>

            <InsightCard title="Catalog" subtitle="Halite reads your products — it never writes to them">
              <div
                className="rounded-xl p-3.5 mb-3"
                style={{ border: `1.5px solid ${d.catalog.source.connected ? 'var(--clay)' : 'var(--border)'}` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                      {d.catalog.source.kind === 'none' ? 'No catalog connected' : d.catalog.source.label}
                    </p>
                    <p className="text-[11.5px] mt-1" style={{ color: 'var(--ink-3)' }}>
                      {d.catalog.total} products in your categories · {d.catalog.inStock} in stock
                      {d.catalog.lastSyncAt && ` · last sync ${when(d.catalog.lastSyncAt)}`}
                    </p>
                  </div>
                  <Link href={`/${slug}/catalog`} className="text-[11.5px] font-semibold whitespace-nowrap" style={{ color: 'var(--clay)' }}>
                    Manage
                  </Link>
                </div>
              </div>

              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2.5" style={{ color: 'var(--ink-3)' }}>
                What Halite can read
              </p>
              <div className="space-y-3">
                {d.catalog.coverage.map(c => {
                  const pct = c.total ? Math.round((c.filled / c.total) * 100) : 0
                  const colour = pct >= 90 ? 'var(--sage)' : pct >= 50 ? 'var(--gold)' : 'var(--blush)'
                  return (
                    <div key={c.field}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{c.field}</span>
                        <span className="text-[11.5px]" style={{ color: pct >= 50 ? 'var(--ink-2)' : 'var(--blush)' }}>
                          {c.filled} / {c.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: 'var(--porcelain-2)' }}>
                        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: colour }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                Thin coverage is the usual reason matches come back weak — Halite can only match on
                what your product data actually says.
              </p>
            </InsightCard>
          </div>

          <div className="space-y-6">
            <InsightCard title="Place the prompt" subtitle="One script, then a div wherever you want to ask">
              <Code>{embed}</Code>
              <p className="text-[11.5px] mt-3 mb-2" style={{ color: 'var(--ink-2)' }}>
                Then drop this where the shopper should be asked. The value names the placement, so
                you can compare acceptance across them.
              </p>
              <Code>{prompt}</Code>

              <div className="mt-4 space-y-2">
                {PLACEMENTS.map(p => {
                  const live = d.placements.find(x => x.surface === p.value)
                  return (
                    <div
                      key={p.value}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                      style={{ border: `1px solid ${live ? 'var(--clay)' : 'var(--border)'}`, background: live ? 'var(--clay-light)' : 'transparent' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: live ? 'var(--clay)' : 'var(--sand-3)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>{p.label}</span>
                          <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>
                            {live ? `${live.shown.toLocaleString()} shown` : 'not live'}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>{p.note}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </InsightCard>

            <InsightCard
              title="Send outcomes back"
              subtitle="Without these there is no conversion reporting"
              accent={d.events['PURCHASE'] ? 'sage' : 'gold'}
            >
              <Code>{eventSnippet}</Code>
              <p className="text-[11.5px] mt-3 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {d.events['PURCHASE']
                  ? `${d.events['PURCHASE']} purchases attributed so far.`
                  : 'No purchase events have arrived yet, so revenue influenced will read zero.'}
                {' '}On Shopify, order webhooks can do this for you.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {['PRODUCT_VIEWED', 'ADD_TO_CART', 'WISHLISTED', 'PURCHASE'].map(t => (
                  <div key={t} className="rounded-lg px-3 py-2" style={{ background: 'var(--sand-1)' }}>
                    <p className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--ink-3)' }}>
                      {t.toLowerCase().replace(/_/g, ' ')}
                    </p>
                    <p className="text-[15px] font-semibold mt-0.5" style={{ color: 'var(--ink)' }}>
                      {(d.events[t] ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </InsightCard>
          </div>
        </div>

        {d.placements.length > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Live placements: {d.placements.map(p => SURFACE_LABELS[p.surface] ?? p.surface).join(', ')}.{' '}
            <Link href={`/${slug}/connect`} className="underline">See how each one converts</Link>
          </p>
        )}
      </div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre
      className="rounded-xl px-4 py-3.5 overflow-x-auto text-[11.5px] leading-relaxed font-mono whitespace-pre-wrap break-all"
      style={{ background: 'var(--clay-dark)', color: 'var(--sand-2)' }}
    >
      {children}
    </pre>
  )
}
