import { getTokenAndBrandId, getProducts, getUploadHistory } from '@/lib/api'
import { CatalogClient } from './CatalogClient'

export default async function CatalogPage() {
  const auth = await getTokenAndBrandId()

  if (!auth) {
    return (
      <div className="rounded-2xl border border-sand-2 bg-white p-8 text-center">
        <p className="text-sm text-ink-3">Unable to load catalog.</p>
      </div>
    )
  }

  const [productsData, uploads] = await Promise.all([
    getProducts(),
    getUploadHistory(),
  ])

  return (
    <CatalogClient
      brandId={auth.brandId}
      token={auth.token}
      initialProducts={productsData}
      initialUploads={uploads ?? []}
    />
  )
}
