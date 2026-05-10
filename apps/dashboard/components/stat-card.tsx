interface Props {
  label: string
  value: string | number
  trend: { direction: 'up' | 'down'; pct: number } | null
}

export function StatCard({ label, value, trend }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: 'var(--border)' }}>
      <p
        className="text-[10px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </p>
      <p className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-1)' }}>
        {value}
      </p>
      {trend && (
        <p className={`text-xs mt-1.5 ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {trend.pct}% vs last 30d
        </p>
      )}
    </div>
  )
}
