'use client'

import { useParams } from 'next/navigation'
import { AdminConsumerDetail } from '@/components/admin/AdminConsumerDetail'
import { DemoDetailTabs } from '../../_tabs'

export default function DemoConsumerDetailPage() {
  const { demoId, userId } = useParams<{ demoId: string; userId: string }>()
  return (
    <div>
      <div className="px-4 pt-5 md:px-7 md:pt-6">
        <DemoDetailTabs demoId={demoId} />
      </div>
      <AdminConsumerDetail
        brandId={demoId}
        userId={userId}
        backHref={`/admin/demos/${demoId}/consumers`}
      />
    </div>
  )
}
