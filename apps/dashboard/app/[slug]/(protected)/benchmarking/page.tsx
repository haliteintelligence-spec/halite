import { BenchmarkMatrix } from '@/components/intelligence/BenchmarkMatrix'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { getAnalytics, getTokenAndBrandId } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function BenchmarkingPage({ params: _, searchParams }: Props) {
  const { days: rawDays, from, to } = await searchParams
  const days = Number(rawDays) || 30
  const [analytics, authInfo] = await Promise.all([getAnalytics(days, from, to), getTokenAndBrandId()])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-7 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Benchmarking</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Performance vs industry benchmarks, peer comparison & growth trajectory
          </p>
        </div>
        <TimeframePicker />
      </div>
      {analytics ? (
        <BenchmarkMatrix analytics={analytics} brandId={brandId} />
      ) : (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No data yet — benchmarks will populate once consumers start checking in.</p>
        </div>
      )}
    </div>
  )
}
