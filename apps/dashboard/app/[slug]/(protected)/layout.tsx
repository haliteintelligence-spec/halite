import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SideNav } from '@/components/side-nav'
import { AIInsightPanel } from '@/components/intelligence/AIInsightPanel'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function BrandLayout({ children, params }: Props) {
  const { slug } = await params
  const token = (await cookies()).get('halite_token')?.value
  if (!token) redirect(`/${slug}/login`)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--porcelain)' }}>
      <SideNav slug={slug} />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* AI panel hidden on mobile, visible lg+ */}
      <div className="hidden lg:flex">
        <AIInsightPanel />
      </div>
    </div>
  )
}
