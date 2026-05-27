import { ConsumerPanel } from '@/components/intelligence/ConsumerPanel'
import { ConsumerTrends } from '@/components/intelligence/ConsumerTrends'
import { MetricTile } from '@/components/ui/MetricTile'
import { TimeframePicker } from '@/components/ui/TimeframePicker'
import { Users, Activity, Star, AlertCircle, BarChart2 } from 'lucide-react'
import { getAnalytics, getTokenAndBrandId, getTimeframe } from '@/lib/api'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ days?: string; from?: string; to?: string }>
}

export default async function ConsumersPage({ params, searchParams }: Props) {
  const [{ slug }, rawSP, authInfo] = await Promise.all([params, searchParams, getTokenAndBrandId()])
  const { days, from, to } = await getTimeframe(rawSP)
  const analytics = await getAnalytics(days, from, to)
  const brandId = authInfo?.brandId ?? ''
  const s = analytics?.summary
  const activeConcerns = analytics?.consumers.concerns.filter(c => c.pct > 10).length ?? 0

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
            Intelligence
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-display text-2xl" style={{ color: 'var(--ink)' }}>Consumer Command Center</h1>
            <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--sage)' }} title="Live data" />
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            Real-time consumer behaviour, skin profiles, compliance signals & trend intelligence
          </p>
        </div>
        <TimeframePicker />
      </div>

      {/* 5-KPI Command Center Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MetricTile
          label="Active Consumers"
          value={s ? s.totalConsumers.toLocaleString() : '—'}
          icon={<Users size={14} />}
          href={`/${slug}/consumers/roster`}
        />
        <MetricTile
          label="Routine Compliance"
          value={s?.complianceRate != null ? `${s.complianceRate}%` : '—'}
          icon={<Activity size={14} />}
          href={`/${slug}/outcomes`}
        />
        <MetricTile
          label="Avg Skin Score"
          value={s?.avgRating != null ? `${s.avgRating}/5` : '—'}
          icon={<Star size={14} />}
          href={`/${slug}/outcomes`}
        />
        <MetricTile
          label="Active Concerns"
          value={activeConcerns > 0 ? activeConcerns.toString() : '—'}
          sub="reported by >10%"
          icon={<AlertCircle size={14} />}
          href={`/${slug}/consumers/roster`}
        />
        <MetricTile
          label="Check-ins This Week"
          value={analytics ? analytics.checkIns.thisWeek.toLocaleString() : '—'}
          icon={<BarChart2 size={14} />}
          href={`/${slug}/outcomes`}
        />
      </div>

      {analytics ? (
        <>
          <ConsumerPanel
            consumers={analytics.consumers}
            checkIns={analytics.checkIns}
            totalConsumers={analytics.summary.totalConsumers}
            brandId={brandId}
          />
          <ConsumerTrends
            ratingTrend={analytics.checkIns.ratingTrend}
            complianceTrend={analytics.checkIns.complianceTrend}
            concerns={analytics.consumers.concerns}
            concernCoverage={analytics.products.concernCoverage}
            brandId={brandId}
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Could not load consumer data.</p>
      )}
    </div>
  )
}
