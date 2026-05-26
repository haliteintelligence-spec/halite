'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PasswordStrength, isPasswordValid } from '@/components/ui/PasswordStrength'

interface Props {
  params: Promise<{ slug: string }>
}

export default function RegisterPage({ params }: Props) {
  const { slug } = use(params)
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordValid = isPasswordValid(password)
  const confirmMismatch = confirm.length > 0 && confirm !== password
  const canSubmit = name.trim().length > 0 && email.length > 0 && passwordValid && confirm === password

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/brand-admin/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, name: name.trim(), password }),
      })
      const data = await res.json() as { token?: string; error?: string; brand?: { slug: string } }

      if (!res.ok) {
        setError(data.error ?? 'Registration failed')
        return
      }

      document.cookie = `halite_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      router.push(`/${slug}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <h1 className="font-display text-3xl" style={{ color: 'var(--text-1)' }}>Create your account</h1>
          <p className="text-sm mt-1 capitalize" style={{ color: 'var(--text-3)' }}>{slug}</p>
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: 'var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Full name
              </label>
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputBase}
                style={inputStyle}
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                autoComplete="new-password"
                inputClassName={`${inputBase} pr-10`}
                inputStyle={inputStyle}
              />
              <PasswordStrength password={password} visible={password.length > 0} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: 'var(--text-2)' }}>
                Confirm password
              </label>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                required
                autoComplete="new-password"
                inputClassName={`${inputBase} pr-10`}
                inputStyle={{
                  ...inputStyle,
                  borderColor: confirmMismatch ? '#e57373' : inputStyle.border?.toString().replace('1px solid ', '') ?? 'var(--border)',
                }}
              />
              {confirmMismatch && (
                <p className="text-[11px] mt-1.5" style={{ color: '#e57373' }}>Passwords do not match</p>
              )}
            </div>

            {error && <p className="text-sm" style={{ color: '#e57373' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full rounded-xl py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              style={{ background: 'var(--text-1)' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-3)' }}>
            Already have an account?{' '}
            <Link href={`/${slug}/login`} className="font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--text-1)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
