import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface AnalyticsData {
  summary: {
    totalConsumers: number
    totalCheckIns: number
    avgRating: number | null
    complianceRate: number | null
    usageRate: number | null
  }
  consumers: {
    fitzpatrick: Array<{ type: number; tone: string; label: string; count: number; pct: number }>
    skinTypes: Array<{ type: string; count: number; pct: number }>
    concerns: Array<{ concern: string; count: number; pct: number }>
    ageRanges: Array<{ group: string; n: number }>
  }
  checkIns: {
    weeklyTrend: number[]
    thisWeek: number
    lastWeek: number
    symptoms: Array<{ symptom: string; count: number }>
  }
  products: {
    topProducts: Array<{
      id: string; name: string; category: string
      used: number; positive: number; neutral: number; negative: number; total: number; rate: number
    }>
    categoryPerf: Array<{ category: string; used: number; total: number; acceptance: number }>
    topIngredients: Array<{ name: string; count: number; score: number; concerns: string[] }>
    concernCoverage: Array<{ concern: string; userPct: number; productCount: number; coverage: number }>
    totalRecommended: number
  }
}

export function decodeToken(token: string): { brandId?: string; role?: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch { return null }
}

async function apiFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 120 },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export interface BrandProfile {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
  logoUrl: string | null
  primaryColor: string | null
  focusAreas: string[]
  createdAt: string
}

async function apiFetchMutate<T>(path: string, token: string, method: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export async function getBrandProfile(): Promise<BrandProfile | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const data = await apiFetch<{ brand: BrandProfile }>(`/brands/${payload.brandId}/profile`, token)
  return data?.brand ?? null
}

export async function getTokenAndBrandId(): Promise<{ token: string; brandId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return { token, brandId: payload.brandId }
}

export async function getAnalytics(): Promise<AnalyticsData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return apiFetch<AnalyticsData>(`/brands/${payload.brandId}/analytics`, token)
}
