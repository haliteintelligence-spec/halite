/**
 * Where a brand's own dashboard lives, and how a Halite admin gets into it.
 *
 * This URL must always be ABSOLUTE and always point at the real portal. A
 * relative link here resolves against whatever origin the admin app happens
 * to be served from, which on a dev server means the "Enter dashboard"
 * button sends you to localhost — the brand portal is not running there, so
 * it just fails to connect.
 *
 * The admin app and the brand portal are also the same deployment today, so
 * a same-origin link would appear to work and then quietly break the day
 * they are split. Absolute, and validated, on purpose.
 */

const PRODUCTION_PORTAL = 'https://portal.haliteintelligence.com'

function resolvePortalBase(): string {
  const explicit = process.env.NEXT_PUBLIC_PORTAL_URL?.trim()
  if (explicit && isUsable(explicit)) return stripTrailingSlash(explicit)

  // NEXT_PUBLIC_ROOT_DOMAIN is "localhost" in local env files, which is
  // exactly the case this guard exists for.
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
  if (root && !isLocal(root)) return `https://portal.${stripTrailingSlash(root)}`

  return PRODUCTION_PORTAL
}

function isLocal(value: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(value)
}

/** An override is only honoured when it is absolute and not a local host. */
function isUsable(value: string): boolean {
  if (isLocal(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export const PORTAL_BASE = resolvePortalBase()

export function brandDashboardUrl(slug: string): string {
  return `${PORTAL_BASE}/${slug}`
}

/** A one-time link that signs the admin into a brand's dashboard. */
export function brandSsoUrl(slug: string, token: string): string {
  return `${PORTAL_BASE}/${slug}/sso?token=${encodeURIComponent(token)}`
}

/**
 * Mints an impersonation session for a brand and opens its dashboard.
 * Throws with a readable message so the caller can surface it.
 */
export async function openBrandDashboard(brandId: string): Promise<void> {
  const adminToken = document.cookie.match(/halite_admin_token=([^;]+)/)?.[1]

  // Opened before the await so Safari does not treat it as a popup.
  const tab = window.open('', '_blank')

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/brands/${brandId}/impersonate`,
      { method: 'POST', headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {} },
    )
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null
      throw new Error(body?.error ?? 'Could not start a session for this brand')
    }
    const { token, slug } = await res.json() as { token: string; slug: string }

    const url = brandSsoUrl(slug, token)
    // Belt and braces: never navigate a viewer somewhere unreachable.
    if (isLocal(url)) {
      throw new Error('The brand portal URL is misconfigured — it points at localhost.')
    }

    if (tab) tab.location.href = url
    else window.open(url, '_blank')
  } catch (err) {
    tab?.close()
    throw err
  }
}
