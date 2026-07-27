'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PasswordInput } from '@/components/ui/PasswordInput'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/halite-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as { token?: string; error?: string }
      if (!res.ok || !data.token) throw new Error(data.error ?? 'Invalid credentials')
      document.cookie = `halite_admin_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax; secure`
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--sand-1)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--ink)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-[9px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--clay)' }}>
          Halite Intelligence
        </p>
        <h1 className="text-xl font-semibold font-display mb-6" style={{ color: 'var(--ink)' }}>
          Admin Access
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
              placeholder="admin@haliteintelligence.com"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
              inputClassName="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none"
              inputStyle={inputStyle}
              iconColor="var(--ink)"
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: '#e57373' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: 'var(--clay)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
