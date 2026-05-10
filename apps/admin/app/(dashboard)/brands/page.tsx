'use client'

import useSWR from 'swr'

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]}`,
    },
  }).then((r) => r.json())

export default function BrandsPage() {
  const { data, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_API_URL}/brands`,
    fetcher
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Brands</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {data?.brands?.length ?? '—'} integrated
          </p>
        </div>
        <button
          className="text-sm font-medium px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--text-1)' }}
        >
          + Onboard Brand
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Brand', 'Plan', 'Users', 'Products', 'Shopify', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[10px] font-semibold tracking-[0.12em] uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>
                  Loading…
                </td>
              </tr>
            ) : !data?.brands?.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm italic" style={{ color: 'var(--text-3)' }}>
                  No brands onboarded yet.
                </td>
              </tr>
            ) : (
              data.brands.map((brand: any) => (
                <tr
                  key={brand.id}
                  className="border-b last:border-0 transition-colors hover:bg-[#f5f0eb]"
                  style={{ borderColor: 'var(--border-sub)' }}
                >
                  <td className="px-5 py-4 font-medium" style={{ color: 'var(--text-1)' }}>{brand.name}</td>
                  <td className="px-5 py-4 capitalize" style={{ color: 'var(--text-2)' }}>
                    {brand.plan.toLowerCase()}
                  </td>
                  <td className="px-5 py-4" style={{ color: 'var(--text-2)' }}>
                    {brand._count?.endUsers ?? 0}
                  </td>
                  <td className="px-5 py-4" style={{ color: 'var(--text-2)' }}>
                    {brand._count?.products ?? 0}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        brand.shopifyShop
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-[#9c8878]'
                      }`}
                      style={!brand.shopifyShop ? { background: 'var(--bg-muted)' } : {}}
                    >
                      {brand.shopifyShop ? 'Connected' : 'Not connected'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        brand.active ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {brand.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={`/brands/${brand.id}`}
                      className="text-xs hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-3)' }}
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
