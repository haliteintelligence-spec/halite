import { StatCard } from '@/components/stat-card'
import { RecentCheckIns } from '@/components/recent-check-ins'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Your brand intelligence at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Users" value="—" trend={null} />
        <StatCard label="Check-ins (30d)" value="—" trend={null} />
        <StatCard label="Avg Skin Rating" value="—" trend={null} />
        <StatCard label="Routine Compliance" value="—" trend={null} />
      </div>

      <RecentCheckIns brandSlug={slug} />
    </div>
  )
}
