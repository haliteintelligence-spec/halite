'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { InsightButton } from '@/components/ui/InsightButton'
import { ConsumerDetail, type BeautyProfile, type CheckInRow, type RoutineStepRow } from '@/components/consumers/ConsumerDetail'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function calcAge(birthday: string): number {
  const dob = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

interface ConsumerDetailResponse {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  createdAt: string
  birthday: string | null
  quizCompletedAt: string | null
  brandPresence: Array<{ name: string; slug: string; joinedAt: string }>
  beautyProfile: BeautyProfile | null
  checkIns: CheckInRow[]
  routines: Array<{ id: string; focusArea: string; steps: RoutineStepRow[] }>
  stats: { totalCheckIns: number; complianceRate: number | null; avgSkinRating: number | null }
}

function getTokenAndBrandId() {
  const token = document.cookie.match(/halite_token=([^;]+)/)?.[1] ?? null
  const brandId = token ? (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId : null
  return { token, brandId }
}

export default function ConsumerDetailPage() {
  const { slug, consumerId } = useParams<{ slug: string; consumerId: string }>()
  const [consumer, setConsumer] = useState<ConsumerDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [brandId, setBrandId] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { token: t, brandId: bid } = getTokenAndBrandId()
        if (!bid) { setLoading(false); return }
        setBrandId(bid)
        setToken(t ?? '')
        const res = await fetch(`${API_URL}/brands/${bid}/consumers/${consumerId}`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json() as { consumer: ConsumerDetailResponse }
          setConsumer(data.consumer)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [consumerId])

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!consumer) return (
    <div className="p-8">
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Consumer not found.</p>
    </div>
  )

  const name = [consumer.firstName, consumer.lastName].filter(Boolean).join(' ') || consumer.email || 'Anonymous'
  const activeRoutine = consumer.routines[0] ?? null

  const insightContext = {
    name,
    skinType: consumer.beautyProfile?.skinType,
    skinConcerns: consumer.beautyProfile?.skinConcerns,
    ageRange: consumer.birthday ? `${calcAge(consumer.birthday)} years old` : (consumer.beautyProfile?.ageRange ?? undefined),
    monkSkinTone: consumer.beautyProfile?.monkSkinTone,
    totalCheckIns: consumer.stats.totalCheckIns,
    complianceRate: consumer.stats.complianceRate,
    avgSkinRating: consumer.stats.avgSkinRating,
    recentCheckIns: consumer.checkIns.slice(0, 5).map(c => ({
      date: c.date, skinRating: c.skinRating, compliant: c.compliant, symptoms: c.symptoms,
    })),
    routineSteps: activeRoutine?.steps.map(s => ({ product: s.product.name, timeOfDay: s.timeOfDay })),
  }

  async function fetchCheckInResult(checkInId: string) {
    const res = await fetch(`${API_URL}/brands/${brandId}/consumers/${consumerId}/check-ins/${checkInId}/result`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to load AI result')
    return res.json() as Promise<{ aiResult: string; generatedAt: string }>
  }

  return (
    <ConsumerDetail
      backHref={`/${slug}/consumers/roster`}
      backLabel="Consumer Roster"
      name={name}
      email={consumer.email}
      createdAt={consumer.createdAt}
      birthday={consumer.birthday}
      quizCompletedAt={consumer.quizCompletedAt}
      brandPresence={consumer.brandPresence}
      beautyProfile={consumer.beautyProfile}
      activeRoutine={activeRoutine}
      stats={consumer.stats}
      checkInGroups={[{ brandId, brandName: '', checkIns: consumer.checkIns }]}
      onFetchCheckInResult={fetchCheckInResult}
      headerSlot={brandId ? <InsightButton brandId={brandId} viewName={`Consumer: ${name}`} dataContext={insightContext} /> : undefined}
    />
  )
}
