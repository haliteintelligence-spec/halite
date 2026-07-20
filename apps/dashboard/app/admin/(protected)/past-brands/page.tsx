'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, Play, Users, Package, Clock } from 'lucide-react'
import type { BrandSummary, DemoSummary } from '@/lib/admin-api'
import { isOldDemo, isOldBrand } from '@/lib/brand-status'

export default function PastBrandsPage() {
  const [demos, setDemos] = useState<DemoSummary[]>([])
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos`, { headers, cache: 'no-store' })
        .then(r => r.ok ? r.json() : { demos: [] }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands`, { headers, cache: 'no-store' })
        .then(r => r.ok ? r.json() : { brands: [] }),
    ])
      .then(([d, b]: [{ demos: DemoSummary[] }, { brands: BrandSummary[] }]) => {
        setDemos(d.demos ?? [])
        setBrands(b.brands ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Old demo brands: never converted, and either their access link expired or they were deactivated.
  const oldDemos = useMemo(() => demos.filter(isOldDemo), [demos])

  // Old onboarded brands: real (non-demo) brands that were deactivated. Converted demos live here too
  // once they're deactivated, since converting turns them into a normal Brand row.
  const oldBrands = useMemo(() => brands.filter(isOldBrand), [brands])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
          Past Brands
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          {loading ? '…' : `${oldDemos.length} expired demo${oldDemos.length !== 1 ? 's' : ''} · ${oldBrands.length} inactive onboarded brand${oldBrands.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Loading…</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Play size={13} style={{ color: 'var(--ink-3)' }} />
              <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Old Demo Brands</h2>
            </div>
            {oldDemos.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No expired or deactivated demos.</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Prospect</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Consumers</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Products</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Created</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {oldDemos.map((demo, i) => (
                        <tr key={demo.id} style={{ background: 'var(--surface)', borderBottom: i < oldDemos.length - 1 ? '1px solid var(--border)' : undefined }}>
                          <td className="px-4 py-3">
                            <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{demo.prospectName ?? '—'}</p>
                            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{demo.slug}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                              {!demo.active ? 'Deactivated' : 'Access Expired'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                            <div className="flex items-center gap-1.5"><Users size={11} style={{ color: 'var(--ink-3)' }} />{demo.consumerCount}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                            <div className="flex items-center gap-1.5"><Package size={11} style={{ color: 'var(--ink-3)' }} />{demo.productCount}</div>
                          </td>
                          <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                            <div className="flex items-center gap-1.5"><Clock size={11} />{new Date(demo.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/demos/${demo.id}`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>View →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={13} style={{ color: 'var(--ink-3)' }} />
              <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Old Onboarded Brands</h2>
            </div>
            {oldBrands.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No inactive onboarded brands.</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Brand</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Plan</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Consumers</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Products</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Joined</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {oldBrands.map((brand, i) => (
                        <tr key={brand.id} style={{ background: 'var(--surface)', borderBottom: i < oldBrands.length - 1 ? '1px solid var(--border)' : undefined }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
                                <Building2 size={12} style={{ color: 'var(--ink-3)' }} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{brand.name}</p>
                                  {brand.demoProspectName && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#5b21b6' }}>From Demo</span>
                                  )}
                                </div>
                                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{brand.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink)' }}>{brand.plan}</td>
                          <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                            <div className="flex items-center gap-1.5"><Users size={11} style={{ color: 'var(--ink-3)' }} />{brand._count.endUsers.toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                            <div className="flex items-center gap-1.5"><Package size={11} style={{ color: 'var(--ink-3)' }} />{brand._count.products.toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>{new Date(brand.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <Link href={`/admin/brands/${brand.id}`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>Manage →</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
