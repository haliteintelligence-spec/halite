export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function getAdminToken(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.match(/halite_admin_token=([^;]+)/)?.[1] ?? ''
}

export function adminHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getAdminToken()}` }
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}
