import { OutcomeTracker } from '@/components/intelligence/OutcomeTracker'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTokenAndBrandId, getTimeframe } from '@/lib/api'
import { PageHeader } from '@/components/ui/PageHeader'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function OutcomesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSP = await searchParams
  const { days, from, to } = await getTimeframe(rawSP)
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <PageHeader
        eyebrow="The loop"
        title="Outcomes"
        subtitle="What happened after people used what you recommended. Every outcome reported here sharpens the profile that shopper carries — to their next visit, and to the next brand they connect to."
        related={[
          { href: `/${slug}/connect/insights`, label: 'What works, and for whom' },
          { href: `/${slug}/connect/setup`, label: 'Send outcomes back' },
        ]}
        actions={<TimeframePicker />}
      />
      {analytics ? (
        <OutcomeTracker
          checkIns={analytics.checkIns}
          outcomes={analytics.outcomes}
          summary={analytics.summary}
          brandId={brandId}
        />
      ) : (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load outcome data.</p>
        </div>
      )}
    </div>
  )
}
