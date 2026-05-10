/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@halite/ui', '@halite/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.myshopify.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
    ],
  },
}

export default nextConfig
