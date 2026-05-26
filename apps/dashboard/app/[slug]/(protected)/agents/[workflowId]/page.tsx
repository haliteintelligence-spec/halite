'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown, ChevronUp, Mail, X as XIcon, Check } from 'lucide-react'
import type { AgentRun } from '@/lib/api'

interface WorkflowDetail {
  id: string
  name: string
  description: string | null
  type: string
  isPrebuilt: boolean
  isActive: boolean
  createdAt: string
  config?: Record<string, unknown>
  _count: { runs: number }
  runs: AgentRun[]
}

const TYPE_LABELS: Record<string, string> = {
  ROUTINE_OUTCOME:       'Routine Outcomes',
  CHURN_PREDICTION:      'Churn Prediction',
  PRODUCT_INTELLIGENCE:  'Product Intelligence',
  CONVERSION:            'Conversion',
  EXECUTIVE_INTELLIGENCE:'Executive Summary',
  CUSTOM:                'Custom',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getTokenAndBrandId() {
  const token = document.cookie.match(/halite_token=([^;]+)/)?.[1]
  const brandId = token ? (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId : null
  return { token: token ?? null, brandId }
}

export default function AgentDetailPage() {
  const { slug, workflowId } = useParams<{ slug: string; workflowId: string }>()
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  async function load() {
    const { token, brandId } = getTokenAndBrandId()
    if (!brandId) return
    const res = await fetch(`${API_URL}/brands/${brandId}/agents/workflows/${workflowId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { workflow: WorkflowDetail }
      setWorkflow(data.workflow)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [workflowId])

  useEffect(() => {
    if (!workflow) return
    const hasRunning = workflow.runs.some(r => r.status === 'RUNNING' || r.status === 'PENDING')
    if (!hasRunning) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [workflow?.runs])

  async function triggerRun() {
    setRunning(true)
    const { token, brandId } = getTokenAndBrandId()
    if (!brandId) return
    await fetch(`${API_URL}/brands/${brandId}/agents/workflows/${workflowId}/run`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    await load()
    setRunning(false)
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  )

  if (!workflow) return (
    <div className="p-8">
      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Agent not found.</p>
    </div>
  )

  const latestRun = workflow.runs[0]
  const isRunning = latestRun?.status === 'RUNNING' || latestRun?.status === 'PENDING'

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href={`/${slug}/agents`}
        className="flex items-center gap-1 text-[12px] mb-6 hover:underline"
        style={{ color: 'var(--ink-3)' }}
      >
        <ArrowLeft size={12} /> Agents
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {workflow.name}
            </h1>
            {workflow.isPrebuilt && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--clay)', color: 'white' }}
              >
                BUILT-IN
              </span>
            )}
          </div>
          {workflow.description && (
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{workflow.description}</p>
          )}
          <span
            className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}
          >
            {TYPE_LABELS[workflow.type] ?? workflow.type}
          </span>
          <EmailDeliveryEditor
            workflowId={workflowId}
            initialEmails={(workflow.config?.deliveryEmails as string[] | undefined) ?? []}
            onSaved={load}
          />
        </div>

        <button
          onClick={triggerRun}
          disabled={running || isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0 disabled:opacity-50 transition-opacity"
          style={{ background: 'var(--clay)' }}
        >
          {(running || isRunning) ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isRunning ? 'Running…' : 'Run Now'}
        </button>
      </div>

      {latestRun?.status === 'DONE' && latestRun.output && (
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
            Latest Output
          </p>
          <AgentOutput output={latestRun.output} />
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="px-4 py-3"
          style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
            Run History ({workflow._count.runs})
          </p>
        </div>
        {workflow.runs.length === 0 ? (
          <div className="px-4 py-8 text-center" style={{ background: 'var(--surface)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No runs yet. Click "Run Now" to generate an insight.</p>
          </div>
        ) : (
          workflow.runs.map((run, i) => (
            <div
              key={run.id}
              style={{
                background: 'var(--surface)',
                borderBottom: i < workflow.runs.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <RunStatusIcon status={run.status} />
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                      {run.status === 'DONE' ? 'Completed' : run.status === 'FAILED' ? 'Failed' : run.status === 'RUNNING' ? 'Running' : 'Pending'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      {new Date(run.createdAt).toLocaleString()}
                      {run.tokenCount && ` · ${run.tokenCount.toLocaleString()} tokens`}
                    </p>
                  </div>
                </div>
                {run.output && (
                  expandedRun === run.id ? <ChevronUp size={14} style={{ color: 'var(--ink-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-3)' }} />
                )}
              </button>
              {expandedRun === run.id && run.output && (
                <div className="px-4 pb-4">
                  <AgentOutput output={run.output} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EmailDeliveryEditor({
  workflowId,
  initialEmails,
  onSaved,
}: {
  workflowId: string
  initialEmails: string[]
  onSaved: () => void
}) {
  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  async function save(next: string[]) {
    setSaving(true)
    setSaved(false)
    const { token, brandId } = getTokenAndBrandId()
    if (!brandId) return
    await fetch(`${API_URL}/brands/${brandId}/agents/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ deliveryEmails: next }),
    })
    setSaving(false)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 2000)
  }

  function addEmail() {
    const email = input.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInputError('Invalid email'); return }
    if (emails.includes(email)) { setInputError('Already added'); return }
    if (emails.length >= 5) { setInputError('Maximum 5 emails'); return }
    const next = [...emails, email]
    setEmails(next)
    setInput('')
    setInputError('')
    save(next)
  }

  function removeEmail(email: string) {
    const next = emails.filter(e => e !== email)
    setEmails(next)
    save(next)
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
        style={{ color: 'var(--ink-3)' }}
      >
        <Mail size={11} />
        {emails.length > 0
          ? `${emails.length} delivery email${emails.length !== 1 ? 's' : ''}`
          : 'Add delivery emails'}
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl p-4 space-y-3"
          style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
        >
          <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            Outputs sent to these addresses when a run completes. Up to 5.
          </p>

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map(e => (
                <span
                  key={e}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                >
                  {e}
                  <button
                    onClick={() => removeEmail(e)}
                    className="hover:opacity-60 transition-opacity"
                    disabled={saving}
                  >
                    <XIcon size={10} style={{ color: 'var(--ink-3)' }} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {emails.length < 5 && (
            <div className="flex gap-2">
              <input
                type="email"
                value={input}
                onChange={e => { setInput(e.target.value); setInputError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
                placeholder="name@example.com"
                className="flex-1 px-3 py-1.5 rounded-lg text-[12px] outline-none"
                style={{ background: 'var(--surface)', border: `1px solid ${inputError ? '#e57373' : 'var(--border)'}`, color: 'var(--ink)' }}
              />
              <button
                onClick={addEmail}
                disabled={saving || !input.trim()}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium disabled:opacity-40 transition-opacity flex-shrink-0"
                style={{ background: 'var(--clay)', color: 'white' }}
              >
                Add
              </button>
            </div>
          )}

          {inputError && <p className="text-[11px]" style={{ color: '#e57373' }}>{inputError}</p>}

          {(saving || saved) && (
            <div className="flex items-center gap-1.5">
              {saving
                ? <Loader2 size={11} className="animate-spin" style={{ color: 'var(--clay)' }} />
                : <Check size={11} style={{ color: '#1a7a3c' }} />}
              <span className="text-[11px]" style={{ color: saving ? 'var(--clay)' : '#1a7a3c' }}>
                {saving ? 'Saving…' : 'Saved'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RunStatusIcon({ status }: { status: string }) {
  if (status === 'DONE') return <CheckCircle2 size={14} style={{ color: '#1a7a3c' }} />
  if (status === 'FAILED') return <AlertCircle size={14} style={{ color: '#e57373' }} />
  if (status === 'RUNNING') return <Loader2 size={14} className="animate-spin" style={{ color: 'var(--clay)' }} />
  return <Clock size={14} style={{ color: 'var(--ink-3)' }} />
}

function AgentOutput({ output }: { output: unknown }) {
  if (!output) return null

  const out = output as Record<string, unknown>

  if (typeof out.summary === 'string') {
    return (
      <div className="space-y-4">
        {out.summary && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink)' }}>
            {out.summary as string}
          </p>
        )}
        {Array.isArray(out.insights) && (out.insights as string[]).length > 0 && (
          <ul className="space-y-2">
            {(out.insights as string[]).map((insight, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--clay)', color: 'white' }}>
                  {i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        )}
        {Array.isArray(out.recommendations) && (out.recommendations as string[]).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--ink-3)' }}>Recommendations</p>
            <ul className="space-y-1">
              {(out.recommendations as string[]).map((r, i) => (
                <li key={i} className="text-sm" style={{ color: 'var(--ink)' }}>· {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap overflow-auto max-h-96 p-3 rounded-lg" style={{ background: 'var(--sand-1)', color: 'var(--ink)' }}>
      {JSON.stringify(output, null, 2)}
    </pre>
  )
}
