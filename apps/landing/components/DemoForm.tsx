'use client'

import { useState } from 'react'

const INTERESTS = [
  'Customer retention intelligence',
  'Ingredient-level outcome data',
  'Product-market fit optimization',
  'R&D & procurement strategy',
  'Consumer targeting & segmentation',
  'Personalized recommendation engine',
  'Other',
]

export function DemoForm() {
  const [state, setState] = useState({ name: '', brand: '', email: '', website: '', message: '' })
  const [interests, setInterests] = useState<string[]>([])
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  function toggleInterest(item: string) {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state, interests }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/30 placeholder:text-white/30'
  const fieldStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FAF6F0' }

  if (sent) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-4">✦</div>
        <p className="font-display text-xl mb-2" style={{ color: '#FAF6F0' }}>We'll be in touch.</p>
        <p className="text-sm" style={{ color: 'rgba(250,246,240,0.6)' }}>Expect a reply within one business day.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="Your name"
          value={state.name}
          onChange={e => setState(s => ({ ...s, name: e.target.value }))}
          className={field}
          style={fieldStyle}
        />
        <input
          required
          placeholder="Brand name"
          value={state.brand}
          onChange={e => setState(s => ({ ...s, brand: e.target.value }))}
          className={field}
          style={fieldStyle}
        />
      </div>
      <input
        required
        type="email"
        placeholder="Work email"
        value={state.email}
        onChange={e => setState(s => ({ ...s, email: e.target.value }))}
        className={field}
        style={fieldStyle}
      />
      <input
        type="url"
        placeholder="Website (optional)"
        value={state.website}
        onChange={e => setState(s => ({ ...s, website: e.target.value }))}
        className={field}
        style={fieldStyle}
      />

      {/* Interests */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2.5" style={{ color: 'rgba(250,246,240,0.45)' }}>
          I'm interested in
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTERESTS.map(item => {
            const checked = interests.includes(item)
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleInterest(item)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[12px] transition-all"
                style={{
                  background: checked ? 'rgba(250,246,240,0.14)' : 'rgba(255,255,255,0.05)',
                  border: checked ? '1px solid rgba(250,246,240,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  color: checked ? '#FAF6F0' : 'rgba(250,246,240,0.55)',
                }}
              >
                <span
                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[10px]"
                  style={{
                    background: checked ? '#FAF6F0' : 'transparent',
                    border: checked ? 'none' : '1px solid rgba(250,246,240,0.25)',
                    color: '#450F2A',
                  }}
                >
                  {checked ? '✓' : ''}
                </span>
                {item}
              </button>
            )
          })}
        </div>
      </div>

      <textarea
        rows={3}
        placeholder="Anything you'd like us to know (optional)"
        value={state.message}
        onChange={e => setState(s => ({ ...s, message: e.target.value }))}
        className={`${field} resize-none`}
        style={fieldStyle}
      />

      {error && (
        <p className="text-[12px]" style={{ color: 'rgba(250,246,240,0.6)' }}>
          Something went wrong — email us directly at haliteintelligence@gmail.com
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl py-3.5 text-[13px] font-semibold transition-all disabled:opacity-60"
        style={{ background: '#FAF6F0', color: '#450F2A' }}
      >
        {loading ? 'Sending…' : 'Request a demo →'}
      </button>
    </form>
  )
}
