import type { ReactNode } from 'react'
import { SettingsSubNav } from './SettingsSubNav'

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="text-sm text-ink-3 mt-0.5">Manage your brand configuration</p>
      </div>
      <SettingsSubNav slug={slug} />
      {children}
    </div>
  )
}
