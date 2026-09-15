import Link from 'next/link'
import { InsightCard } from '@/components/ui/InsightCard'
import { getConnectedConsumers } from '@/lib/api'

export const metadata = { title: 'Connected consumers | Halite Intelligence' }

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ status?: string }>
}

const AREA_LABELS: Record<string, string> = {
  SKINCARE: 'Skincare', BODY: 'Body', HAIR: 'Hair', MAKEUP: 'Makeup',
  FRAGRANCE: 'Fragrance', NAILS: 'Nails', WELLNESS: 'Wellness',
  SUN_CARE: 'Sun care', LIP_CARE: 'Lip care', EYE_CARE: 'Eye care',
}

function when(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ConnectedConsumersPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const status = (sp.status === 'revoked' || sp.status === 'all' ? sp.status : 'active') as
    'active' | 'revoked' | 'all'
  const rows = await getConnectedConsumers(status)

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
            Connected consumers
          </h1>
        </div>
        <div className="flex gap-2">
          {(['active', 'revoked', 'all'] as const).map(s => (
            <Link
              key={s}
              href={`/${slug}/connect/consumers?status=${s}`}
              className="text-[11.5px] font-medium px-2.5 py-1 rounded-full capitalize"
              style={
                s === status
                  ? { background: 'var(--clay)', color: '#fff' }
                  : { background: 'var(--porcelain-2)', color: 'var(--ink-2)' }
              }
            >
              {s === 'revoked' ? 'Disconnected' : s}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6">
        {rows.length === 0 ? (
          <InsightCard title="No one here yet" subtitle={`No ${status === 'all' ? '' : status} grants`}>
            <p className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
              People appear here the moment they allow access from your storefront. Nothing is
              listed before they do — Halite does not hand you a profile you were not given.
            </p>
          </InsightCard>
        ) : (
          <InsightCard
            title={`${rows.length} ${status === 'revoked' ? 'disconnected' : 'connected'}`}
            subtitle="Access runs until the consumer disconnects"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Consumer', 'Scope', 'Connected', 'Last read', 'Orders', 'Revenue', ''].map((h, i) => (
                      <th
                        key={h + i}
                        className={`py-2 text-[10px] font-semibold tracking-[0.12em] uppercase ${i >= 4 ? 'text-right' : ''}`}
                        style={{ color: 'var(--ink-3)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.consumerId} style={{ borderBottom: '1px solid var(--porcelain-2)' }}>
                      <td className="py-3">
                        <p className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                          {r.name ?? r.email ?? r.consumerId}
                        </p>
                        <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>
                          {r.consumerId}
                          {r.email && r.name ? ` · ${r.email}` : ''}
                        </p>
                      </td>
                      <td className="py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                        {r.categories.map(c => AREA_LABELS[c] ?? c).join(', ')}
                      </td>
                      <td className="py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                        {when(r.connectedAt)}
                        {r.connectedVia && (
                          <span className="block text-[11px]" style={{ color: 'var(--ink-3)' }}>
                            via {r.connectedVia}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                        {r.status === 'active' ? when(r.lastReadAt) : (
                          <span style={{ color: 'var(--blush)' }}>stopped {when(r.disconnectedAt)}</span>
                        )}
                      </td>
                      <td className="py-3 text-[12px] text-right" style={{ color: 'var(--ink-2)' }}>{r.orders}</td>
                      <td className="py-3 text-[12px] text-right font-semibold" style={{ color: 'var(--ink)' }}>
                        {r.revenue ? `$${r.revenue.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 text-right">
                        {r.status === 'active' && (
                          <Link
                            href={`/${slug}/connect/consumers/${r.consumerId}`}
                            className="text-[11.5px] font-semibold"
                            style={{ color: 'var(--clay)' }}
                          >
                            Open
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InsightCard>
        )}
      </div>
    </div>
  )
}
