import { getBrandProfile, getTokenAndBrandId } from '@/lib/api'
import { SettingsProfileClient } from './SettingsProfileClient'

export default async function SettingsPage() {
  const [profile, auth] = await Promise.all([getBrandProfile(), getTokenAndBrandId()])

  if (!profile || !auth) {
    return (
      <div className="rounded-2xl border border-sand-2 bg-white p-8 text-center">
        <p className="text-sm text-ink-3">Unable to load brand profile.</p>
      </div>
    )
  }

  return <SettingsProfileClient profile={profile} token={auth.token} />
}
