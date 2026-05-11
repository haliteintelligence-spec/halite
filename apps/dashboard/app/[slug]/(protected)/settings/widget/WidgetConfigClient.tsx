'use client'

import { useState } from 'react'
import type { WidgetConfig } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const FOCUS_AREAS = [
  { value: 'SKINCARE',  label: 'Skincare' },
  { value: 'BODY',      label: 'Body' },
  { value: 'HAIR',      label: 'Hair' },
  { value: 'MAKEUP',    label: 'Makeup' },
  { value: 'FRAGRANCE', label: 'Fragrance' },
  { value: 'NAILS',     label: 'Nails' },
  { value: 'WELLNESS',  label: 'Wellness' },
  { value: 'SUN_CARE',  label: 'Sun Care' },
  { value: 'LIP_CARE',  label: 'Lip Care' },
  { value: 'EYE_CARE',  label: 'Eye Care' },
]

const TRIGGERS = [
  { attr: 'data-halite-quiz',     label: 'Quiz + routine',      desc: 'Opens the skin quiz and generates a personalised routine.' },
  { attr: 'data-halite-checkin',  label: 'Weekly check-in',     desc: 'Lets consumers log skin ratings and product reactions.' },
  { attr: 'data-halite-progress', label: 'Progress view',       desc: 'Shows the AI-generated skin progress narrative.' },
  { attr: 'data-halite-reorder',  label: 'Reorder reminders',   desc: 'Displays smart reorder prompts based on routine cadence.' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
      style={{ background: copied ? 'var(--clay)' : 'var(--sand-2)', color: copied ? 'white' : 'var(--ink-3)' }}
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

export function WidgetConfigClient({
  config,
  brandId,
  token,
}: {
  config: WidgetConfig
  brandId: string
  token: string
}) {
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [enabledAreas, setEnabledAreas] = useState<string[]>(
    config.quizConfig?.enabledAreas ?? ['SKINCARE']
  )
  const [savingAreas, setSavingAreas] = useState(false)
  const [areasSaved, setAreasSaved] = useState(false)

  const accent = config.primaryColor ?? '#450F2A'

  const embedCode = `<script
  src="https://cdn.haliteintelligence.com/widget.js"
  data-api-key="${apiKey}"
  data-accent="${accent}"
></script>`

  async function rotateKey() {
    if (!confirm('Rotate API key? Your existing embed code will stop working immediately.')) return
    setRotating(true)
    const res = await fetch(`${API_URL}/brands/${brandId}/rotate-api-key`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const { apiKey: newKey } = await res.json()
      setApiKey(newKey)
      setShowKey(true)
    }
    setRotating(false)
  }

  function toggleArea(v: string) {
    setEnabledAreas(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v])
  }

  async function saveAreas() {
    setSavingAreas(true)
    setAreasSaved(false)
    const res = await fetch(`${API_URL}/brands/${brandId}/quiz-config`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabledAreas }),
    })
    if (res.ok) {
      setAreasSaved(true)
      setTimeout(() => setAreasSaved(false), 3000)
    }
    setSavingAreas(false)
  }

  const cardCls = 'rounded-2xl border border-sand-2 bg-white p-6'
  const labelCls = 'block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5'

  return (
    <div className="space-y-6">

      {/* API Key */}
      <div className={cardCls}>
        <h2 className="text-[13px] font-semibold text-ink mb-4">API key</h2>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex-1 px-3 py-2.5 rounded-lg border border-sand-2 font-mono text-[13px] text-ink bg-sand-1 truncate"
          >
            {showKey ? apiKey : '•'.repeat(36)}
          </div>
          <button
            onClick={() => setShowKey(v => !v)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ background: 'var(--sand-2)', color: 'var(--ink-3)' }}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
          <CopyButton text={apiKey} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={rotateKey}
            disabled={rotating}
            className="text-[12px] font-medium px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-60"
          >
            {rotating ? 'Rotating…' : 'Rotate key'}
          </button>
          <p className="text-[11px] text-ink-3">Rotating invalidates your current embed immediately.</p>
        </div>
      </div>

      {/* Embed code */}
      <div className={cardCls}>
        <h2 className="text-[13px] font-semibold text-ink mb-1">Embed code</h2>
        <p className="text-[12px] text-ink-3 mb-4">Paste this once in your storefront's <code className="bg-sand-1 px-1 rounded">&lt;head&gt;</code> or before <code className="bg-sand-1 px-1 rounded">&lt;/body&gt;</code>.</p>
        <div className="relative">
          <pre
            className="rounded-xl p-4 text-[12px] leading-relaxed overflow-x-auto"
            style={{ background: 'var(--ink)', color: '#FAF6F0' }}
          >
            {embedCode}
          </pre>
          <div className="absolute top-3 right-3">
            <CopyButton text={embedCode} />
          </div>
        </div>

        {/* Trigger buttons reference */}
        <div className="mt-5">
          <label className={labelCls}>Trigger attributes</label>
          <p className="text-[12px] text-ink-3 mb-3">Add these to any button or link to open a specific widget mode.</p>
          <div className="space-y-2">
            {TRIGGERS.map(t => (
              <div key={t.attr} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--sand-1)' }}>
                <code className="text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5" style={{ color: 'var(--clay)' }}>
                  {t.attr}
                </code>
                <div>
                  <p className="text-[12px] font-medium text-ink">{t.label}</p>
                  <p className="text-[11px] text-ink-3">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quiz areas */}
      <div className={cardCls}>
        <h2 className="text-[13px] font-semibold text-ink mb-1">Quiz areas</h2>
        <p className="text-[12px] text-ink-3 mb-4">Controls which beauty categories are available in the consumer quiz.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {FOCUS_AREAS.map(area => {
            const on = enabledAreas.includes(area.value)
            return (
              <button
                key={area.value}
                type="button"
                onClick={() => toggleArea(area.value)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all text-left"
                style={{
                  background: on ? 'var(--clay)' : 'var(--sand-1)',
                  borderColor: on ? 'var(--clay)' : 'var(--sand-2)',
                  color: on ? 'white' : 'var(--ink-3)',
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[9px] flex-shrink-0"
                  style={{
                    background: on ? 'rgba(255,255,255,0.25)' : 'transparent',
                    borderColor: on ? 'rgba(255,255,255,0.4)' : 'var(--sand-2)',
                    color: 'white',
                  }}
                >
                  {on ? '✓' : ''}
                </span>
                {area.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveAreas}
            disabled={savingAreas}
            className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'var(--clay)' }}
          >
            {savingAreas ? 'Saving…' : 'Save'}
          </button>
          {areasSaved && <p className="text-[12px] text-green-600 font-medium">Saved ✓</p>}
        </div>
      </div>
    </div>
  )
}
