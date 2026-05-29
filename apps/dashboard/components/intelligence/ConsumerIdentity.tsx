'use client'

import { useState } from 'react'
import { InsightCard } from '@/components/ui/InsightCard'
import { AIBadge } from '@/components/ui/AIBadge'
import { InsightButton } from '@/components/ui/InsightButton'
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChevronDown, ChevronUp, Sparkles, FlaskConical } from 'lucide-react'
import type { IdentityData, IngredientSignalsData, IngredientSignal } from '@/lib/api'

type Props = { data: IdentityData; signals: IngredientSignalsData | null; brandId: string }

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

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function RatingBar({ positive, label }: { positive: number; label: string }) {
  const neutral = Math.max(0, Math.min(100 - positive, 40))
  const negative = Math.max(0, 100 - positive - neutral)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--ink-3)' }}>
        <span>{label}</span>
        <span className="font-semibold" style={{ color: positive >= 60 ? '#059669' : positive >= 40 ? '#b45309' : '#dc2626' }}>
          {positive}% positive
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        <div style={{ width: `${positive}%`, background: '#059669' }} />
        <div style={{ width: `${neutral}%`, background: '#d1d5db' }} />
        <div style={{ width: `${negative}%`, background: '#f87171' }} />
      </div>
    </div>
  )
}

function IngredientCard({ signal }: { signal: IngredientSignal }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-black/[0.015] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <FlaskConical size={13} style={{ color: 'var(--clay)', flexShrink: 0 }} />
            <span className="text-[15px] font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {signal.ingredient}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#eff6ff', color: '#2563eb' }}>
              {signal.partnerBrandCount} partner brand{signal.partnerBrandCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{signal.consumerCount}</span>
            {' '}cross-brand consumer{signal.consumerCount !== 1 ? 's' : ''} using this ingredient externally
            also use your products — and have logged{' '}
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{signal.outcomes.checkInCount}</span>
            {' '}check-ins at your brand.
          </p>
          {signal.outcomes.topSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {signal.outcomes.topSymptoms.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                  {fmt(s)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {signal.outcomes.avgRating !== null && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Avg Rating</p>
              <p className="text-lg font-semibold font-display" style={{ color: 'var(--clay)' }}>
                {signal.outcomes.avgRating}<span className="text-[11px] font-normal" style={{ color: 'var(--ink-3)' }}>/5</span>
              </p>
            </div>
          )}
          {expanded
            ? <ChevronUp size={14} style={{ color: 'var(--ink-3)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} />}
        </div>
      </button>

      {/* Collapsed summary bar */}
      {!expanded && signal.outcomes.checkInCount > 0 && (
        <div className="px-5 pb-4">
          <RatingBar positive={signal.outcomes.positiveRate} label="Check-in sentiment across these consumers" />
        </div>
      )}

      {/* Expanded detail: per-product breakdown */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--sand-1)' }}>
          <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
            Your Products Used by These Consumers
          </p>
          {signal.ourProducts.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>No active routines found for these consumers.</p>
          ) : (
            <div className="space-y-3">
              {signal.ourProducts.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        {fmt(p.category)} · {p.count} consumer{p.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {p.avgRating !== null && (
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--clay)' }}>
                        {p.avgRating}/5
                      </span>
                    )}
                  </div>
                  {p.positiveRate !== null && (
                    <RatingBar positive={p.positiveRate} label={`Check-in sentiment · ${signal.ingredient} pairing`} />
                  )}
                  {p.topSymptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="text-[10px]" style={{ color: 'var(--ink-3)' }}>Reported:</span>
                      {p.topSymptoms.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: '#ecfdf5', color: '#059669' }}>
                          {fmt(s)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-1">
            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
              These {signal.consumerCount} consumers use <strong>{signal.ingredient}</strong> in routines at other Halite brands.
              No private data from those brands is shared — only anonymised cross-brand signals.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConsumerIdentity({ data, signals, brandId }: Props) {
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
        actions={
          <InsightButton
            brandId={brandId}
            viewName="Consumer Identity — Identification Trend"
            dataContext={{
              total: data.total, identified: data.identified, anonymous: data.anonymous,
              identificationRate: data.identificationRate, crossBrand: data.crossBrand,
              crossBrandRate: data.crossBrandRate, retentionRate: data.retentionRate, trend: data.trend,
            }}
          />
        }
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
