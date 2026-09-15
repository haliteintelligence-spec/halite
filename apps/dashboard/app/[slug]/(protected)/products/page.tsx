import { ProductEngine } from '@/components/intelligence/ProductEngine'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTokenAndBrandId, getTimeframe } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        subtitle="How your catalog performs once it is ranked against real consumer profiles rather than shown to everyone the same way."
        related={[
          { href: `/${slug}/connect/insights`, label: 'Where the assortment falls short' },
          { href: `/${slug}/connect/setup`, label: 'Catalog coverage' },
        ]}
        actions={<TimeframePicker />}
      />
      {analytics ? (
        <ProductEngine products={analytics.products} usageRate={analytics.summary.usageRate} brandId={brandId} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load product data.</p>
      )}
    </div>
  )
}
