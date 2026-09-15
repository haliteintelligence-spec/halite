import { InsightCard } from '@/components/ui/InsightCard'
import { MetricTile } from '@/components/ui/MetricTile'
import { getConnectPermissions } from '@/lib/api'

export const metadata = { title: 'Permissions | Halite Intelligence' }

const ACTION_LABELS: Record<string, string> = {
  context: 'Read their context',
  recommendations: 'Ranked your catalog',
  refused: 'Read refused',
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

export default async function PermissionsPage() {
  const d = await getConnectPermissions()

  return (
    <div className="min-h-full">
      <div
        className="sticky top-0 z-10 px-4 py-3 md:px-7 md:py-4"
        style={{ background: 'var(--porcelain)', borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--ink-3)' }}>
          Halite Connect
        </p>
        <h1 className="font-display text-xl leading-tight mt-0.5" style={{ color: 'var(--ink)' }}>
          Permissions
        </h1>
      </div>

      <div className="px-4 py-5 md:px-7 md:py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricTile label="Active permissions" value={(d?.counts['active'] ?? 0).toLocaleString()} sub="Running until disconnected" />
          <MetricTile label="Disconnected" value={(d?.counts['revoked'] ?? 0).toLocaleString()} sub="Access cut the same second" />
          <MetricTile label="Expired" value={(d?.counts['expired'] ?? 0).toLocaleString()} sub="No timers set in this release" />
        </div>

        <div
          className="rounded-xl p-3.5 flex gap-3"
          style={{ background: 'var(--sand-1)', border: '1px solid var(--border)' }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            These rules are enforced on the token, not written in a policy. When someone disconnects,
            your API key stops returning their context on the very next call — there is nothing for you
            to remember to switch off. Products outside your own catalog are stripped of brand and
            product identity before they ever reach you.
          </p>
        </div>

        <InsightCard title="Permission ledger" subtitle="Every grant and revocation, most recent first">
          {!d || d.grants.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>No grants recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Consumer', 'Scope', 'Purpose', 'Granted', 'Status'].map(h => (
                      <th key={h} className="py-2 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--ink-3)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.grants.map(g => (
                    <tr key={g.consumerId + g.grantedAt} style={{ borderBottom: '1px solid var(--porcelain-2)' }}>
                      <td className="py-3 text-[12px] font-mono" style={{ color: 'var(--ink)' }}>{g.consumerId}</td>
                      <td className="py-3 text-[12px] capitalize" style={{ color: 'var(--ink-2)' }}>
                        {g.categories.join(', ').toLowerCase()}
                      </td>
                      <td className="py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                        {g.purpose.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 text-[12px]" style={{ color: 'var(--ink-2)' }}>{when(g.grantedAt)}</td>
                      <td className="py-3">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={g.status === 'active'
                            ? { background: 'var(--sage-light)', color: 'var(--sage)' }
                            : { background: 'var(--blush-light)', color: 'var(--blush)' }}
                        >
                          {g.status === 'revoked' ? `Disconnected ${g.revokedAt ? when(g.revokedAt) : ''}` : g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InsightCard>

        <InsightCard title="Access log" subtitle="Every read your key made against a Halite profile">
          {!d || d.accessLog.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>No reads recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {d.accessLog.map((l, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: l.action === 'refused' ? 'var(--blush)' : 'var(--sage)' }}
                  />
                  <div className="flex-1 flex justify-between gap-3">
                    <p className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                      {ACTION_LABELS[l.action] ?? l.action}
                      {l.scoped != null && (
                        <span className="ml-1.5 text-[11.5px]" style={{ color: 'var(--ink-3)' }}>
                          · scored {l.scoped} products
                        </span>
                      )}
                    </p>
                    <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{when(l.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InsightCard>
      </div>
    </div>
  )
}
