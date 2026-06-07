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
    default: 'Halite Intelligence — Predictive Consumer Intelligence for CPG Brands',
    template: '%s — Halite Intelligence',
  },
  description: 'Halite Intelligence is the predictive consumer intelligence platform for CPG brands. Know your customer, personalize at scale, and retain longer with AI-powered recommendations and real outcome data.',
  keywords: [
    'CPG consumer intelligence',
    'predictive intelligence platform',
    'consumer intelligence platform',
    'CPG brand analytics',
    'AI product personalization',
    'customer retention CPG',
    'beauty brand intelligence',
    'AI skincare personalization',
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
    title: 'Halite Intelligence — Predictive Consumer Intelligence for CPG Brands',
    description: 'Know your customer. Personalize deeper. Retain longer. The AI platform that turns every consumer interaction into retention leverage for CPG brands.',
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
    title: 'Halite Intelligence — Predictive Consumer Intelligence for CPG Brands',
    description: 'Know your customer. Personalize deeper. Retain longer. The AI platform built for CPG brands.',
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
