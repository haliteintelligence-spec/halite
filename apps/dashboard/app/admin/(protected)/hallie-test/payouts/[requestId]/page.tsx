'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

function adminHeaders(): Record<string, string> {
  const token = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAYOUT_METHOD_LABELS: Record<string, string> = {
  zelle: 'Zelle',
  paypal: 'PayPal',
  revolut: 'Revolut',
  naira: 'Naira account',
}

type PayoutRequestDetail = {
  id: string
  userId: string
  userName: string
  userEmail: string
  pointsRedeemed: number
  amountCents: number
  status: string
  payoutMethod: string
  createdAt: string
  payoutContact: string | null
  bankName: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide uppercase mb-1" style={{ color: 'var(--ink-3)' }}>{label}</p>
      <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{value}</p>
    </div>
  )
}

export default function PayoutRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const [payout, setPayout] = useState<PayoutRequestDetail | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setStatus('loading')
    fetch(`${API_URL}/admin/hallie-test/payouts/${requestId}`, { headers: adminHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Request failed (${r.status})`))))
      .then((data) => {
        setPayout(data.payoutRequest)
        setStatus('success')
      })
      .catch(() => setStatus('error'))
  }, [requestId])

  async function togglePaid() {
    if (!payout || updating) return
    const nextPaid = payout.status !== 'paid'
    setUpdating(true)
    try {
      const res = await fetch(`${API_URL}/admin/hallie-test/payouts/${requestId}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: nextPaid }),
      })
      if (!res.ok) throw new Error('Update failed')
      // The `status` column is the single source of truth this admin view
      // shares with hallie-web/iOS's own GET /v1/rewards — the same row,
      // read a different way, so there's nothing else to keep in sync.
      setPayout({ ...payout, status: nextPaid ? 'paid' : 'pending' })
    } catch {
      window.alert("Couldn't update paid status — try again.")
    } finally {
      setUpdating(false)
    }
  }

  if (status === 'error') {
    return (
      <div className="max-w-3xl">
        <Link href="/admin/hallie-test" className="inline-flex items-center gap-1.5 text-[13px] mb-4" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={13} /> All payout requests
        </Link>
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>This payout request couldn&apos;t be found.</p>
      </div>
    )
  }

  if (!payout) {
    return <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Loading…</p>
  }

  const isPaid = payout.status === 'paid'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/hallie-test" className="inline-flex items-center gap-1.5 text-[13px] mb-4" style={{ color: 'var(--ink-3)' }}>
          <ArrowLeft size={13} /> All payout requests
        </Link>
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>{payout.userName}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>{payout.userEmail}</p>
      </div>

      <Card>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Payout request</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
          <Row label="Amount requested" value={`$${(payout.amountCents / 100).toFixed(2)}`} />
          <Row label="Points redeemed" value={payout.pointsRedeemed.toLocaleString()} />
          <Row label="Requested" value={fmtDate(payout.createdAt)} />
          <Row label="Payout method" value={PAYOUT_METHOD_LABELS[payout.payoutMethod] ?? payout.payoutMethod} />

          {payout.payoutMethod === 'naira' ? (
            <>
              <Row label="Bank name" value={payout.bankName ?? '—'} />
              <Row label="Account name" value={payout.bankAccountName ?? '—'} />
              <Row label="Account number" value={payout.bankAccountNumber ?? '—'} />
            </>
          ) : (
            <Row label="Phone or email" value={payout.payoutContact ?? '—'} />
          )}
        </div>

        <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>Paid</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
              Toggle once you&apos;ve manually sent this payout — updates the user&apos;s own Rewards page immediately.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPaid}
            onClick={togglePaid}
            disabled={updating}
            className="relative inline-flex items-center h-7 w-12 rounded-full transition-colors flex-shrink-0"
            style={{ background: isPaid ? 'var(--clay)' : 'var(--sand-1)', border: '1px solid var(--border)', opacity: updating ? 0.6 : 1 }}
          >
            {updating ? (
              <Loader2 size={12} className="animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: isPaid ? '#fff' : 'var(--ink-3)' }} />
            ) : (
              <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isPaid ? 'translateX(22px)' : 'translateX(3px)' }}
              />
            )}
          </button>
        </div>
      </Card>
    </div>
  )
}
