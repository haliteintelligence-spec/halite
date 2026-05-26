'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { BrandDetailTabs } from '../_tabs'

interface Admin {
  id: string
  name: string
  email: string
  role: string
}

export default function BrandTeamPage() {
  const { brandId } = useParams<{ brandId: string }>()
  const [brandName, setBrandName] = useState('')
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', password: '', role: 'ADMIN' })
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [error, setError] = useState('')

  function token() {
    return document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  }

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}`, {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json() as { brand: { name: string; admins: Admin[] } }
      setBrandName(data.brand.name)
      setAdmins(data.brand.admins)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [brandId])

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAddingAdmin(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify(newAdmin),
      })
      if (!res.ok) throw new Error('Failed to add admin')
      setNewAdmin({ email: '', name: '', password: '', role: 'ADMIN' })
      setShowAddAdmin(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add admin')
    } finally {
      setAddingAdmin(false)
    }
  }

  async function handleResetPassword(adminId: string) {
    if (newPassword.length < 8) return
    setResettingPassword(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/admins/${adminId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) throw new Error('Failed to reset password')
      setResetPasswordFor(null)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setResettingPassword(false)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 p-8" style={{ color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Brands
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{brandName}</h1>
        <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--ink-3)' }}>{brandId}</p>
      </div>

      <BrandDetailTabs brandId={brandId} />

      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>Team Members</h2>
          <button
            onClick={() => setShowAddAdmin(!showAddAdmin)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
            style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            <UserPlus size={12} /> Add Member
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {admins.map(admin => (
            <div key={admin.id}>
              <div className="flex items-center justify-between py-2"
                style={{ borderBottom: resetPasswordFor === admin.id ? 'none' : '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{admin.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{admin.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                    {admin.role}
                  </span>
                  <button
                    onClick={() => { setResetPasswordFor(resetPasswordFor === admin.id ? null : admin.id); setNewPassword('') }}
                    className="text-[11px] px-2 py-0.5 rounded-lg hover:underline"
                    style={{ color: 'var(--clay)' }}
                  >
                    Reset pw
                  </button>
                </div>
              </div>
              {resetPasswordFor === admin.id && (
                <div className="flex gap-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    minLength={8}
                    onChange={e => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-mono outline-none"
                    style={{ background: 'var(--sand-1)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                  <button
                    onClick={() => handleResetPassword(admin.id)}
                    disabled={resettingPassword || newPassword.length < 8}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--clay)' }}
                  >
                    {resettingPassword ? '…' : 'Set'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-[12px] mb-3" style={{ color: '#e57373' }}>{error}</p>}

        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="border rounded-lg p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--sand-1)' }}>
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="Name" value={newAdmin.name}
                onChange={e => setNewAdmin(a => ({ ...a, name: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <input required type="email" placeholder="Email" value={newAdmin.email}
                onChange={e => setNewAdmin(a => ({ ...a, email: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="Password (min 8 chars)" value={newAdmin.password} minLength={8}
                onChange={e => setNewAdmin(a => ({ ...a, password: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }} />
              <select value={newAdmin.role} onChange={e => setNewAdmin(a => ({ ...a, role: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddAdmin(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                Cancel
              </button>
              <button type="submit" disabled={addingAdmin}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--clay)' }}>
                {addingAdmin ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
