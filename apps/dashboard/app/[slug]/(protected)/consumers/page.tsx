import { ConsumerPanel } from '@/components/intelligence/ConsumerPanel'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string }>
}

export default async function ConsumersPage({ params: _, searchParams }: Props) {
  const { days: rawDays } = await searchParams
  const days = Number(rawDays) || 30
  const analytics = await getAnalytics(days)

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Consumer</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Deep consumer demographics, skin tone distribution & behaviour patterns
          </p>
        </div>
        <TimeframePicker />
      </div>
      {analytics ? (
        <ConsumerPanel
          consumers={analytics.consumers}
          checkIns={analytics.checkIns}
          totalConsumers={analytics.summary.totalConsumers}
        />
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load consumer data.</p>
      )}
    </div>
  )
}
