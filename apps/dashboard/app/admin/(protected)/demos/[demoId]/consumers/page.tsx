'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminConsumersTab } from '@/components/admin/AdminConsumersTab'
import { DemoDetailTabs } from '../_tabs'

export default function DemoConsumersPage() {
  const { demoId } = useParams<{ demoId: string }>()
  return (
    <div className="max-w-5xl">
      <Link href="/admin/demos" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Demos
      </Link>
      <DemoDetailTabs demoId={demoId} />
      <AdminConsumersTab
        brandId={demoId}
        detailBaseHref={`/admin/demos/${demoId}/consumers`}
      />
    </div>
  )
}
