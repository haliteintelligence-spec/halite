import { BenchmarkMatrix } from '@/components/intelligence/BenchmarkMatrix'
import { getAnalytics } from '@/lib/api'

interface Props { params: Promise<{ slug: string }> }

export default async function BenchmarkingPage({ params }: Props) {
  const { slug } = await params
  const analytics = await getAnalytics()

  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Intelligence
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Benchmarking</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Performance vs industry benchmarks, peer comparison & growth trajectory
        </p>
      </div>
      {analytics ? (
        <BenchmarkMatrix analytics={analytics} />
      ) : (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No data yet — benchmarks will populate once consumers start checking in.</p>
        </div>
      )}
    </div>
  )
}
