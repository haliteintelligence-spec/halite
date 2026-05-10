import { MarketFeed } from '@/components/intelligence/MarketFeed'

interface Props { params: Promise<{ slug: string }> }

export default async function MarketPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Intelligence
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Market</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Trend signals, consumer sentiment shifts & emerging ingredient radar
        </p>
      </div>
      <MarketFeed />
    </div>
  )
}
