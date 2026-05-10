'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/halite-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Login failed'); return }

    document.cookie = `halite_admin_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: 'var(--text-3)' }}>
            Halite Intelligence
          </p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--text-1)' }}>Admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Internal platform access</p>
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text-1)', background: 'white' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text-1)', background: 'white' }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--text-1)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
