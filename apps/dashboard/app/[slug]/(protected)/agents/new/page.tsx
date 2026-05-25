'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft } from 'lucide-react'

type Step = 1 | 2 | 3 | 4

const TRIGGERS = [
  { value: 'manual',           label: 'Manual',       desc: 'Run on demand' },
  { value: 'scheduled_weekly', label: 'Weekly',        desc: 'Choose day of week' },
  { value: 'scheduled_daily',  label: 'Daily',         desc: 'Choose time of day' },
  { value: 'on_new_consumer',  label: 'New Consumer',  desc: 'When a new consumer joins' },
  { value: 'on_checkin',       label: 'Check-in',      desc: 'After each routine check-in' },
]

const DAYS_OF_WEEK = [
  { value: 'monday',    label: 'Mon' },
  { value: 'tuesday',   label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday',  label: 'Thu' },
  { value: 'friday',    label: 'Fri' },
  { value: 'saturday',  label: 'Sat' },
  { value: 'sunday',    label: 'Sun' },
]

const HOURS_OF_DAY = [
  { value: '06:00', label: '6 AM' },
  { value: '08:00', label: '8 AM' },
  { value: '10:00', label: '10 AM' },
  { value: '12:00', label: '12 PM' },
  { value: '14:00', label: '2 PM' },
  { value: '16:00', label: '4 PM' },
  { value: '18:00', label: '6 PM' },
  { value: '20:00', label: '8 PM' },
]

const DATA_SOURCES = [
  { value: 'consumers', label: 'Consumer Profiles' },
  { value: 'products',  label: 'Product Catalog' },
  { value: 'checkIns',  label: 'Check-in Data' },
  { value: 'routines',  label: 'Routine History' },
]

const OUTPUT_FORMATS = [
  { value: 'insight_cards',           label: 'Insight Cards',          desc: 'Concise findings in card format' },
  { value: 'risk_alerts',             label: 'Risk Alerts',            desc: 'Flagged items requiring attention' },
  { value: 'product_recommendations', label: 'Product Recommendations', desc: 'Ranked product suggestions' },
  { value: 'executive_briefing',      label: 'Executive Briefing',     desc: 'C-level summary paragraph' },
  { value: 'narrative_report',        label: 'Narrative Report',       desc: 'Full narrative analysis' },
]

interface FormState {
  name: string
  description: string
  trigger: string
  triggerDay: string
  triggerHour: string
  dataSources: string[]
  objectivePrompt: string
  outputFormats: string[]
}

export default function NewAgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    trigger: 'manual',
    triggerDay: 'monday',
    triggerHour: '08:00',
    dataSources: ['consumers', 'products'],
    objectivePrompt: '',
    outputFormats: ['insight_cards'],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleSource(src: string) {
    setForm(f => ({
      ...f,
      dataSources: f.dataSources.includes(src)
        ? f.dataSources.filter(s => s !== src)
        : [...f.dataSources, src],
    }))
  }

  function toggleFormat(fmt: string) {
    setForm(f => ({
      ...f,
      outputFormats: f.outputFormats.includes(fmt)
        ? f.outputFormats.length > 1 ? f.outputFormats.filter(s => s !== fmt) : f.outputFormats
        : [...f.outputFormats, fmt],
    }))
  }

  async function handleCreate() {
    setSubmitting(true)
    setError('')
    try {
      const token = document.cookie.match(/halite_token=([^;]+)/)?.[1]
      const brandId = JSON.parse(atob(token!.split('.')[1])).brandId as string
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands/${brandId}/agents/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          trigger: form.trigger,
          triggerOptions: {
            day: form.trigger === 'scheduled_weekly' ? form.triggerDay : undefined,
            hour: form.trigger === 'scheduled_daily' ? form.triggerHour : undefined,
          },
          dataSources: form.dataSources,
          objectivePrompt: form.objectivePrompt,
          outputFormats: form.outputFormats,
        }),
      })
      const data = await res.json() as { workflow?: { id: string }; error?: string }
      if (!res.ok || !data.workflow) throw new Error(data.error ?? 'Failed to create agent')
      router.push(`/${slug}/agents/${data.workflow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const stepLabels = ['Name', 'Trigger', 'Objective', 'Output']

  const triggerDesc = form.trigger === 'scheduled_weekly'
    ? `Every ${form.triggerDay.charAt(0).toUpperCase() + form.triggerDay.slice(1)} at 8 AM`
    : form.trigger === 'scheduled_daily'
    ? `Every day at ${HOURS_OF_DAY.find(h => h.value === form.triggerHour)?.label ?? form.triggerHour}`
    : TRIGGERS.find(t => t.value === form.trigger)?.desc ?? ''

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
          New Agent Workflow
        </h1>
        <div className="flex items-center gap-2 mt-4">
          {([1, 2, 3, 4] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: step >= s ? 'var(--clay)' : 'var(--border)',
                  color: step >= s ? 'white' : 'var(--ink-3)',
                }}
              >
                {s}
              </div>
              <span className="text-[12px]" style={{ color: step === s ? 'var(--ink)' : 'var(--ink-3)' }}>
                {stepLabels[i]}
              </span>
              {i < 3 && <ChevronRight size={12} style={{ color: 'var(--border)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* ── Step 1: Name ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Agent Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Weekly Churn Risk Monitor"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Description (optional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this agent do?"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>
            <NavButtons onNext={() => setStep(2)} nextDisabled={!form.name.trim()} showBack={false} />
          </div>
        )}

        {/* ── Step 2: Trigger ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
                Trigger
              </label>
              <div className="space-y-2">
                {TRIGGERS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, trigger: t.value }))}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all"
                    style={{
                      background: form.trigger === t.value ? 'var(--clay)' : 'var(--sand-1)',
                      border: `1px solid ${form.trigger === t.value ? 'var(--clay)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: form.trigger === t.value ? 'white' : 'var(--ink)' }}>
                      {t.label}
                    </span>
                    <span className="text-[12px]" style={{ color: form.trigger === t.value ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)' }}>
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-options for weekly */}
            {form.trigger === 'scheduled_weekly' && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
              >
                <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Day of week
                </p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setForm(f => ({ ...f, triggerDay: d.value }))}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: form.triggerDay === d.value ? 'var(--clay)' : 'var(--surface)',
                        color: form.triggerDay === d.value ? 'white' : 'var(--ink)',
                        border: `1px solid ${form.triggerDay === d.value ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-options for daily */}
            {form.trigger === 'scheduled_daily' && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
              >
                <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Time of day
                </p>
                <div className="flex gap-2 flex-wrap">
                  {HOURS_OF_DAY.map(h => (
                    <button
                      key={h.value}
                      onClick={() => setForm(f => ({ ...f, triggerHour: h.value }))}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: form.triggerHour === h.value ? 'var(--clay)' : 'var(--surface)',
                        color: form.triggerHour === h.value ? 'white' : 'var(--ink)',
                        border: `1px solid ${form.triggerHour === h.value ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {triggerDesc && (
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                Schedule: <span style={{ color: 'var(--ink)' }}>{triggerDesc}</span>
              </p>
            )}

            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Data Sources
              </label>
              <div className="flex flex-wrap gap-2">
                {DATA_SOURCES.map(ds => {
                  const active = form.dataSources.includes(ds.value)
                  return (
                    <button
                      key={ds.value}
                      onClick={() => toggleSource(ds.value)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: active ? 'var(--clay)' : 'var(--sand-1)',
                        color: active ? 'white' : 'var(--ink)',
                        border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      {ds.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={form.dataSources.length === 0} />
          </div>
        )}

        {/* ── Step 3: Objective ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Agent Objective *
              </label>
              <p className="text-[12px] mb-3" style={{ color: 'var(--ink-3)' }}>
                Describe what you want this agent to analyze or surface. Be specific about the type of insight you need.
              </p>
              <textarea
                value={form.objectivePrompt}
                onChange={e => setForm(f => ({ ...f, objectivePrompt: e.target.value }))}
                rows={6}
                placeholder="e.g. Identify consumers who completed their routine fewer than 3 times in the last 4 weeks. For each, assess likely reasons for disengagement based on their check-in reactions and product usage patterns. Flag the top 10% most at-risk consumers and suggest a personalized re-engagement message."
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--ink-3)' }}>
                {form.objectivePrompt.length} / 4000 characters (min 20)
              </p>
            </div>
            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={form.objectivePrompt.trim().length < 20} />
          </div>
        )}

        {/* ── Step 4: Output ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-1" style={{ color: 'var(--ink-3)' }}>
                Output Format
              </label>
              <p className="text-[12px] mb-3" style={{ color: 'var(--ink-3)' }}>
                Select one or more — the agent will produce all selected formats.
              </p>
              <div className="space-y-2">
                {OUTPUT_FORMATS.map(f => {
                  const active = form.outputFormats.includes(f.value)
                  return (
                    <button
                      key={f.value}
                      onClick={() => toggleFormat(f.value)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all"
                      style={{
                        background: active ? 'var(--clay)' : 'var(--sand-1)',
                        border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            background: active ? 'white' : 'transparent',
                            border: `1.5px solid ${active ? 'white' : 'var(--border)'}`,
                          }}
                        >
                          {active && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="var(--clay)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: active ? 'white' : 'var(--ink)' }}>
                          {f.label}
                        </span>
                      </div>
                      <span className="text-[12px]" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)' }}>
                        {f.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-[12px]" style={{ color: '#e57373' }}>{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--clay)' }}
              >
                {submitting ? 'Creating…' : 'Create Agent →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled = false,
  showBack = true,
}: {
  onBack?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  showBack?: boolean
}) {
  return (
    <div className="flex gap-3">
      {showBack && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
        >
          <ChevronLeft size={14} /> Back
        </button>
      )}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--clay)' }}
        >
          Continue <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
