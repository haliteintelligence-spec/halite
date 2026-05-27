'use client'

import { use, useState } from 'react'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PasswordStrength, isPasswordValid } from '@/components/ui/PasswordStrength'
import { CheckCircle } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export default function SecurityPage({ params }: Props) {
  const { slug } = use(params)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordValid = isPasswordValid(newPassword)
  const confirmMismatch = confirm.length > 0 && confirm !== newPassword
  const canSubmit = currentPassword.length > 0 && passwordValid && confirm === newPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const cookieToken = document.cookie
        .split('; ')
        .find(r => r.startsWith('halite_token='))
        ?.split('=')[1]

      const payload = cookieToken
        ? JSON.parse(atob(cookieToken.split('.')[1]))
        : null
      const brandId = payload?.brandId

      if (!brandId || !cookieToken) {
        setError('Session expired. Please sign in again.')
        return
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands/${brandId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cookieToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Failed to update password')
        return
      }

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors'
  const inputStyle = {
    border: '1px solid var(--border)',
    color: 'var(--ink)',
    background: 'var(--surface)',
  }

  return (
    <div className="px-4 py-5 md:px-7 md:py-6">
      <div className="max-w-md">
        <h2 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>Change Password</h2>
        <p className="text-[12px] mb-6" style={{ color: 'var(--ink-3)' }}>
          Choose a strong password with at least 10 characters, mixing uppercase, lowercase, numbers, and symbols.
        </p>

        {success && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'var(--sage-light)', border: '1px solid var(--sage)' }}>
            <CheckCircle size={15} style={{ color: 'var(--sage)', flexShrink: 0 }} />
            <p className="text-[12px] font-medium" style={{ color: 'var(--sage)' }}>Password updated successfully.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {/* Current password */}
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Current password
            </label>
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              autoComplete="current-password"
              inputClassName={`${inputBase} pr-10`}
              inputStyle={inputStyle}
              iconColor="var(--ink)"
            />
          </div>

          {/* New password */}
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              New password
            </label>
            <PasswordInput
              value={newPassword}
              onChange={setNewPassword}
              required
              autoComplete="new-password"
              inputClassName={`${inputBase} pr-10`}
              inputStyle={inputStyle}
              iconColor="var(--ink)"
            />
            <PasswordStrength password={newPassword} visible={newPassword.length > 0} />
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--ink-3)' }}>
              Confirm new password
            </label>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              required
              autoComplete="new-password"
              inputClassName={`${inputBase} pr-10`}
              inputStyle={{
                ...inputStyle,
                borderColor: confirmMismatch ? '#e57373' : 'var(--border)',
              }}
              iconColor="var(--ink)"
            />
            {confirmMismatch && (
              <p className="text-[11px] mt-1.5" style={{ color: '#e57373' }}>Passwords do not match</p>
            )}
          </div>

          {error && <p className="text-[12px]" style={{ color: '#e57373' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--clay)' }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
