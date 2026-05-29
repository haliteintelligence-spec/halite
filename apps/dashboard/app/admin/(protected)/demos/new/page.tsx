'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Upload, X, CheckCircle2, Loader2, Globe, Sparkles } from 'lucide-react'
import { CircularProgress } from '@/components/ui/CircularProgress'

const FOCUS_AREAS: { label: string; value: string }[] = [
  { label: 'Skincare',   value: 'SKINCARE' },
  { label: 'Haircare',   value: 'HAIR' },
  { label: 'Body',       value: 'BODY' },
  { label: 'Makeup',     value: 'MAKEUP' },
  { label: 'Wellness',   value: 'WELLNESS' },
]

type Step = 1 | 2 | 3

interface FormState {
  prospectName: string
  brandWebsiteUrl: string
  focusAreas: string[]
  consumerCount: number
  productCount: number
  historyMonths: number
  catalogFile: File | null
  purchaseFile: File | null
  customerProfileFile: File | null
  quizFile: File | null
}

export default function NewDemoPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    prospectName: '',
    brandWebsiteUrl: '',
    focusAreas: [],
    consumerCount: 200,
    productCount: 20,
    historyMonths: 12,
    catalogFile: null,
    purchaseFile: null,
    customerProfileFile: null,
    quizFile: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [demoId, setDemoId] = useState<string | null>(null)
  const catalogRef = useRef<HTMLInputElement>(null)
  const purchaseRef = useRef<HTMLInputElement>(null)
  const customerProfileRef = useRef<HTMLInputElement>(null)
  const quizRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!demoId || step !== 3) return
    const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
    const interval = setInterval(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/demos/${demoId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json() as { demo: { status: string } }
      if (data.demo.status !== 'generating') {
        clearInterval(interval)
        router.push(`/admin/demos/${demoId}`)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [demoId, step])

  function toggleArea(value: string) {
    setForm(f => ({
      ...f,
      focusAreas: f.focusAreas.includes(value)
        ? f.focusAreas.filter(a => a !== value)
        : [...f.focusAreas, value],
    }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('prospectName', form.prospectName)
      fd.append('consumerCount', String(form.consumerCount))
      fd.append('productCount', String(form.productCount))
      fd.append('historyMonths', String(form.historyMonths))
      fd.append('focusAreas', JSON.stringify(form.focusAreas))
      if (form.brandWebsiteUrl) fd.append('brandWebsiteUrl', form.brandWebsiteUrl)
      if (form.catalogFile) fd.append('catalogFile', form.catalogFile)
      if (form.purchaseFile) fd.append('purchaseFile', form.purchaseFile)
      if (form.customerProfileFile) fd.append('customerProfileFile', form.customerProfileFile)
      if (form.quizFile) fd.append('quizFile', form.quizFile)

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

  const anyFileUploaded = !!(form.catalogFile || form.purchaseFile || form.customerProfileFile || form.quizFile)

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
                {s === 1 ? 'Setup' : s === 2 ? 'Data (Optional)' : 'Generating'}
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
                Brand Website URL
              </label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
                <input
                  type="url"
                  value={form.brandWebsiteUrl}
                  onChange={e => setForm(f => ({ ...f, brandWebsiteUrl: e.target.value }))}
                  placeholder="https://prospect-website.com"
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm outline-none font-mono"
                  style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wide uppercase mb-2" style={{ color: 'var(--ink-3)' }}>
                Focus Areas (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map(({ label, value }) => {
                  const active = form.focusAreas.includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleArea(value)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: active ? 'var(--clay)' : 'var(--sand-1)',
                        color: active ? 'white' : 'var(--ink)',
                        border: `1px solid ${active ? 'var(--clay)' : 'var(--border)'}`,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AI Generation Settings */}
            <div className="rounded-lg p-4 space-y-5" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={13} style={{ color: 'var(--clay)' }} />
                <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                  AI Generation Settings
                </span>
              </div>
              <p className="text-[11px] -mt-2" style={{ color: 'var(--ink-3)' }}>
                Used when no file is uploaded for the corresponding data type.
              </p>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                    Customers
                  </label>
                  <span className="text-sm font-semibold" style={{ color: 'var(--clay)' }}>
                    {form.consumerCount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={form.consumerCount}
                  onChange={e => setForm(f => ({ ...f, consumerCount: Number(e.target.value) }))}
                  className="w-full accent-[var(--clay)]"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
                  <span>50</span><span>1,000</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                    Products in Catalog
                  </label>
                  <span className="text-sm font-semibold" style={{ color: 'var(--clay)' }}>
                    {form.productCount}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={form.productCount}
                  onChange={e => setForm(f => ({ ...f, productCount: Number(e.target.value) }))}
                  className="w-full accent-[var(--clay)]"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
                  <span>1</span><span>100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                    Purchase History
                  </label>
                  <span className="text-sm font-semibold" style={{ color: 'var(--clay)' }}>
                    {form.historyMonths === 0 ? 'None' : `${form.historyMonths} mo`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={form.historyMonths}
                  onChange={e => setForm(f => ({ ...f, historyMonths: Number(e.target.value) }))}
                  className="w-full accent-[var(--clay)]"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--ink-3)' }}>
                  <span>None</span><span>60 months</span>
                </div>
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
          <div className="space-y-5">
            <div className="rounded-lg px-4 py-3" style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}>
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                All files are optional — any missing data will be AI-generated using the settings from Step 1.
              </p>
            </div>

            <FileUploadField
              label="Product Catalog"
              hint="CSV, XLSX, or JSON — any column format accepted"
              file={form.catalogFile}
              inputRef={catalogRef}
              onChange={f => setForm(s => ({ ...s, catalogFile: f }))}
            />
            <FileUploadField
              label="Customer Profiles"
              hint="Customer ID, name, age, birthday, city, phone, email"
              file={form.customerProfileFile}
              inputRef={customerProfileRef}
              onChange={f => setForm(s => ({ ...s, customerProfileFile: f }))}
            />
            <FileUploadField
              label="Purchase History"
              hint="Standard CSV or Shopify order export"
              file={form.purchaseFile}
              inputRef={purchaseRef}
              onChange={f => setForm(s => ({ ...s, purchaseFile: f }))}
            />
            <FileUploadField
              label="Personalization Quiz Results"
              hint="Per-customer skin & hair quiz responses"
              file={form.quizFile}
              inputRef={quizRef}
              onChange={f => setForm(s => ({ ...s, quizFile: f }))}
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
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'var(--clay)' }}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Creating…' : anyFileUploaded ? 'Create Demo' : 'Generate Demo'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="flex justify-center mb-5">
              <CircularProgress size={140} showLabel />
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
          className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border-2 border-dashed transition-colors hover:border-[var(--clay)]"
          style={{ borderColor: 'var(--border)' }}
        >
          <Upload size={16} style={{ color: 'var(--ink-3)' }} />
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{hint}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
            AI-generated if skipped
          </span>
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
