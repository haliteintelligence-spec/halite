import { OutcomeTracker } from '@/components/intelligence/OutcomeTracker'
import { getAnalytics } from '@/lib/api'

interface Props { params: Promise<{ slug: string }> }

export default async function OutcomesPage({ params: _ }: Props) {
  const analytics = await getAnalytics()

  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Intelligence
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Outcomes</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Skin rating trends, compliance, symptom signals & routine refinement history
        </p>
      </div>
      {analytics ? (
        <OutcomeTracker
          checkIns={analytics.checkIns}
          outcomes={analytics.outcomes}
          summary={analytics.summary}
        />
      ) : (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load outcome data.</p>
        </div>
      )}
    </div>
  )
}
