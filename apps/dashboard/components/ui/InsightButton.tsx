'use client'

import { useState, useRef } from 'react'
import { Sparkles, X, Loader2, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)halite_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]!) : null
}

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold" style={{ color: 'var(--ink)' }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

function RenderedLine({ text }: { text: string }) {
  if (!text.trim()) return <div className="h-2" />

  if (text.startsWith('## '))
    return (
      <p className="text-[13px] font-semibold mt-5 first:mt-0 mb-1.5" style={{ color: 'var(--ink)' }}>
        <BoldText text={text.slice(3)} />
      </p>
    )

  if (text.startsWith('### '))
    return (
      <p className="text-[12px] font-semibold mt-3 mb-1" style={{ color: 'var(--ink)' }}>
        <BoldText text={text.slice(4)} />
      </p>
    )

  if (/^[-*]\s/.test(text))
    return (
      <div className="flex gap-2 items-start">
        <span
          className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: 'var(--clay)' }}
        />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          <BoldText text={text.slice(2)} />
        </p>
      </div>
    )

  if (/^\d+\.\s/.test(text)) {
    const m = text.match(/^(\d+)\.\s(.*)$/)
    if (m)
      return (
        <div className="flex gap-2 items-start">
          <span
            className="font-semibold text-[11px] tabular-nums flex-shrink-0 mt-0.5"
            style={{ color: 'var(--clay)', minWidth: '1rem' }}
          >
            {m[1]}.
          </span>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            <BoldText text={m[2]!} />
          </p>
        </div>
      )
  }

  return (
    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
      <BoldText text={text} />
    </p>
  )
}

interface Props {
  brandId: string
  viewName: string
  dataContext: Record<string, unknown>
}

export function InsightButton({ brandId, viewName, dataContext }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function fetchInsight() {
    const token = getToken()
    if (!token) { setError(true); return }

    setContent('')
    setError(false)
    setLoading(true)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_URL}/brands/${brandId}/insights/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ viewName, dataContext }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) { setError(true); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) setContent(prev => prev + parsed.text)
            if (parsed.error) { setError(true); break }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(true)
    } finally {
      setLoading(false)
    }
  }

  function openPanel() {
    setIsOpen(true)
    if (!content && !loading) fetchInsight()
  }

  function closePanel() {
    setIsOpen(false)
    abortRef.current?.abort()
  }

  const lines = content.split('\n')

  return (
    <>
      <button
        onClick={openPanel}
        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-75 flex-shrink-0"
        style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
        title="Generate AI insight for this view"
      >
        <Sparkles size={10} />
        AI Insights
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.18)' }}
            onClick={closePanel}
          />
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: 'min(440px, 92vw)',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.1)',
            }}
          >
            <div
              className="flex items-start justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles size={12} style={{ color: 'var(--clay)' }} />
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>AI Insight</p>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{viewName}</p>
              </div>
              <button
                onClick={closePanel}
                className="p-1 rounded transition-opacity hover:opacity-60"
                style={{ marginTop: '2px' }}
              >
                <X size={15} style={{ color: 'var(--ink-3)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && !content && (
                <div className="flex items-center gap-2.5 py-6">
                  <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--clay)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Generating insight…</p>
                </div>
              )}

              {error && !loading && (
                <p className="text-[12px] py-4" style={{ color: 'var(--blush)' }}>
                  Failed to generate insight. Please try again.
                </p>
              )}

              {content && (
                <div className="space-y-1">
                  {lines.map((line, i) => <RenderedLine key={i} text={line} />)}
                  {loading && (
                    <span
                      className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom animate-pulse rounded-sm"
                      style={{ background: 'var(--clay)' }}
                    />
                  )}
                </div>
              )}
            </div>

            {!loading && (content || error) && (
              <div
                className="flex items-center justify-end px-5 py-3 flex-shrink-0"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={fetchInsight}
                  className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-70"
                  style={{ color: 'var(--clay)' }}
                >
                  <RefreshCw size={11} />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
