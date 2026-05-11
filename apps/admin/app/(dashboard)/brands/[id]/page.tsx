'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { API_URL, adminHeaders, adminFetch } from '@/lib/api'
import {
  ArrowLeft, ExternalLink, Loader2, X, ChevronDown,
  Send, Plus, Trash2, CheckCircle,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url, { headers: adminHeaders() }).then(r => r.json())

const PLANS = ['STARTER', 'GROWTH', 'ENTERPRISE'] as const
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE'] as const

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:   { bg: '#f5f0eb', color: '#9c8878' },
  SENT:    { bg: '#eff6ff', color: '#2563eb' },
  PAID:    { bg: '#ecfdf5', color: '#059669' },
  OVERDUE: { bg: '#fef2f2', color: '#dc2626' },
}

function fmt(s: string) { return s.charAt(0) + s.slice(1).toLowerCase() }

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
    </div>
  )
}

export default function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { data: summaryData, mutate: mutateSummary } = useSWR(`${API_URL}/admin/brands/${id}/summary`, fetcher)
  const { data: analyticsData } = useSWR(`${API_URL}/admin/brands/${id}/analytics`, fetcher)
  const { data: invoicesData, mutate: mutateInvoices } = useSWR(`${API_URL}/admin/brands/${id}/invoices`, fetcher)

  const [tab, setTab] = useState<'overview' | 'analytics' | 'billing' | 'notify'>('overview')

  // Plan/active editing
  const [editingPlan, setEditingPlan] = useState(false)
  const [newPlan, setNewPlan] = useState('')
  const [togglingActive, setTogglingActive] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)

  // Invoice form
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoice, setInvoice] = useState({ amount: '', currency: 'USD', period: '', dueDate: '', notes: '' })
  const [savingInvoice, setSavingInvoice] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null)

  // Notify form
  const [notify, setNotify] = useState({ subject: '', body: '' })
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifySent, setNotifySent] = useState(false)
  const [notifyError, setNotifyError] = useState('')

  const brand = summaryData?.brand
  const analytics = analyticsData
  const invoices: any[] = invoicesData?.invoices ?? []

  async function savePlan() {
    setSavingPlan(true)
    await adminFetch(`/brands/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: newPlan }),
    })
    await mutateSummary()
    setEditingPlan(false)
    setSavingPlan(false)
  }

  async function toggleActive() {
    if (!brand) return
    setTogglingActive(true)
    await adminFetch(`/brands/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !brand.active }),
    })
    await mutateSummary()
    setTogglingActive(false)
  }

  async function createInvoice() {
    setSavingInvoice(true)
    await adminFetch(`/admin/brands/${id}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(invoice.amount),
        currency: invoice.currency,
        period: invoice.period,
        dueDate: new Date(invoice.dueDate).toISOString(),
        notes: invoice.notes || undefined,
      }),
    })
    await mutateInvoices()
    setShowInvoiceForm(false)
    setInvoice({ amount: '', currency: 'USD', period: '', dueDate: '', notes: '' })
    setSavingInvoice(false)
  }

  async function updateInvoiceStatus(invoiceId: string, status: string) {
    await adminFetch(`/admin/brands/${id}/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await mutateInvoices()
  }

  async function deleteInvoice(invoiceId: string) {
    if (!confirm('Delete this invoice?')) return
    setDeletingInvoice(invoiceId)
    await adminFetch(`/admin/brands/${id}/invoices/${invoiceId}`, { method: 'DELETE' })
    await mutateInvoices()
    setDeletingInvoice(null)
  }

  async function sendNotification() {
    setSendingNotify(true); setNotifyError(''); setNotifySent(false)
    try {
      await adminFetch(`/admin/brands/${id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notify),
      })
      setNotifySent(true)
      setNotify({ subject: '', body: '' })
      setTimeout(() => setNotifySent(false), 5000)
    } catch (e: any) { setNotifyError(e.message) }
    setSendingNotify(false)
  }

  const cardCls = 'bg-white rounded-2xl border overflow-hidden'
  const cardStyle = { borderColor: 'var(--border)' }

  if (!brand) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-3)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <a href="/brands" className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-3)' }}>
          <ArrowLeft size={13} /> All brands
        </a>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>{brand.name}</h1>
            <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>{brand.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Plan badge / editor */}
            {editingPlan ? (
              <div className="flex items-center gap-2">
                <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-lg border outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }}>
                  {PLANS.map(p => <option key={p} value={p}>{fmt(p)}</option>)}
                </select>
                <button onClick={savePlan} disabled={savingPlan}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                  style={{ background: 'var(--text-1)' }}>
                  {savingPlan ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingPlan(false)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--text-3)' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button onClick={() => { setNewPlan(brand.plan); setEditingPlan(true) }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-[#f5f0eb] transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                {fmt(brand.plan)} plan ✎
              </button>
            )}
            {/* Active toggle */}
            <button onClick={toggleActive} disabled={togglingActive}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${brand.active ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}>
              {togglingActive ? <Loader2 size={12} className="animate-spin inline" /> : brand.active ? 'Active' : 'Inactive'}
            </button>
            {/* Dashboard link */}
            <a href={`http://localhost:3002/${brand.slug}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border hover:bg-[#f5f0eb] transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
              Dashboard <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Consumers" value={brand._count?.endUsers ?? 0} />
        <StatCard label="Products" value={brand._count?.products ?? 0} />
        <StatCard label="Check-ins (30d)" value={brand.checkIns30d ?? 0} />
        <StatCard label="Quiz sessions" value={brand._count?.quizSessions ?? 0} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['overview', 'analytics', 'billing', 'notify'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[13px] font-medium capitalize relative transition-colors"
            style={{ color: tab === t ? 'var(--text-1)' : 'var(--text-3)' }}>
            {t === 'notify' ? 'Notify' : t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--text-1)' }} />}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Admins table */}
          <div className={cardCls} style={cardStyle}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Team admins</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                  {['Name', 'Email', 'Role', 'Joined'].map(h => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brand.admins?.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>{a.name}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-2)' }}>{a.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: a.role === 'OWNER' ? '#1c141018' : 'var(--bg-muted)', color: a.role === 'OWNER' ? 'var(--text-1)' : 'var(--text-3)' }}>
                        {a.role === 'OWNER' ? 'Owner' : 'Member'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-3)' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Integration status */}
          <div className={cardCls} style={cardStyle}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Integrations</h2>
            </div>
            <div className="px-6 py-4 flex items-center gap-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Shopify</p>
              {brand.shopifyShop ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {brand.shopifyShop}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                  Not connected
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics tab ── */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Skin types */}
            <div className={cardCls} style={cardStyle}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Skin types</h2>
              </div>
              <div className="p-6 space-y-3">
                {!analytics?.skinTypes?.length ? (
                  <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No data yet.</p>
                ) : analytics.skinTypes.map((s: any) => (
                  <div key={s.skinType} className="flex items-center gap-3">
                    <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--text-2)' }}>
                      {s.skinType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full" style={{ background: 'var(--text-1)', width: `${Math.min(100, s._count.skinType * 10)}%` }} />
                    </div>
                    <span className="text-sm w-8 text-right" style={{ color: 'var(--text-3)' }}>{s._count.skinType}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className={cardCls} style={cardStyle}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-sub)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Top products</h2>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-sub)' }}>
                {!analytics?.topProducts?.length ? (
                  <p className="px-6 py-4 text-sm italic" style={{ color: 'var(--text-3)' }}>No products yet.</p>
                ) : analytics.topProducts.map((p: any) => (
                  <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{p.category.replace(/_/g, ' ')}</p>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                      ${p.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={cardCls} style={cardStyle}>
            <div className="px-6 py-4 flex items-center gap-3">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Total check-ins</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                {analytics?.totalCheckIns ?? '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setShowInvoiceForm(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: 'var(--text-1)' }}>
              <Plus size={13} /> New invoice
            </button>
          </div>

          {showInvoiceForm && (
            <div className={`${cardCls} p-6 space-y-4`} style={cardStyle}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>New invoice</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Amount</label>
                  <input type="number" min="0" step="0.01" value={invoice.amount}
                    onChange={e => setInvoice(v => ({ ...v, amount: e.target.value }))}
                    placeholder="0.00" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Currency</label>
                  <input type="text" maxLength={3} value={invoice.currency}
                    onChange={e => setInvoice(v => ({ ...v, currency: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Billing period</label>
                  <input type="text" value={invoice.period}
                    onChange={e => setInvoice(v => ({ ...v, period: e.target.value }))}
                    placeholder="May 2026" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Due date</label>
                  <input type="date" value={invoice.dueDate}
                    onChange={e => setInvoice(v => ({ ...v, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Notes (optional)</label>
                <textarea value={invoice.notes} onChange={e => setInvoice(v => ({ ...v, notes: e.target.value }))}
                  rows={2} placeholder="Growth plan monthly subscription…"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
              </div>
              <div className="flex gap-3">
                <button onClick={createInvoice} disabled={savingInvoice || !invoice.amount || !invoice.period || !invoice.dueDate}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--text-1)' }}>
                  {savingInvoice ? 'Creating…' : 'Create invoice'}
                </button>
                <button onClick={() => setShowInvoiceForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 && !showInvoiceForm ? (
            <div className={`${cardCls} p-8 text-center`} style={cardStyle}>
              <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No invoices yet.</p>
            </div>
          ) : (
            <div className={cardCls} style={cardStyle}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-sub)' }}>
                    {['Period', 'Amount', 'Due', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => {
                    const s = STATUS_STYLE[inv.status] ?? STATUS_STYLE.DRAFT
                    return (
                      <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-sub)' }}>
                        <td className="px-5 py-3 font-medium" style={{ color: 'var(--text-1)' }}>
                          {inv.period}
                          {inv.notes && <p className="text-xs mt-0.5 font-normal" style={{ color: 'var(--text-3)' }}>{inv.notes}</p>}
                        </td>
                        <td className="px-5 py-3" style={{ color: 'var(--text-1)' }}>
                          {inv.currency} {Number(inv.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-3)' }}>
                          {new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <select value={inv.status}
                            onChange={e => updateInvoiceStatus(inv.id, e.target.value)}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer"
                            style={{ background: s.bg, color: s.color }}>
                            {INVOICE_STATUSES.map(st => (
                              <option key={st} value={st}>{fmt(st)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => deleteInvoice(inv.id)} disabled={deletingInvoice === inv.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                            style={{ color: '#dc2626' }}>
                            {deletingInvoice === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Notify tab ── */}
      {tab === 'notify' && (
        <div className="space-y-4">
          <div className={`${cardCls} p-6 space-y-4`} style={cardStyle}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Send message to {brand.name}</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                Sent via email to {brand.admins?.filter((a: any) => a.role === 'OWNER').length ?? 0} owner(s).
              </p>
            </div>

            {notifySent && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-emerald-800 bg-emerald-50 border border-emerald-100">
                <CheckCircle size={14} className="text-emerald-600" /> Message sent successfully.
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Subject</label>
              <input type="text" value={notify.subject} onChange={e => setNotify(v => ({ ...v, subject: e.target.value }))}
                placeholder="Important update from Halite"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Message</label>
              <textarea rows={6} value={notify.body} onChange={e => setNotify(v => ({ ...v, body: e.target.value }))}
                placeholder="Write your message here…"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                style={{ borderColor: 'var(--border)', color: 'var(--text-1)' }} />
            </div>

            {/* Quick templates */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Quick templates</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Plan upgrade', subject: `Your plan has been upgraded to ${brand.plan}`, body: `Hi team,\n\nWe've upgraded your Halite Intelligence account to the ${brand.plan} plan.\n\nYou now have access to all features included in your new plan. Log in to your dashboard to explore.\n\nBest,\nHalite Intelligence` },
                  { label: 'Payment reminder', subject: 'Action required: invoice due soon', body: `Hi team,\n\nThis is a reminder that you have an outstanding invoice due soon.\n\nPlease ensure payment is made to avoid service interruption.\n\nBest,\nHalite Intelligence` },
                  { label: 'New feature', subject: 'New features available in your dashboard', body: `Hi team,\n\nWe've released new features to your Halite Intelligence dashboard. Log in to explore what's new.\n\nBest,\nHalite Intelligence` },
                ].map(t => (
                  <button key={t.label} type="button"
                    onClick={() => setNotify({ subject: t.subject, body: t.body })}
                    className="text-xs px-3 py-1.5 rounded-lg border hover:bg-[#f5f0eb] transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {notifyError && <p className="text-sm text-red-600">{notifyError}</p>}

            <button onClick={sendNotification}
              disabled={sendingNotify || !notify.subject.trim() || !notify.body.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--text-1)' }}>
              {sendingNotify ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sendingNotify ? 'Sending…' : 'Send email'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
