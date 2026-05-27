import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/AdminNav'
import { AdminMobileHeader } from '@/components/admin/AdminMobileHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_admin_token')?.value
  if (!token) redirect('/admin/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--sand-1)' }}>
      <AdminNav />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminMobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
