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
    default: 'Halite Intelligence — The Portable Consumer Profile for CPG Brands',
    template: '%s — Halite Intelligence',
  },
  description: 'Halite gives every CPG brand one consented, portable consumer profile — built by the shopper in Hallie and carried from brand to brand. Customers arrive already known, so you skip the onboarding quiz and personalize precisely from the first visit.',
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
    title: 'Halite Intelligence — The Portable Consumer Profile for CPG Brands',
    description: 'Your next customer already has a profile. One consented profile per person, built by the shopper and carried from brand to brand — so CPG brands never start a customer from zero.',
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
    title: 'Halite Intelligence — The Portable Consumer Profile for CPG Brands',
    description: 'Your next customer already has a profile. Consented, portable, and built by the shopper themselves.',
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
