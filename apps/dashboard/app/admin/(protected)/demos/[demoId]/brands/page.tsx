'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminBrandsOverlapTab } from '@/components/admin/AdminBrandsOverlapTab'
import { DemoDetailTabs } from '../_tabs'

export default function DemoBrandsPage() {
  const { demoId } = useParams<{ demoId: string }>()
  return (
    <div className="max-w-3xl">
      <Link href="/admin/demos" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Demos
      </Link>
      <DemoDetailTabs demoId={demoId} />
      <AdminBrandsOverlapTab brandId={demoId} />
    </div>
  )
}
