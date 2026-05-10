'use client'

import { use, useState } from 'react'

interface Props {
  params: Promise<{ slug: string }>
}

export default function CatalogPage({ params }: Props) {
  const { slug: _slug } = use(params)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ uploadId: string; status: string } | null>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    const token = document.cookie.match(/halite_token=([^;]+)/)?.[1]
    const brandId = ''

    const form = new FormData()
    form.append('file', file)

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/brands/${brandId}/catalog/upload`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    )
    const data = await res.json()
    setResult(data)
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Product Catalog</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Upload your catalog as CSV or JSON, or sync from Shopify
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleUpload(file)
        }}
        className="rounded-2xl p-12 text-center transition-colors border-2 border-dashed"
        style={{
          borderColor: dragOver ? 'var(--text-1)' : 'var(--border)',
          background: dragOver ? 'var(--bg-muted)' : 'white',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          Drag & drop a <strong>CSV</strong> or <strong>JSON</strong> file here
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>or</p>
        <label className="mt-3 inline-block cursor-pointer">
          <span className="text-sm font-medium underline" style={{ color: 'var(--text-1)' }}>
            Browse file
          </span>
          <input
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
        </label>
      </div>

      {uploading && <p className="text-sm" style={{ color: 'var(--text-3)' }}>Uploading & processing…</p>}
      {result && (
        <div className="rounded-xl p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100">
          Upload received (ID: {result.uploadId}). Status: {result.status}
        </div>
      )}

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-muted)' }}>
        <h2 className="text-xs font-semibold mb-2 tracking-wide uppercase" style={{ color: 'var(--text-2)' }}>
          Expected CSV columns
        </h2>
        <code className="text-xs leading-relaxed block" style={{ color: 'var(--text-3)' }}>
          name, description, category, concerns, skin_types, fitzpatrick_types,
          ingredients, key_ingredients, price, currency, image_url, product_url,
          external_id, in_stock
        </code>
      </div>
    </div>
  )
}
