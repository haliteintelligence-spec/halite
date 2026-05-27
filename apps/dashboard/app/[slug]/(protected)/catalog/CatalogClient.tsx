'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Product, ProductsResponse, UploadRecord } from '@/lib/api'
import { Pencil, Trash2, Plus, X, Upload, CheckCircle, AlertCircle, Loader2, ChevronRight, Download } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORIES = [
  'CLEANSER','TONER','SERUM','MOISTURIZER','EYE_CREAM','SPF','MASK','EXFOLIANT',
  'FACIAL_OIL','MIST','SPOT_TREATMENT','BODY_WASH','BODY_MOISTURIZER','BODY_OIL',
  'BODY_SCRUB','BODY_TREATMENT','BODY_SPF','SHAMPOO','CONDITIONER','HAIR_MASK',
  'SCALP_TREATMENT','LEAVE_IN','HAIR_OIL','STYLING','PRIMER','FOUNDATION',
  'CONCEALER','BLUSH_BRONZER','EYE_MAKEUP','LIP_COLOR','SETTING_SPRAY',
  'SETTING_POWDER','COLOR_CORRECTOR','EAU_DE_PARFUM','EAU_DE_TOILETTE',
  'BODY_MIST_SCENTED','HAIR_MIST','NAIL_TREATMENT','NAIL_COLOR','CUTICLE_OIL',
  'BASE_COAT','TOP_COAT','SUPPLEMENT','COLLAGEN','LIP_BALM','LIP_TREATMENT',
  'LIP_PLUMPER','LASH_SERUM','BROW_SERUM','EYE_PATCHES',
]

const CONCERNS = [
  'ACNE','HYPERPIGMENTATION','AGING','SENSITIVITY','DRYNESS','OILINESS',
  'REDNESS','DULLNESS','UNEVEN_TEXTURE','DARK_CIRCLES','PORES','DEHYDRATION',
]

function fmt(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    DONE:       { bg: '#ecfdf5', color: '#059669' },
    PROCESSING: { bg: '#eff6ff', color: '#2563eb' },
    FAILED:     { bg: '#fef2f2', color: '#dc2626' },
  }
  const s = map[status] ?? { bg: 'var(--sand-1)', color: 'var(--ink-3)' }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {fmt(status)}
    </span>
  )
}

interface FormState {
  name: string
  category: string
  price: string
  currency: string
  description: string
  imageUrl: string
  productUrl: string
  inStock: boolean
  keyIngredients: string
  concerns: string[]
}

const emptyForm: FormState = {
  name: '', category: 'SERUM', price: '', currency: 'USD',
  description: '', imageUrl: '', productUrl: '',
  inStock: true, keyIngredients: '', concerns: [],
}

function productToForm(p: Product): FormState {
  return {
    name: p.name,
    category: p.category,
    price: String(p.price),
    currency: p.currency,
    description: p.description ?? '',
    imageUrl: p.imageUrl ?? '',
    productUrl: p.productUrl ?? '',
    inStock: p.inStock,
    keyIngredients: p.keyIngredients.join(', '),
    concerns: p.concerns,
  }
}

