import { getIdentityIntelligence, getTokenAndBrandId } from '@/lib/api'
import { ConsumerIdentity } from '@/components/intelligence/ConsumerIdentity'

export const metadata = { title: 'Consumer Identity | Halite Intelligence' }

export default async function IdentityPage() {
  const [data, authInfo] = await Promise.all([getIdentityIntelligence(), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  if (!data) {
    return (
      <div>
        <h1 className="text-xl font-semibold font-display mb-1" style={{ color: 'var(--ink)' }}>
          Consumer Identity
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Could not load identity data. Please refresh.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold font-display mb-1" style={{ color: 'var(--ink)' }}>
          Consumer Identity
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Cross-brand identity layer — who has a portable Halite profile, and what cross-brand signals they carry.
        </p>
      </div>
      <ConsumerIdentity data={data} brandId={brandId} />
    </div>
  )
}
