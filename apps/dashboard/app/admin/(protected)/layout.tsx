import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_admin_token')?.value
  if (!token) redirect('/admin/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--sand-1)' }}>
      <AdminNav />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