export function CatalogClient({
  brandId,
  token,
  initialProducts,
  initialUploads,
}: {
  brandId: string
  token: string
  initialProducts: ProductsResponse | null
  initialUploads: UploadRecord[]
}) {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [tab, setTab] = useState<'products' | 'uploads'>('products')
  const [products, setProducts] = useState<Product[]>(initialProducts?.products ?? [])
  const [total, setTotal] = useState(initialProducts?.total ?? 0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(initialProducts?.pages ?? 1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [panel, setPanel] = useState<null | 'create' | Product>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [uploads, setUploads] = useState<UploadRecord[]>(initialUploads)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const authHeaders = { Authorization: `Bearer ${token}` }

  async function fetchProducts(p: number) {
    setLoading(true)
    const res = await fetch(`${API_URL}/brands/${brandId}/products?page=${p}&limit=50`, { headers: authHeaders })
    if (res.ok) {
      const data: ProductsResponse = await res.json()
      setProducts(data.products)
      setTotal(data.total)
      setPage(data.page)
      setPages(data.pages)
    }
    setLoading(false)
  }

  async function refreshUploads() {
    const res = await fetch(`${API_URL}/brands/${brandId}/catalog/uploads`, { headers: authHeaders })
    if (res.ok) {
      const data = await res.json()
      setUploads(data.uploads)
    }
  }

  function startPolling() {
    if (pollingRef.current) return
    pollingRef.current = setInterval(async () => {
      await refreshUploads()
      const res = await fetch(`${API_URL}/brands/${brandId}/catalog/uploads`, { headers: authHeaders })
      if (res.ok) {
        const data = await res.json()
        setUploads(data.uploads)
        const anyProcessing = data.uploads.some((u: UploadRecord) => u.status === 'PROCESSING')
        if (!anyProcessing && pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          fetchProducts(1)
        }
      }
    }, 3000)
  }

  useEffect(() => {
    const anyProcessing = uploads.some(u => u.status === 'PROCESSING')
    if (anyProcessing) startPolling()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function handleUpload(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_URL}/brands/${brandId}/catalog/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: form,
    })
    if (res.ok) {
      await refreshUploads()
      startPolling()
      setTab('uploads')
    }
    setUploading(false)
  }

  function openCreate() {
    setForm(emptyForm)
    setPanel('create')
  }

  function openEdit(p: Product) {
    setForm(productToForm(p))
    setPanel(p)
  }

  function closePanel() { setPanel(null) }

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleConcern(c: string) {
    setForm(f => ({
      ...f,
      concerns: f.concerns.includes(c) ? f.concerns.filter(x => x !== c) : [...f.concerns, c],
    }))
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price),
      currency: form.currency,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      productUrl: form.productUrl || null,
      inStock: form.inStock,
      keyIngredients: form.keyIngredients.split(',').map(s => s.trim()).filter(Boolean),
      concerns: form.concerns,
    }

    if (panel === 'create') {
      const res = await fetch(`${API_URL}/brands/${brandId}/products`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchProducts(page)
        closePanel()
      }
    } else if (panel && typeof panel === 'object') {
      const res = await fetch(`${API_URL}/brands/${brandId}/products/${panel.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchProducts(page)
        closePanel()
      }
    }
    setSaving(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`${API_URL}/brands/${brandId}/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (res.ok || res.status === 204) {
      setProducts(prev => prev.filter(p => p.id !== id))
      setTotal(t => t - 1)
    }
    setDeleting(null)
  }

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const cardCls = 'rounded-2xl border border-sand-2 bg-white'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Product Catalog</h1>
        <p className="text-sm mt-1 text-ink-3">Manage your product catalogue and upload new products.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-sand-2">
        {(['products', 'uploads'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[13px] font-medium transition-colors relative"
            style={{ color: tab === t ? 'var(--clay)' : 'var(--ink-3)' }}
          >
            {t === 'products' ? `Products${total > 0 ? ` (${total})` : ''}` : 'Uploads'}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--clay)' }} />
            )}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
            />
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all"
              style={{ background: 'var(--clay)' }}
            >
              <Plus size={14} />
              Add product
            </button>
          </div>

          {/* Product table */}
          <div className={cardCls}>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 size={20} className="animate-spin text-ink-3" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-ink-3">
                  {search ? 'No products match your search.' : 'No products yet. Upload a catalogue or add manually.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-sand-2">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold tracking-wide uppercase text-ink-3">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wide uppercase text-ink-3">Category</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wide uppercase text-ink-3">Price</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-wide uppercase text-ink-3">Stock</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr
                        key={p.id}
                        className="border-b border-sand-1 last:border-0 hover:bg-sand-1/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/${slug}/products/${p.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-sand-2" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex-shrink-0 border border-sand-2" style={{ background: 'var(--sand-1)' }} />
                            )}
                            <span className="font-medium text-ink">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--sand-1)', color: 'var(--ink-3)' }}>
                            {fmt(p.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-3">
                          {p.currency} {p.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: p.inStock ? '#ecfdf5' : '#fef2f2',
                              color: p.inStock ? '#059669' : '#dc2626',
                            }}
                          >
                            {p.inStock ? 'In stock' : 'Out'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                              className="p-1.5 rounded-lg transition-colors hover:bg-sand-2"
                              style={{ color: 'var(--ink-3)' }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteProduct(p.id) }}
                              disabled={deleting === p.id}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-50"
                              style={{ color: deleting === p.id ? 'var(--ink-3)' : '#dc2626' }}
                            >
                              {deleting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-3">
                Page {page} of {pages} · {total} products
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchProducts(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-sand-2 text-ink-3 disabled:opacity-40 hover:bg-sand-1 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={page === pages}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-sand-2 text-ink-3 disabled:opacity-40 hover:bg-sand-1 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'uploads' && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleUpload(file)
            }}
            className="rounded-2xl p-10 text-center transition-colors border-2 border-dashed"
            style={{
              borderColor: dragOver ? 'var(--clay)' : 'var(--sand-2)',
              background: dragOver ? '#fdf6f0' : 'white',
            }}
          >
            <Upload size={24} className="mx-auto mb-3 text-ink-3" />
            <p className="text-sm font-medium text-ink">
              Drop a <strong>CSV</strong> or <strong>JSON</strong> file here
            </p>
            <p className="text-xs mt-1 text-ink-3">or</p>
            <label className="mt-3 inline-block cursor-pointer">
              <span className="text-sm font-medium underline" style={{ color: 'var(--clay)' }}>
                {uploading ? 'Uploading…' : 'Browse file'}
              </span>
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
            </label>
          </div>

          {/* CSV format hint */}
          <div className="rounded-xl p-4" style={{ background: 'var(--sand-1)' }}>
            <p className="text-[10px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">Expected CSV columns</p>
            <code className="text-[11px] leading-relaxed text-ink-3">
              name, description, category, concerns, skin_types, monk_skin_tones,
              ingredients, key_ingredients, price, currency, image_url, product_url,
              external_id, in_stock
            </code>
          </div>

          {/* Upload history — split by source */}
          {(() => {
            const userUploads = uploads.filter(u => u.source === 'USER_UPLOADED' || !u.source)
            const aiUploads = uploads.filter(u => u.source === 'AI_GENERATED')
            const UploadRow = ({ u }: { u: typeof uploads[0] }) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{u.fileName}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    {u.format} · {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {u.status === 'PROCESSING' && <Loader2 size={12} className="animate-spin text-blue-500" />}
                  <StatusBadge status={u.status} />
                  {u.status === 'DONE' && (
                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_URL}/brands/${brandId}/catalog/uploads/${u.id}/download`, { headers: authHeaders })
                        if (!res.ok) return
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = u.fileName; a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                      style={{ background: 'var(--sand-1)', color: 'var(--clay)', border: '1px solid var(--border)' }}
                    >
                      <Download size={11} /> Download
                    </button>
                  )}
                </div>
              </div>
            )
            return (
              <>
                {userUploads.length > 0 && (
                  <div className={cardCls}>
                    <div className="px-5 py-3 border-b border-sand-1">
                      <h3 className="text-[12px] font-semibold text-ink-3 tracking-wide uppercase">User Uploaded</h3>
                    </div>
                    <div className="divide-y divide-sand-1">
                      {userUploads.map(u => <UploadRow key={u.id} u={u} />)}
                    </div>
                  </div>
                )}
                {aiUploads.length > 0 && (
                  <div className={cardCls}>
                    <div className="px-5 py-3 border-b border-sand-1">
                      <h3 className="text-[12px] font-semibold text-ink-3 tracking-wide uppercase">AI Generated</h3>
                    </div>
                    <div className="divide-y divide-sand-1">
                      {aiUploads.map(u => <UploadRow key={u.id} u={u} />)}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Product panel */}
      {panel !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-[440px] bg-white shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid var(--sand-2)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-2">
              <h2 className="text-[15px] font-semibold text-ink">
                {panel === 'create' ? 'New product' : 'Edit product'}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-sand-1 transition-colors">
                <X size={16} className="text-ink-3" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Vitamin C Brightening Serum"
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{fmt(c)}</option>
                  ))}
                </select>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                    Price <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setField('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={e => setField('currency', e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                  />
                </div>
              </div>

              {/* In Stock */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setField('inStock', !form.inStock)}
                  className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: form.inStock ? 'var(--clay)' : 'var(--sand-2)' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                    style={{ transform: form.inStock ? 'translateX(20px)' : 'translateX(2px)' }}
                  />
                </button>
                <span className="text-[13px] text-ink">In stock</span>
              </div>

              {/* Concerns */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-2">
                  Skin concerns
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CONCERNS.map(c => {
                    const on = form.concerns.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleConcern(c)}
                        className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all border"
                        style={{
                          background: on ? 'var(--clay)' : 'var(--sand-1)',
                          borderColor: on ? 'var(--clay)' : 'var(--sand-2)',
                          color: on ? 'white' : 'var(--ink-3)',
                        }}
                      >
                        {fmt(c)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Key Ingredients */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Key ingredients
                  <span className="text-ink-3 font-normal normal-case tracking-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.keyIngredients}
                  onChange={e => setField('keyIngredients', e.target.value)}
                  placeholder="Niacinamide, Vitamin C, Hyaluronic Acid"
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  rows={3}
                  placeholder="Short product description…"
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors resize-none"
                />
              </div>

              {/* URLs */}
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => setField('imageUrl', e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-1.5">
                  Product URL
                </label>
                <input
                  type="url"
                  value={form.productUrl}
                  onChange={e => setField('productUrl', e.target.value)}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-lg border border-sand-2 text-[13px] text-ink bg-white outline-none focus:border-clay/50 transition-colors"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-sand-2 flex gap-3">
              <button
                onClick={saveProduct}
                disabled={saving || !form.name.trim() || !form.price}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'var(--clay)' }}
              >
                {saving ? 'Saving…' : panel === 'create' ? 'Add product' : 'Save changes'}
              </button>
              <button
                onClick={closePanel}
                className="px-4 py-2.5 rounded-lg text-[13px] font-medium border border-sand-2 text-ink-3 hover:bg-sand-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
