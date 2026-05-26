import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'haliteintelligence.com'

  // Extract subdomain — e.g. "luxe" from "luxe.haliteintelligence.com"
  const subdomain = hostname.replace(`.${rootDomain}`, '')

  // Known service subdomains — not brand slugs, pass through as-is
  const serviceSubdomains = ['portal', 'app', 'dashboard', 'admin', 'www']

  // Pass through for the root domain itself, www, localhost, or a known service subdomain
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname.startsWith('localhost') ||
    subdomain === hostname || // no subdomain found
    serviceSubdomains.includes(subdomain)
  ) {
    return NextResponse.next()
  }

  // Pass through admin routes regardless of subdomain
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Rewrite to /[slug]/... so the app router can serve the brand-scoped UI
  const url = request.nextUrl.clone()
  url.pathname = `/${subdomain}${url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
