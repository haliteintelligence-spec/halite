'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/components/ui/PasswordInput'

interface Props {
  params: Promise<{ slug: string }>
}

export default function LoginPage({ params }: Props) {
  const { slug } = use(params)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/brand-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      return
    }

    if (data.brand.slug !== slug) {
      setError('Account does not belong to this brand')
      return
    }

    document.cookie = `halite_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    router.push(`/${slug}`)
  }

  const inputBase = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:ring-1'
  const inputStyle = {
    border: '1px solid var(--border)',
    color: 'var(--text-1)',
    background: 'var(--bg-surface)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--text-3)' }}>
            Halite Intelligence
          </p>
          <h1 className="font-display text-3xl" style={{ color: 'var(--text-1)' }}>Brand Dashboard</h1>
          <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-3)' }}>{slug}</p>
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
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputBase}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
                inputClassName={`${inputBase} pr-10`}
                inputStyle={inputStyle}
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#e57373' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--text-1)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-3)' }}>
            New to {slug}?{' '}
            <Link href={`/${slug}/register`} className="font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--text-1)' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
