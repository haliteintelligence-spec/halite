import Link from 'next/link'
import { getDemos } from '@/lib/admin-api'
import { Plus, Copy, ExternalLink, Clock } from 'lucide-react'

export default async function DemosPage() {
  const demos = await getDemos()

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            Demo Environments
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            {demos.length} demo{demos.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <Link
          href="/admin/demos/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--clay)' }}
        >
          <Plus size={14} />
          New Demo
        </Link>
      </div>

      {demos.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            No demos yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--sand-1)', borderBottom: '1px solid var(--border)' }}>
                {['Prospect', 'Status', 'Consumers', 'Products', 'Expires', 'Credentials', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold tracking-wide uppercase"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demos.map((demo, i) => (
                <tr
                  key={demo.id}
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < demos.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                      {demo.prospectName ?? '—'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{demo.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={demo.status} />
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                    {demo.consumerCount}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--ink)' }}>
                    {demo.productCount}
                  </td>
                  <td className="px-4 py-3">
                    {demo.demoLinkExpiresAt ? (
                      <ExpiryCell expiresAt={demo.demoLinkExpiresAt} />
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] space-y-0.5" style={{ color: 'var(--ink-3)' }}>
                      <CopyCell label={demo.email ?? ''} value={demo.email ?? ''} />
                      <CopyCell label={demo.password} value={demo.password} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/demos/${demo.id}`}
                      className="text-[12px] font-medium hover:underline"
                      style={{ color: 'var(--clay)' }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    generating:    { label: 'Generating', bg: '#fef3c7', color: '#92400e' },
    active:        { label: 'Active',     bg: '#d4f4dd', color: '#1a7a3c' },
    expiring_soon: { label: 'Expiring',   bg: '#ffe4cc', color: '#9a3800' },
    access_expired:{ label: 'Expired',    bg: '#f3f4f6', color: '#6b7280' },
  }
  const s = map[status] ?? map.access_expired
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function ExpiryCell({ expiresAt }: { expiresAt: string }) {
  const date = new Date(expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const expired = daysLeft <= 0
  return (
    <div className="flex items-center gap-1">
      <Clock size={11} style={{ color: expired ? '#e57373' : daysLeft <= 3 ? '#f97316' : 'var(--ink-3)' }} />
      <span
        className="text-[12px]"
        style={{ color: expired ? '#e57373' : daysLeft <= 3 ? '#f97316' : 'var(--ink)' }}
      >
        {expired ? 'Expired' : `${daysLeft}d`}
      </span>
    </div>
  )
}

function CopyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 group">
      <span className="font-mono">{label}</span>
    </div>
  )
}
