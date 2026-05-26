'use client'

import { useState, useEffect } from 'react'
import type { IntegrationStatus } from '@/lib/api'
import { CheckCircle, RefreshCw, Unlink, ExternalLink, Loader2, Copy, Check, RotateCcw, Eye, EyeOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function ShopifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M37.3 10.2c0 0-0.7-0.1-1.9-0.1c-1 0-2.5 0.3-4.1 0.8C30.1 7.8 28 6 25.3 6c-0.1 0-0.3 0-0.4 0c-0.8-1-1.8-1.5-2.7-1.5c-6.7 0-9.9 8.4-10.9 12.7c-2.6 0.8-4.5 1.4-4.7 1.4C5.4 19 5.3 19.1 5.2 20.4L3 40l26.4 4.6L42 41.7L37.3 10.2zM28.4 11.6c-1.2 0.4-2.7 0.8-4.3 1.3c0.4-1.7 1.3-5.1 2.8-6.5C28 7.9 28.3 9.5 28.4 11.6zM22.2 7.3c0.3 0 0.6 0.1 0.9 0.3c-2.2 1-4.6 3.8-5.6 9.2l-4.2 1.3C14.4 14 17 7.3 22.2 7.3zM24.4 30.7l-7.9-1.9L18.7 24l7.9 1.9L24.4 30.7z" fill="#95BF47"/>
      <path d="M36.3 10.7c0 0-0.1 0-0.3 0l-1.3 0.1l0 0c0 0-0.9-0.1-2.4 0.1c-0.1 0-0.2 0-0.3 0L37.3 44l4.7-1.3L36.3 10.7z" fill="#5E8E3E"/>
    </svg>
  )
}

