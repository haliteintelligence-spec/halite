import { notFound } from 'next/navigation'
import { QuizClient } from './QuizClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  const res = await fetch(`${apiUrl}/brands/slug/${slug}`, { cache: 'no-store' })
  if (!res.ok) notFound()

  const { brand } = (await res.json()) as {
    brand: {
      id: string
      name: string
      focusAreas: string[]
      logoUrl?: string
      primaryColor?: string
    }
  }

  return <QuizClient brand={brand} slug={slug} />
}
