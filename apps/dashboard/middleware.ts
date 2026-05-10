import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'haliteintelligence.com'

  // Extract subdomain — e.g. "luxe" from "luxe.haliteintelligence.com"
  const subdomain = hostname.replace(`.${rootDomain}`, '')

  // Pass through for the root domain itself, www, or localhost
  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname.startsWith('localhost') ||
    subdomain === hostname // no subdomain found
  ) {
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
