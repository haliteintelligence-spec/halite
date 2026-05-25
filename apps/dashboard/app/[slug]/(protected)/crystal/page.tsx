import { getCrystalConversations, getTokenAndBrandId } from '@/lib/api'
import { CrystalClient } from './CrystalClient'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ conv?: string }>
}

export default async function CrystalPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { conv: activeConvId } = await searchParams

  const [conversations, authInfo] = await Promise.all([
    getCrystalConversations(),
    getTokenAndBrandId(),
  ])

  const brandId = authInfo?.brandId ?? ''

  return (
    <CrystalClient
      slug={slug}
      brandId={brandId}
      initialConversations={conversations}
      activeConvId={activeConvId ?? null}
    />
  )
}
