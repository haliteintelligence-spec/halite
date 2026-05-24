import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function adminFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_admin_token')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export interface DemoSummary {
  id: string
  slug: string
  prospectName: string | null
  status: 'generating' | 'active' | 'expiring_soon' | 'access_expired'
  loginUrl: string
  email: string | null
  password: string
  demoLinkExpiresAt: string | null
  focusAreas: string[]
  productCount: number
  consumerCount: number
  createdAt: string
}

export interface DemoDetail extends DemoSummary {
  stats: {
    products: number
    consumers: number
    routines: number
    checkIns: number
    workflows: number
  }
}

export interface AdminStats {
  brands: number
  users: number
  checkIns: number
  routines: number
}

export async function getAdminStats(): Promise<AdminStats | null> {
  return adminFetch<AdminStats>('/admin/stats')
}

export async function getDemos(): Promise<DemoSummary[]> {
  const data = await adminFetch<{ demos: DemoSummary[] }>('/admin/demos')
  return data?.demos ?? []
}

export async function getDemoDetail(demoId: string): Promise<DemoDetail | null> {
  const data = await adminFetch<{ demo: DemoDetail }>(`/admin/demos/${demoId}`)
  return data?.demo ?? null
}

export async function getBrands(): Promise<Array<{
  id: string; name: string; slug: string; plan: string; active: boolean
  createdAt: string; _count: { endUsers: number; products: number }
}>> {
  // Reuse admin stats to get brand list — fetched from a separate endpoint
  const data = await adminFetch<{ brands: any[] }>('/admin/brands')
  return data?.brands ?? []
}
