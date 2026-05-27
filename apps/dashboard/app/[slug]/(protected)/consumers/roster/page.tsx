import { ConsumerRoster } from '@/components/intelligence/ConsumerRoster'
import { getTokenAndBrandId } from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ symptom?: string; concern?: string }>
}

export default async function ConsumerRosterPage({ params, searchParams }: Props) {
  const [{ slug }, rawSP, authInfo] = await Promise.all([
    params,
    searchParams,
    getTokenAndBrandId(),
  ])
  const brandId = authInfo?.brandId ?? ''

  return (
    <div className="px-7 py-6">
      <Link
        href={`/${slug}/consumers`}
        className="flex items-center gap-1 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--ink-3)' }}
      >
        <ArrowLeft size={12} /> Consumer Command Center
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Consumers
        </p>
        <h1 className="font-display text-2xl mt-0.5" style={{ color: 'var(--ink)' }}>Consumer Roster</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Search, filter, and deep-dive into individual consumer profiles
        </p>
      </div>

      <ConsumerRoster
        brandId={brandId}
        initialSymptom={rawSP.symptom}
        initialConcern={rawSP.concern}
      />
    </div>
  )
}
