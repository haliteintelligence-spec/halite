'use client'

import { useParams } from 'next/navigation'
import { AdminConsumerDetail } from '@/components/admin/AdminConsumerDetail'
import { BrandDetailTabs } from '../../_tabs'

export default function BrandConsumerDetailPage() {
  const { brandId, userId } = useParams<{ brandId: string; userId: string }>()
  return (
    <div>
      <div className="px-4 pt-5 md:px-7 md:pt-6">
        <BrandDetailTabs brandId={brandId} />
      </div>
      <AdminConsumerDetail
        brandId={brandId}
        userId={userId}
        backHref={`/admin/brands/${brandId}/consumers`}
      />
    </div>
  )
}
