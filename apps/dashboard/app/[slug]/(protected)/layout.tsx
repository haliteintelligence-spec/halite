import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SideNav } from '@/components/side-nav'
import { TopBar } from '@/components/top-bar'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function BrandLayout({ children, params }: Props) {
  const { slug } = await params
  const token = (await cookies()).get('halite_token')?.value
  if (!token) redirect(`/${slug}/login`)

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <SideNav slug={slug} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar slug={slug} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
