import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://haliteintelligence.com'),
  title: {
    default: 'Halite Intelligence — Turn Every Shopper Into a Known Customer',
    template: '%s — Halite Intelligence',
  },
  description: 'For beauty and fragrance brands. Your customers build one profile — their full routine, preferences and goals — and your brand gets to access it in one tap. So from their very first visit, your store already knows them.',
  keywords: [
    'portable consumer profile',
    'consented data sharing CPG',
    'zero party data CPG',
    'CPG consumer intelligence',
    'consumer intelligence platform',
    'cross-brand personalization',
    'quiz prefill personalization',
    'CPG brand analytics',
    'AI product personalization',
    'customer retention CPG',
    'beauty brand intelligence',
    'consumer packaged goods intelligence',
    'Monk Skin Tone AI',
  ],
  authors: [{ name: 'Halite Intelligence', url: 'https://haliteintelligence.com' }],
  creator: 'Halite Intelligence',
  publisher: 'Halite Intelligence',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://haliteintelligence.com',
    siteName: 'Halite Intelligence',
    title: 'Halite Intelligence — Turn Every Shopper Into a Known Customer',
    description: 'Your customers build one profile — routine, preferences and goals — and your brand accesses it in one tap. Consumer-permissioned, one link on your site, live in a week.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Halite Intelligence — Predictive Consumer Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Halite Intelligence — Turn Every Shopper Into a Known Customer',
    description: 'One profile, built by the shopper, shared with your brand in one tap. Your store knows them from the first visit.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://haliteintelligence.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
