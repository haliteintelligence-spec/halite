import { ConsumerPanel } from '@/components/intelligence/ConsumerPanel'

interface Props { params: Promise<{ slug: string }> }

export default async function ConsumersPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="px-7 py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Intelligence
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Consumer</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Deep consumer demographics, skin tone distribution & behaviour patterns
        </p>
      </div>
      <ConsumerPanel />
    </div>
  )
}
