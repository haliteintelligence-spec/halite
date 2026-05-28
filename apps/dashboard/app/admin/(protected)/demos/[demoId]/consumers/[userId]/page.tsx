'use client'

import { useParams } from 'next/navigation'
import { AdminConsumerDetail } from '@/components/admin/AdminConsumerDetail'
import { DemoDetailTabs } from '../../_tabs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function DemoConsumerDetailPage() {
  const { demoId, userId } = useParams<{ demoId: string; userId: string }>()
  return (
    <div className="max-w-2xl">
      <Link href="/admin/demos" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Demos
      </Link>
      <DemoDetailTabs demoId={demoId} />
      <AdminConsumerDetail
        brandId={demoId}
        userId={userId}
        backHref={`/admin/demos/${demoId}/consumers`}
      />
    </div>
  )
}
