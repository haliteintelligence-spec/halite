/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@halite/ui', '@halite/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.myshopify.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Not a full script/style-src policy — this app relies on inline
          // style props and an inline <style> tag for white-label theming
          // (see app/[slug]/(protected)/layout.tsx), which would need a
          // nonce-based refactor to lock down safely. This still blocks
          // legacy plugin content and base-tag injection, and is CSP3's
          // preferred (more granular) form of frame-ancestors.
          { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        ],
      },
    ]
  },
}

export default nextConfig
