'use client'

import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { IdentityData } from '@/lib/api'

type Props = { data: IdentityData }

function KpiTile({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: accent ? 'var(--clay)' : 'var(--surface)',
        border: `1px solid ${accent ? 'transparent' : 'var(--border)'}`,
      }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: accent ? 'rgba(255,255,255,0.65)' : 'var(--ink-3)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-semibold font-display"
        style={{ color: accent ? '#fff' : 'var(--ink)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px]" style={{ color: accent ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

export function ConsumerIdentity({ data }: Props) {
  const chartData = data.trend.map((t, i) => ({
    label: i === 7 ? 'Now' : i === 6 ? '-1w' : i === 0 ? '-7w' : '',
    identified: t.identified,
    anonymous: t.total - t.identified,
    rate: t.rate,
  }))

  const aiInsight = data.total === 0
    ? 'No consumers yet. Embed the widget to start building your identified consumer base.'
    : [
        `${data.identificationRate}% of your consumers have a verified Halite identity — they get faster onboarding at every brand on the platform.`,
        data.crossBrand > 0
          ? `${data.crossBrand} consumer${data.crossBrand !== 1 ? 's' : ''} (${data.crossBrandRate}% of identified) are active across multiple brands on Halite, signalling high-intent beauty shoppers.`
          : 'No cross-brand consumers yet — as more brands onboard, cross-brand signals will appear here.',
        data.retentionRate > 0
          ? `${data.retentionRate}% of consumers have 3+ check-ins, showing strong routine adherence.`
          : '',
      ].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <AIBadge>{aiInsight}</AIBadge>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total Consumers"
          value={data.total.toLocaleString()}
          sub="all time"
        />
        <KpiTile
          label="Identified"
          value={`${data.identificationRate}%`}
          sub={`${data.identified} with verified identity`}
          accent
        />
        <KpiTile
          label="Cross-Brand"
          value={data.crossBrand.toLocaleString()}
          sub={`${data.crossBrandRate}% of identified`}
        />
        <KpiTile
          label="Retained (3+ check-ins)"
          value={`${data.retentionRate}%`}
          sub={`${data.retained} consumers`}
        />
      </div>

      <InsightCard
        title="Identification Trend"
        subtitle="Identified vs anonymous · 8 weeks"
        accent="clay"
      >
        {data.total === 0 ? (
          <p className="text-[12px] py-6 text-center" style={{ color: 'var(--ink-3)' }}>
            No data yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="gradIdentified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--clay)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--clay)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAnon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--border)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--border)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}
                formatter={(v: number, name: string) => [v, name === 'identified' ? 'Identified' : 'Anonymous']}
              />
              <Area type="monotone" dataKey="identified" stroke="var(--clay)" strokeWidth={2} fill="url(#gradIdentified)" />
              <Area type="monotone" dataKey="anonymous" stroke="var(--border)" strokeWidth={1.5} fill="url(#gradAnon)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </InsightCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* What "identified" means */}
        <InsightCard title="What is a Halite Identity?" subtitle="" accent="none">
          <div className="space-y-3 pt-1">
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              A <strong>Halite Identity</strong> links a consumer's email or phone number to a
              portable beauty profile stored on the Halite platform — not tied to any single brand.
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              When an identified consumer visits a new brand, their biological profile (skin type,
              concerns, hair type…) pre-fills the quiz — giving them a faster experience while
              your brand gets richer first-party data from day one.
            </p>
          </div>
        </InsightCard>

        {/* Cross-brand intelligence */}
        <InsightCard title="Cross-Brand Consumers" subtitle="" accent="none">
          <div className="space-y-3 pt-1 text-center">
            <p
              className="text-5xl font-semibold font-display"
              style={{ color: 'var(--clay)' }}
            >
              {data.crossBrand}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              consumers on your brand are also active on other brands in the Halite network —
              representing the platform's highest-intent beauty shoppers.
            </p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
              Raw data is never shared across brands — only anonymised aggregate signals.
            </p>
          </div>
        </InsightCard>

        {/* Anonymous consumers */}
        <InsightCard title="Anonymous Consumers" subtitle="" accent="none">
          <div className="space-y-3 pt-1 text-center">
            <p className="text-5xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {data.anonymous}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              consumers completed the quiz without providing an email or phone. Their data stays
              brand-scoped — they won't benefit from pre-fill if they return to another brand.
            </p>
            {data.anonymous > 0 && (
              <p className="text-[11px] font-medium" style={{ color: 'var(--clay)' }}>
                Consider prompting these users to identify in a follow-up email.
              </p>
            )}
          </div>
        </InsightCard>
      </div>
    </div>
  )
}
