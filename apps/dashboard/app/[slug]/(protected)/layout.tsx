import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SideNav } from '@/components/side-nav'
import { AIInsightPanel } from '@/components/intelligence/AIInsightPanel'
import { getBrandProfile } from '@/lib/api'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function BrandLayout({ children, params }: Props) {
  const { slug } = await params
  const token = (await cookies()).get('halite_token')?.value
  if (!token) redirect(`/${slug}/login`)

  const profile = await getBrandProfile()
  const isDemo = profile?.isDemo ?? false
  const demoLinkExpiresAt = profile?.demoLinkExpiresAt ?? null

  const daysLeft = demoLinkExpiresAt
    ? Math.ceil((new Date(demoLinkExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--porcelain)' }}>
      <SideNav slug={slug} isDemo={isDemo} demoLinkExpiresAt={demoLinkExpiresAt} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {isDemo && (
          <div
            className="flex-shrink-0 flex items-center justify-center gap-2 py-2 px-4 text-[12px] font-medium"
            style={{ background: 'var(--clay)', color: 'white' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
            AI-Generated Demo Data — this environment is for demonstration purposes only
            {daysLeft !== null && daysLeft > 0 && (
              <span className="ml-2 opacity-70">· Access expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            )}
            {daysLeft !== null && daysLeft <= 0 && (
              <span className="ml-2 opacity-70">· Access expired — contact your Halite representative</span>
            )}
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* AI panel hidden on mobile, visible lg+ */}
      <div className="hidden lg:flex">
        <AIInsightPanel />
      </div>
    </div>
  )
}
