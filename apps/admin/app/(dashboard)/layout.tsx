import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSideNav } from '@/components/admin-side-nav'

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get('halite_admin_token')?.value
  if (!token) redirect('/login')

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <AdminSideNav />
      <main className="flex-1 overflow-y-auto p-8" style={{ color: 'var(--text-1)' }}>
        {children}
      </main>
    </div>
  )
}
