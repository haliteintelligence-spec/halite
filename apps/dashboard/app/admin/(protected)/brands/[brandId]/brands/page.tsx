'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminBrandsOverlapTab } from '@/components/admin/AdminBrandsOverlapTab'
import { BrandDetailTabs } from '../_tabs'

export default function BrandBrandsPage() {
  const { brandId } = useParams<{ brandId: string }>()
  return (
    <div className="max-w-3xl">
      <Link href="/admin/brands" className="flex items-center gap-1 text-[12px] mb-6 hover:underline" style={{ color: 'var(--ink-3)' }}>
        <ArrowLeft size={12} /> Brands
      </Link>
      <BrandDetailTabs brandId={brandId} />
      <AdminBrandsOverlapTab brandId={brandId} />
    </div>
  )
}
