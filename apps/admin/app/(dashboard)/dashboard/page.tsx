export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Platform Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>All brands · Halite Intelligence</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Brands', value: '—' },
          { label: 'Active Users', value: '—' },
          { label: 'Check-ins (30d)', value: '—' },
          { label: 'Routines Generated', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-3)' }}>
              {label}
            </p>
            <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-1)' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Brands</h2>
        <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>
          Brand list will populate once brands are onboarded.
        </p>
      </div>
    </div>
  )
}
