'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminConsumerDetail } from '@/components/admin/AdminConsumerDetail'
import { BrandDetailTabs } from '../../_tabs'

export default function BrandConsumerDetailPage() {
  const { brandId, userId } = useParams<{ brandId: string; userId: string }>()
  return (
    <div className="max-w-2xl">
      <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Brands
      </Link>
      <BrandDetailTabs brandId={brandId} />
      <AdminConsumerDetail
        brandId={brandId}
        userId={userId}
        backHref={`/admin/brands/${brandId}/consumers`}
      />
    </div>
  )
}
