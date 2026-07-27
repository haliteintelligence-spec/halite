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
  converted: boolean
  plan: string
  status: 'generating' | 'active' | 'expiring_soon' | 'access_expired' | 'converted' | 'failed'
  active: boolean
  loginUrl: string
  email: string | null
  password: string | null
  demoLinkExpiresAt: string | null
  demoProvisioningError: { message: string; failedAt: string } | null
  focusAreas: string[]
  productCount: number
  consumerCount: number
  createdAt: string
}

export interface DemoDetail extends DemoSummary {
  name: string
  active: boolean
  whiteLabelEnabled: boolean
  brandWebsiteUrl: string | null
  brandThemeConfig: BrandThemeConfig | null
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

export interface BrandSummary {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
  createdAt: string
  demoProspectName?: string | null
  _count: { endUsers: number; products: number }
}

export interface BrandThemeConfig {
  primary: string
  primaryLight: string
  primaryDark: string
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  border: string
  fontSans: string
  fontDisplay: string
  fontUrl: string | null
}

export interface BrandDetail extends BrandSummary {
  focusAreas: string[]
  logoUrl: string | null
  primaryColor: string | null
  apiKey: string
  whiteLabelEnabled: boolean
  brandWebsiteUrl: string | null
  brandThemeConfig: BrandThemeConfig | null
  admins: Array<{ id: string; email: string; name: string; phone?: string | null; role: string; createdAt: string }>
}

export async function getBrands(): Promise<BrandSummary[]> {
  const data = await adminFetch<{ brands: BrandSummary[] }>('/admin/brands')
  return data?.brands ?? []
}

export async function getBrandDetail(brandId: string): Promise<BrandDetail | null> {
  const data = await adminFetch<{ brand: BrandDetail }>(`/admin/brands/${brandId}`)
  return data?.brand ?? null
}
