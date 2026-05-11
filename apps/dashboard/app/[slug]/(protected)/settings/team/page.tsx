import { getTokenAndBrandId, getTeam } from '@/lib/api'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const auth = await getTokenAndBrandId()

  if (!auth) {
    return (
      <div className="rounded-2xl border border-sand-2 bg-white p-8 text-center">
        <p className="text-sm text-ink-3">Unable to load team.</p>
      </div>
    )
  }

  const members = await getTeam()

  return (
    <TeamClient
      brandId={auth.brandId}
      token={auth.token}
      currentAdminId={auth.adminId}
      initialMembers={members ?? []}
    />
  )
}
