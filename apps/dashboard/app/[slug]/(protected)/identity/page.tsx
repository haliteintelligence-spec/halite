import { getIdentityIntelligence, getIngredientSignals, getTokenAndBrandId } from '@/lib/api'
import { ConsumerIdentity } from '@/components/intelligence/ConsumerIdentity'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = { title: 'Consumer Identity | Halite Intelligence' }

interface Props {
  params: Promise<{ slug: string }>
}

export default async function IdentityPage({ params }: Props) {
  const { slug } = await params
  const [data, signals, authInfo] = await Promise.all([
    getIdentityIntelligence(),
    getIngredientSignals(),
    getTokenAndBrandId(),
  ])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <PageHeader
        eyebrow="Portable identity"
        title="Consumer Identity"
        subtitle="Your shoppers arrive carrying a Hallie profile they own. This is who already has one, what it is worth to you over time, and how much of it you were permitted to read."
        related={[
          { href: `/${slug}/connect/consumers`, label: 'Who granted you access' },
          { href: `/${slug}/connect`, label: 'What that access earned' },
        ]}
      />
      {data ? (
        <ConsumerIdentity data={data} signals={signals} brandId={brandId} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load identity data.</p>
      )}
    </div>
  )
}
