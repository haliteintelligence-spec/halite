import Link from 'next/link'
import { getBrands } from '@/lib/admin-api'
import { Building2, Users, Package, Plus } from 'lucide-react'

export default async function BrandsPage() {
  const brands = await getBrands()

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            Active Brands
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {brands.length} paying customer{brands.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/brands/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--clay)' }}
        >
          <Plus size={14} />
          Onboard Brand
        </Link>
      </div>

      {brands.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No active brands yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'Plan', 'Consumers', 'Products', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map((brand, i) => (
                <tr
                  key={brand.id}
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < brands.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
                        <Building2 size={12} style={{ color: 'var(--ink-3)' }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{brand.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{brand.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={brand.plan} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink)' }}>
                      <Users size={11} style={{ color: 'var(--ink-3)' }} />
                      {brand._count.endUsers.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--ink)' }}>
                      <Package size={11} style={{ color: 'var(--ink-3)' }} />
                      {brand._count.products.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={brand.active ? { background: '#d4f4dd', color: '#1a7a3c' } : { background: '#f3f4f6', color: '#6b7280' }}>
                      {brand.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/brands/${brand.id}`} className="text-[12px] font-medium hover:underline" style={{ color: 'var(--clay)' }}>
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    PRO:        { bg: '#ede9fe', color: '#5b21b6' },
    GROWTH:     { bg: '#dbeafe', color: '#1e40af' },
    STARTER:    { bg: '#f3f4f6', color: '#374151' },
    ENTERPRISE: { bg: '#fef3c7', color: '#92400e' },
  }
  const s = styles[plan.toUpperCase()] ?? styles.STARTER
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={s}>{plan}</span>
}
