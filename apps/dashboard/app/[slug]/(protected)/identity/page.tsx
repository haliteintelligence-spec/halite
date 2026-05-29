import { getIdentityIntelligence, getIngredientSignals, getTokenAndBrandId } from '@/lib/api'
import { ConsumerIdentity } from '@/components/intelligence/ConsumerIdentity'

export const metadata = { title: 'Consumer Identity | Halite Intelligence' }

export default async function IdentityPage() {
  const [data, signals, authInfo] = await Promise.all([
    getIdentityIntelligence(),
    getIngredientSignals(),
    getTokenAndBrandId(),
  ])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Consumer Identity</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Who has a portable Halite profile, retention signals & cross-brand intelligence
          </p>
        </div>
      </div>
      {data ? (
        <ConsumerIdentity data={data} signals={signals} brandId={brandId} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load identity data.</p>
      )}
    </div>
  )
}