export function IntegrationsClient({
  brandId,
  token,
  apiKey,
  integrations,
  justConnected,
}: {
  brandId: string
  token: string
  apiKey: string | null
  integrations: IntegrationStatus | null
  justConnected: boolean
}) {
  const [shopify, setShopify] = useState(integrations?.shopify ?? { connected: false, shop: null, lastSync: null, lastSyncCount: null })
  const [shopInput, setShopInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [banner, setBanner] = useState(justConnected)
  const [connectError, setConnectError] = useState('')
  const [currentApiKey, setCurrentApiKey] = useState(apiKey)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [rotating, setRotating] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  function copyKey() {
    if (!currentApiKey) return
    navigator.clipboard.writeText(currentApiKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  async function rotateKey() {
    if (!confirm('Rotate API key? Your existing integrations will stop working until you update them with the new key.')) return
    setRotating(true)
    const res = await fetch(`${API_URL}/brands/${brandId}/rotate-api-key`, { method: 'POST', headers: authHeaders })
    if (res.ok) {
      const data = await res.json()
      setCurrentApiKey(data.apiKey)
    }
    setRotating(false)
  }

  useEffect(() => {
    if (banner) {
      const t = setTimeout(() => setBanner(false), 5000)
      return () => clearTimeout(t)
    }
  }, [banner])

  function buildInstallUrl() {
    let shop = shopInput.trim().toLowerCase()
    if (!shop) { setConnectError('Enter your shop domain.'); return null }
    shop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shop.includes('.myshopify.com')) shop = `${shop}.myshopify.com`
    setConnectError('')
    return `${API_URL}/shopify/install?shop=${encodeURIComponent(shop)}&brandId=${brandId}`
  }

  async function sync() {
    setSyncing(true)
    setSyncDone(false)
    const res = await fetch(`${API_URL}/brands/${brandId}/shopify/sync`, {
      method: 'POST',
      headers: authHeaders,
    })
    if (res.ok) {
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 4000)
      // Refresh status after a short delay to pick up new sync record
      setTimeout(async () => {
        const r = await fetch(`${API_URL}/brands/${brandId}/integrations`, { headers: authHeaders })
        if (r.ok) {
          const data = await r.json()
          setShopify(data.shopify)
        }
      }, 3000)
    }
    setSyncing(false)
  }

  async function disconnect() {
    if (!confirm('Disconnect Shopify? Your synced products will remain but future syncs will stop.')) return
    setDisconnecting(true)
    const res = await fetch(`${API_URL}/brands/${brandId}/shopify`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (res.ok || res.status === 204) {
      setShopify({ connected: false, shop: null, lastSync: null, lastSyncCount: null })
      setShopInput('')
    }
    setDisconnecting(false)
  }

  const cardCls = 'rounded-2xl border border-sand-2 bg-white'

  return (
    <div className="space-y-5">
      {/* API Key */}
      <div className={cardCls}>
        <div className="px-6 py-4 border-b border-sand-1">
          <p className="text-[13px] font-semibold text-ink">API Key</p>
          <p className="text-[11px] text-ink-3">Use this key to embed the quiz widget and call the Halite API</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {currentApiKey ? (
            <div className="flex items-center gap-2 p-3 rounded-xl font-mono text-[12px]" style={{ background: 'var(--sand-1)', border: '1px solid var(--sand-2)' }}>
              <span className="flex-1 truncate" style={{ color: 'var(--ink)' }}>
                {keyVisible ? currentApiKey : '•'.repeat(currentApiKey.length)}
              </span>
              <button onClick={() => setKeyVisible(v => !v)} className="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity">
                {keyVisible ? <EyeOff size={14} style={{ color: 'var(--ink-3)' }} /> : <Eye size={14} style={{ color: 'var(--ink-3)' }} />}
              </button>
              <button onClick={copyKey} className="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity">
                {keyCopied ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} style={{ color: 'var(--ink-3)' }} />}
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Unable to load API key.</p>
          )}
          <div className="flex items-center gap-3">
            <button onClick={rotateKey} disabled={rotating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-sand-2 text-ink-3 hover:border-sand-3 transition-colors disabled:opacity-50">
              {rotating ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Rotate key
            </button>
            <p className="text-[11px] text-ink-3">Rotating generates a new key — update all integrations immediately.</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {banner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-100">
          <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
          Shopify connected successfully. Your product catalog is being synced.
        </div>
      )}

      <div className={cardCls}>
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-sand-1">
          <ShopifyIcon />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-ink">Shopify</p>
            <p className="text-[11px] text-ink-3">Sync your product catalog from Shopify</p>
          </div>
          {shopify.connected ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3 bg-sand-1 px-2.5 py-1 rounded-full border border-sand-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sand-2" />
              Not connected
            </span>
          )}
        </div>

        <div className="px-6 py-5">
          {shopify.connected ? (
            <div className="space-y-4">
              {/* Shop info */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--sand-1)' }}>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold tracking-wide uppercase text-ink-3 mb-0.5">Connected store</p>
                  <p className="text-[13px] font-medium text-ink font-mono">{shopify.shop}</p>
                </div>
                <a
                  href={`https://${shopify.shop}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-sand-2 transition-colors"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Last sync */}
              <div className="flex items-center gap-3 text-[12px] text-ink-3">
                {shopify.lastSync ? (
                  <>
                    <span>Last synced {new Date(shopify.lastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {shopify.lastSyncCount !== null && (
                      <span>· {shopify.lastSyncCount} products</span>
                    )}
                  </>
                ) : (
                  <span>No successful sync yet</span>
                )}
                {syncDone && (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Sync started
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={sync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                  style={{ background: 'var(--clay)' }}
                >
                  {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {syncing ? 'Starting sync…' : 'Sync catalog'}
                </button>
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-60"
                >
                  {disconnecting ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-3">
                Connect your Shopify store to automatically sync your product catalog into Halite.
                Products will be imported and kept up to date via webhooks.
              </p>
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold tracking-wide uppercase text-ink-3">
                  Shop domain
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={shopInput}
                      onChange={e => { setShopInput(e.target.value); setConnectError('') }}
                      placeholder="yourstore.myshopify.com"
                      className="w-full px-3 py-2 rounded-lg border text-[13px] text-ink bg-white outline-none transition-colors"
                      style={{ borderColor: connectError ? '#fca5a5' : 'var(--sand-2)' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const url = buildInstallUrl()
                          if (url) window.location.href = url
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const url = buildInstallUrl()
                      if (url) window.location.href = url
                    }}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white flex-shrink-0"
                    style={{ background: 'var(--clay)' }}
                  >
                    Connect
                  </button>
                </div>
                {connectError && (
                  <p className="text-[12px] text-red-500">{connectError}</p>
                )}
              </div>
              <p className="text-[11px] text-ink-3">
                You'll be redirected to Shopify to authorise access. Required scopes: read_products, read_customers, read_orders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Coming soon integrations */}
      {(['Klaviyo', 'Attentive', 'Gorgias'] as const).map(name => (
        <div key={name} className={`${cardCls} opacity-50`}>
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="w-8 h-8 rounded-lg border border-sand-2" style={{ background: 'var(--sand-1)' }} />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink">{name}</p>
              <p className="text-[11px] text-ink-3">Coming soon</p>
            </div>
            <span className="text-[10px] font-semibold text-ink-3 bg-sand-1 px-2.5 py-1 rounded-full border border-sand-2">
              Soon
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
