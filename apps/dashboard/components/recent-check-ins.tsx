'use client'

export function RecentCheckIns({ brandSlug: _ }: { brandSlug: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
        Recent Check-ins
      </h2>
      <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>
        Check-in data will appear here once customers begin their routines.
      </p>
    </div>
  )
}
