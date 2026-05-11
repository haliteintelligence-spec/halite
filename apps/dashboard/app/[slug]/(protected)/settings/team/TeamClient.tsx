'use client'

import { useState } from 'react'
import type { TeamMember } from '@/lib/api'
import { UserPlus, Trash2, ChevronDown, X, Eye, EyeOff, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const text = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
      style={{ background: 'var(--clay)' }}
    >
      {text}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'OWNER'
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: isOwner ? 'var(--clay)' : 'var(--sand-2)',
        color: isOwner ? 'white' : 'var(--ink-3)',
      }}
    >
      {isOwner ? 'Owner' : 'Member'}
    </span>
  )
}

interface InviteForm {
  name: string
  email: string
  password: string
  role: 'OWNER' | 'MEMBER'
}

export function TeamClient({
  brandId,
  token,
  currentAdminId,
  initialMembers,
}: {
  brandId: string
  token: string
  currentAdminId: string
  initialMembers: TeamMember[]
}) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [showModal, setShowModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [invited, setInvited] = useState<{ name: string; email: string; password: string } | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<InviteForm>({ name: '', email: '', password: '', role: 'MEMBER' })

  const authHeaders = { Authorization: `Bearer ${token}` }
  const currentMember = members.find(m => m.id === currentAdminId)
  const isOwner = currentMember?.role === 'OWNER'
  const ownerCount = members.filter(m => m.role === 'OWNER').length

  function openModal() {
    setForm({ name: '', email: '', password: '', role: 'MEMBER' })
    setError(null)
    setShowPassword(false)
    setInvited(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setInvited(null)
  }

  async function invite() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) return
    setSaving(true)
    setError(null)
    const res = await fetch(`${API_URL}/brands/${brandId}/team/invite`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { admin } = await res.json()
      setMembers(prev => [...prev, admin])
      setInvited({ name: form.name, email: form.email, password: form.password })
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.message ?? 'Failed to invite member.')
    }
    setSaving(false)
  }

  async function changeRole(adminId: string, newRole: 'OWNER' | 'MEMBER') {
    setChangingRoleId(adminId)
    const res = await fetch(`${API_URL}/brands/${brandId}/team/${adminId}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      const { admin } = await res.json()
      setMembers(prev => prev.map(m => m.id === adminId ? admin : m))
    }
    setChangingRoleId(null)
  }

  async function remove(adminId: string) {
    if (!confirm('Remove this member? They will lose access immediately.')) return
    setRemovingId(adminId)
    const res = await fetch(`${API_URL}/brands/${brandId}/team/${adminId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (res.ok || res.status === 204) {
      setMembers(prev => prev.filter(m => m.id !== adminId))
    }
    setRemovingId(null)
  }

  const cardCls = 'rounded-2xl border border-sand-2 bg-white'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Team members</h2>
          <p className="text-[12px] text-ink-3 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {isOwner && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all"
            style={{ background: 'var(--clay)' }}
          >
            <UserPlus size={14} />
            Invite member
          </button>
        )}
      </div>

      {/* Member list */}
      <div className={cardCls}>
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-ink-3">No team members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-sand-1">
            {members.map(m => {
              const isSelf = m.id === currentAdminId
              const isLastOwner = m.role === 'OWNER' && ownerCount === 1
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <Initials name={m.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-ink truncate">{m.name}</p>
                      {isSelf && (
                        <span className="text-[10px] text-ink-3">(you)</span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-3 truncate">{m.email}</p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <RoleBadge role={m.role} />

                    {/* Role toggle — OWNER only, not self */}
                    {isOwner && !isSelf && (
                      <button
                        onClick={() => changeRole(m.id, m.role === 'OWNER' ? 'MEMBER' : 'OWNER')}
                        disabled={changingRoleId === m.id || (m.role === 'OWNER' && isLastOwner)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-sand-2 text-ink-3 hover:bg-sand-1 disabled:opacity-40 transition-colors"
                        title={m.role === 'OWNER' && isLastOwner ? 'Cannot demote the last owner' : undefined}
                      >
                        {changingRoleId === m.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : m.role === 'OWNER' ? (
                          'Make member'
                        ) : (
                          'Make owner'
                        )}
                      </button>
                    )}

                    {/* Remove — OWNER only, not self, not last owner */}
                    {isOwner && !isSelf && (
                      <button
                        onClick={() => remove(m.id)}
                        disabled={removingId === m.id || isLastOwner}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        style={{ color: '#dc2626' }}
                        title={isLastOwner ? 'Cannot remove the last owner' : 'Remove member'}
                      >
                        {removingId === m.id ? (
                          <Loader2 size={13} className="animate-spin text-ink-3" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-2">
                <h3 className="text-[15px] font-semibold text-ink">
                  {invited ? 'Member added' : 'Invite team member'}
                </h3>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-sand-1 transition-colors">
                  <X size={16} className="text-ink-3" />
                </button>
              </div>

              {invited ? (
                /* Success state */
                <div className="px-6 py-5 space-y-4">
                  <p className="text-[13px] text-ink-3">
                    <strong className="text-ink">{invited.name}</strong> has been added. Share these credentials with them:
                  </p>
                  <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--sand-1)' }}>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide uppercase text-ink-3 mb-0.5">Email</p>
                      <p className="text-[13px] font-mono text-ink">{invited.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide uppercase text-ink-3 mb-0.5">Password</p>
                      <p className="text-[13px] font-mono text-ink">{invited.password}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-ink-3">
                    They can change their password after logging in. Store this securely — it won't be shown again.
                  </p>
                  <button
                    onClick={closeModal}
                    className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white"
                    style={{ background: 'var(--clay)' }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Invite form */
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@brand.com"
                      className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                      Temporary password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min. 8 characters"
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-1">Share this with the member — they can update it after logging in.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-2">
                      Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['MEMBER', 'OWNER'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, role: r }))}
                          className="px-3 py-2.5 rounded-lg text-[12px] font-medium border text-left transition-all"
                          style={{
                            background: form.role === r ? 'var(--clay)' : 'var(--sand-1)',
                            borderColor: form.role === r ? 'var(--clay)' : 'var(--sand-2)',
                            color: form.role === r ? 'white' : 'var(--ink-3)',
                          }}
                        >
                          <p className="font-semibold">{r === 'OWNER' ? 'Owner' : 'Member'}</p>
                          <p className="text-[10px] mt-0.5 opacity-80">
                            {r === 'OWNER' ? 'Full access + can manage team' : 'Dashboard access, no team management'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-[12px] text-red-500 font-medium">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={invite}
                      disabled={saving || !form.name.trim() || !form.email.trim() || form.password.length < 8}
                      className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                      style={{ background: 'var(--clay)' }}
                    >
                      {saving ? 'Adding…' : 'Add member'}
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2.5 rounded-lg text-[13px] font-medium border border-sand-2 text-ink-3 hover:bg-sand-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
