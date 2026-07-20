'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ConsumerDetail, type BeautyProfile, type CheckInGroup, type RoutineStepRow } from '@/components/consumers/ConsumerDetail'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken() {
  return typeof document !== 'undefined'
    ? document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    : undefined
}

interface AdminConsumerResponse {
  consumer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    createdAt: string
    birthday: string | null
    quizCompletedAt: string | null
    brandPresence: Array<{ brandId: string; name: string; slug: string; joinedAt: string; isDemo: boolean }>
    crossBrandCount: number
    beautyProfile: BeautyProfile | null
    routines: Array<{ id: string; focusArea: string; steps: RoutineStepRow[] }>
    stats: { totalCheckIns: number; complianceRate: number | null; avgSkinRating: number | null }
  }
  checkInGroups: CheckInGroup[]
}

interface Props {
  brandId: string
  userId: string
  backHref: string
}

export function AdminConsumerDetail({ brandId, userId, backHref }: Props) {
  const [data, setData] = useState<AdminConsumerResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    fetch(`${API_URL}/admin/brands/${brandId}/consumers/${userId}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: AdminConsumerResponse | null) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [brandId, userId])

  if (loading) return (
    <div className="flex items-center gap-2 py-12" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  )
  if (!data?.consumer) return (
    <div className="py-12"><p className="text-sm" style={{ color: 'var(--ink-3)' }}>Consumer not found.</p></div>
  )

  const c = data.consumer
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Anonymous'
  const activeRoutine = c.routines[0] ?? null
  const crossBrandCount = c.crossBrandCount

  async function fetchCheckInResult(checkInId: string) {
    const t = getToken()
    const res = await fetch(`${API_URL}/admin/consumers/${c.id}/check-ins/${checkInId}/result`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
    if (!res.ok) throw new Error('Failed to load AI result')
    return res.json() as Promise<{ aiResult: string; generatedAt: string }>
  }

  return (
    <ConsumerDetail
      backHref={backHref}
      backLabel="Back to Consumers"
      name={name}
      email={c.email}
      createdAt={c.createdAt}
      birthday={c.birthday}
      quizCompletedAt={c.quizCompletedAt}
      brandPresence={c.brandPresence}
      beautyProfile={c.beautyProfile}
      activeRoutine={activeRoutine}
      stats={c.stats}
      checkInGroups={data.checkInGroups.map(g => ({ ...g, brandId: g.brandId || brandId }))}
      onFetchCheckInResult={fetchCheckInResult}
      crossBrandBadge={
        <span
          className="text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: crossBrandCount > 1 ? '#eff6ff' : 'var(--sand-1)', color: crossBrandCount > 1 ? '#2563eb' : 'var(--ink-3)' }}
        >
          {crossBrandCount} {crossBrandCount === 1 ? 'brand' : 'brands'}
        </span>
      }
    />
  )
}
