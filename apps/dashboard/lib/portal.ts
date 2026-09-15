/**
 * Where a brand's own dashboard lives, and how a Halite admin gets into it.
 *
 * The admin app and the brand portal are different origins, so a
 * `document.cookie` write here never reaches the portal — the session has to
 * be handed over through the portal's own /[slug]/sso route, which sets the
 * cookie server-side on the right host and then redirects in.
 */
export const PORTAL_BASE =
  process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.haliteintelligence.com'

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
    if (tab) tab.location.href = url
    else window.open(url, '_blank')
  } catch (err) {
    tab?.close()
    throw err
  }
}
