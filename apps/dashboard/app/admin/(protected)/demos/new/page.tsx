'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Upload, X, CheckCircle2, Loader2 } from 'lucide-react'

const FOCUS_AREAS = [
  'Routine Outcomes',
  'Churn Prediction',
  'Product Intelligence',
  'Conversion Lift',
  'Executive Summary',
]

type Step = 1 | 2 | 3

interface FormState {
  prospectName: string
  focusAreas: string[]
  consumerCount: number
  catalogFile: File | null
  purchaseFile: File | null
}

export default function NewDemoPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    prospectName: '',
    focusAreas: [],
    consumerCount: 100,
    catalogFile: null,
    purchaseFile: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [demoId, setDemoId] = useState<string | null>(null)
  const catalogRef = useRef<HTMLInputElement>(null)
  const purchaseRef = useRef<HTMLInputElement>(null)

  function toggleArea(area: string) {
    setForm(f => ({
      ...f,
      focusAreas: f.focusAreas.includes(area)
        ? f.focusAreas.filter(a => a !== area)
        : [...f.focusAreas, area],
    }))
  }

  async function handleSubmit() {
    if (!form.catalogFile) { setError('A product catalog file is required.'); return }
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('prospectName', form.prospectName)
      fd.append('consumerCount', String(form.consumerCount))
      fd.append('focusAreas', JSON.stringify(form.focusAreas))
      fd.append('catalog', form.catalogFile)
      if (form.purchaseFile) fd.append('purchaseHistory', form.purchaseFile)

      const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const data = await res.json() as { demoId?: string; error?: string }
      if (!res.ok || !data.demoId) throw new Error(data.error ?? 'Failed to create demo')
      setDemoId(data.demoId)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
          Create Demo Environment
        </h1>
        <div className="flex items-center gap-2 mt-4">
          {([1, 2, 3] as Step[]).map((s, i) => (
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
                {s === 1 ? 'Setup' : s === 2 ? 'Upload Data' : 'Generating'}
              </span>
              {i < 2 && <ChevronRight size={12} style={{ color: 'var(--border)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Prospect / Brand Name
              </label>
              <input
                type="text"
                value={form.prospectName}
                onChange={e => setForm(f => ({ ...f, prospectName: e.target.value }))}
                placeholder="e.g. Glowlab"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Focus Areas (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map(area => {
                  const active = form.focusAreas.includes(area)
                  return (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: active ? 'var(--clay)' : 'var(--sand-1)',
                        color: active ? 'white' : 'var(--ink)',
                        border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  Synthetic Consumers
                </label>
                <span className="text-sm font-semibold" style={{ color: 'var(--clay)' }}>
                  {form.consumerCount}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={10}
                value={form.consumerCount}
                onChange={e => setForm(f => ({ ...f, consumerCount: Number(e.target.value) }))}
                className="w-full accent-[var(--clay)]"
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
                <span>50</span><span>200</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.prospectName.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--clay)' }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <FileUploadField
              label="Product Catalog *"
              hint="CSV, XLSX, or JSON — any column format accepted"
              file={form.catalogFile}
              inputRef={catalogRef}
              onChange={f => setForm(s => ({ ...s, catalogFile: f }))}
            />
            <FileUploadField
              label="Purchase History (optional)"
              hint="Standard CSV or Shopify order export"
              file={form.purchaseFile}
              inputRef={purchaseRef}
              onChange={f => setForm(s => ({ ...s, purchaseFile: f }))}
            />

            {error && (
              <p className="text-[12px]" style={{ color: '#e57373' }}>{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.catalogFile}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'var(--clay)' }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Creating…' : 'Create Demo'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--clay)' }} />
            </div>
            <h2 className="text-lg font-semibold font-display mb-2" style={{ color: 'var(--ink)' }}>
              Generating Demo Environment
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
              Building synthetic consumers, routines, and check-in data for {form.prospectName || 'this prospect'}. This takes 2–3 minutes.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/admin/demos')}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--clay)' }}
              >
                View All Demos
              </button>
              {demoId && (
                <button
                  onClick={() => router.push(`/admin/demos/${demoId}`)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                >
                  Track Progress →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FileUploadField({
  label, hint, file, inputRef, onChange,
}: {
  label: string
  hint: string
  file: File | null
  inputRef: React.RefObject<HTMLInputElement>
  onChange: (f: File | null) => void
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
        {label}
      </label>
      {file ? (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{ background: '#d4f4dd', border: '1px solid #86efac' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} style={{ color: '#1a7a3c' }} />
            <span className="text-[13px] font-medium" style={{ color: '#1a7a3c' }}>{file.name}</span>
          </div>
          <button onClick={() => onChange(null)}>
            <X size={14} style={{ color: '#1a7a3c' }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed transition-colors hover:border-[var(--clay)]"
          style={{ borderColor: 'var(--border)' }}
        >
          <Upload size={18} style={{ color: 'var(--ink-3)' }} />
          <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>{hint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
