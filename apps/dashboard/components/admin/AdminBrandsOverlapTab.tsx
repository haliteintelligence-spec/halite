'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowUpRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return typeof document !== 'undefined'
    ? document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    : undefined
}

interface OverlapRow {
  brandId: string
  brandName: string
  slug: string
  isDemo: boolean
  overlapCount: number
  overlapPct: number
}

interface Props {
  brandId: string
  brandName?: string
}

export function AdminBrandsOverlapTab({ brandId, brandName }: Props) {
  const [overlaps, setOverlaps] = useState<OverlapRow[]>([])
  const [totalLinked, setTotalLinked] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    fetch(`${API_URL}/admin/brands/${brandId}/brand-overlaps`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setOverlaps(d.overlaps); setTotalLinked(d.totalLinked) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [brandId])

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={18} className="animate-spin" style={{ color: 'var(--ink-3)' }} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
          <span className="font-semibold text-[14px]" style={{ color: 'var(--ink)' }}>{totalLinked.toLocaleString()}</span>
          {' '}identified consumers{brandName ? ` at ${brandName}` : ''} are also present at other brands in the Halite ecosystem.
        </p>
      </div>

      {overlaps.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            {totalLinked === 0
              ? 'No identified consumers yet. Cross-brand matching requires consumers to have completed the quiz.'
              : 'No consumer overlap with other brands yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--sand-1)' }}>
                  {['Brand', 'Type', 'Shared Consumers', 'Overlap', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overlaps.map((o, i) => (
                  <tr
                    key={o.brandId}
                    style={{ borderBottom: i < overlaps.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>{o.brandName}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--ink-3)' }}>{o.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: o.isDemo ? '#fef3c7' : '#ecfdf5',
                          color: o.isDemo ? '#92400e' : '#059669',
                        }}>
                        {o.isDemo ? 'Demo' : 'Brand'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold" style={{ color: 'var(--ink)' }}>{o.overlapCount.toLocaleString()}</span>
                      <span className="text-[11px] ml-1" style={{ color: 'var(--ink-3)' }}>consumers</span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--sand-2)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${o.overlapPct}%`, background: 'var(--clay)' }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold w-8 text-right" style={{ color: 'var(--ink-3)' }}>
                          {o.overlapPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={o.isDemo ? `/admin/demos/${o.brandId}` : `/admin/brands/${o.brandId}`}
                        className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                        style={{ color: 'var(--clay)' }}
                      >
                        View <ArrowUpRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
