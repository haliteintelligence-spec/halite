import { getAdminStats, getDemos } from '@/lib/admin-api'
import { Building2, Users, CheckSquare, Repeat2, Play } from 'lucide-react'

export default async function AdminOverviewPage() {
  const [stats, demos] = await Promise.all([getAdminStats(), getDemos()])

  const activedemos = demos.filter(d => d.status === 'active' || d.status === 'expiring_soon').length
  const generatingDemos = demos.filter(d => d.status === 'generating').length

  const tiles = [
    { label: 'Active Brands', value: stats?.brands ?? '—', icon: Building2 },
    { label: 'End Users', value: stats?.users ?? '—', icon: Users },
    { label: 'Check-ins', value: stats?.checkIns ?? '—', icon: CheckSquare },
    { label: 'Routines', value: stats?.routines ?? '—', icon: Repeat2 },
  ]

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
          Platform Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Halite Intelligence — internal admin
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
                {label}
              </p>
              <Icon size={14} style={{ color: 'var(--ink-3)' }} />
            </div>
            <p className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Play size={14} style={{ color: 'var(--clay)' }} />
            <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: 'var(--ink-3)' }}>
              Demo Environments
            </p>
          </div>
          <p className="text-2xl font-semibold font-display mb-1" style={{ color: 'var(--ink)' }}>
            {demos.length}
          </p>
          <div className="flex gap-3 mt-3">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#d4f4dd', color: '#1a7a3c' }}>
              {activedemos} active
            </span>
            {generatingDemos > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                {generatingDemos} generating
              </span>
            )}
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-medium tracking-wide uppercase mb-3" style={{ color: 'var(--ink-3)' }}>
            Recent Demos
          </p>
          {demos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>No demos yet</p>
          ) : (
            <ul className="space-y-2">
              {demos.slice(0, 4).map(d => (
                <li key={d.id} className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
                    {d.prospectName ?? d.slug}
                  </span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
