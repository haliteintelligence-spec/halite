// Hallie is a separate app on its own subdomain (not part of this monorepo —
// see Building/Hallie Testing), so every consumer-facing CTA on this site is an
// outbound link rather than a route. Centralized here so the nav, the consumer
// band and the footer can never drift apart on it.
export const HALLIE_URL = 'https://hal.haliteintelligence.com'

// Applied to every outbound Hallie link. `noopener` is the security-relevant
// half; `noreferrer` is deliberately omitted so Hallie can still attribute
// signups arriving from this page.
export const EXTERNAL_LINK_PROPS = {
  target: '_blank',
  rel: 'noopener',
} as const
