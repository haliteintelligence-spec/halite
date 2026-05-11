'use client'

import { useState } from 'react'

export function DemoForm() {
  const [state, setState] = useState({ name: '', brand: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  const field = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-white/30 placeholder:text-white/30'
  const fieldStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#FAF6F0' }

  if (sent) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-4">✦</div>
        <p className="font-display text-xl text-ivory mb-2" style={{ color: '#FAF6F0' }}>We'll be in touch.</p>
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
      <textarea
        rows={3}
        placeholder="Anything you'd like us to know (optional)"
        value={state.message}
        onChange={e => setState(s => ({ ...s, message: e.target.value }))}
        className={`${field} resize-none`}
        style={fieldStyle}
      />
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
