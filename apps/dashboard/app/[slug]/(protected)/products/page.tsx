import { ProductEngine } from '@/components/intelligence/ProductEngine'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTokenAndBrandId, getTimeframe } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function ProductsPage({ params: _, searchParams }: Props) {
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Products</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Recommendation performance, adoption rates & product-level analytics
          </p>
        </div>
        <TimeframePicker />
      </div>
      {analytics ? (
        <ProductEngine products={analytics.products} usageRate={analytics.summary.usageRate} brandId={brandId} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load product data.</p>
      )}
    </div>
  )
}
