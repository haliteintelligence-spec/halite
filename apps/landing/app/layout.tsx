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
    default: 'Halite Intelligence — Predictive Consumer Intelligence for Beauty Brands',
    template: '%s — Halite Intelligence',
  },
  description: 'Halite Intelligence is the predictive consumer intelligence platform for beauty brands. Know your customer, personalize at scale, and retain longer with AI-powered skin routines and real outcome data.',
  keywords: [
    'beauty brand intelligence',
    'AI skincare personalization',
    'consumer intelligence platform',
    'beauty tech B2B',
    'skin routine AI',
    'customer retention beauty',
    'beauty brand dashboard',
    'personalized skincare platform',
    'Monk Skin Tone AI',
    'beauty brand analytics',
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
    title: 'Halite Intelligence — Predictive Consumer Intelligence for Beauty Brands',
    description: 'Know your customer. Personalize deeper. Retain longer. The AI platform that turns every skin interaction into retention leverage for beauty brands.',
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
    title: 'Halite Intelligence — Predictive Consumer Intelligence for Beauty Brands',
    description: 'Know your customer. Personalize deeper. Retain longer. The AI platform built for beauty brands.',
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
