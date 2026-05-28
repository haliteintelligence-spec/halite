'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminConsumersTab } from '@/components/admin/AdminConsumersTab'
import { BrandDetailTabs } from '../_tabs'

export default function BrandConsumersPage() {
  const { brandId } = useParams<{ brandId: string }>()
  return (
    <div className="max-w-5xl">
      <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Brands
      </Link>
      <BrandDetailTabs brandId={brandId} />
      <AdminConsumersTab
        brandId={brandId}
        detailBaseHref={`/admin/brands/${brandId}/consumers`}
      />
    </div>
  )
}
