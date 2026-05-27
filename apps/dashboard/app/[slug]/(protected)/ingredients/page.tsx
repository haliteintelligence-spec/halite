import { IngredientLab } from '@/components/intelligence/IngredientLab'
import { IngredientExtended } from '@/components/intelligence/IngredientExtended'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTokenAndBrandId, getTimeframe } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function IngredientsPage({ params: _, searchParams }: Props) {
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Ingredient Lab & Product Performance</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Ingredient efficacy index, reaction flags, formulation gaps & product rankings
          </p>
        </div>
        <TimeframePicker />
      </div>
      {analytics ? (
        <>
          <IngredientLab products={analytics.products} brandId={brandId} />
          <IngredientExtended
            products={analytics.products}
            symptoms={analytics.checkIns.symptoms}
            brandId={brandId}
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load ingredient data.</p>
      )}
    </div>
  )
}
