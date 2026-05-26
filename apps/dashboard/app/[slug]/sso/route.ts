import { type NextRequest, NextResponse } from 'next/server'

// Receives the short-lived token from /shopify/launch, sets the slug-scoped
// halite_token cookie, and redirects into the brand dashboard.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL(`/${slug}/login`, request.url))
  }

  const response = NextResponse.redirect(new URL(`/${slug}`, request.url))
  response.cookies.set('halite_token', token, {
    path: `/${slug}`,
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    httpOnly: false,
  })

  return response
}
