'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Trash2, Send, Loader2, MessageSquare, Clock, Menu } from 'lucide-react'
import type { CrystalConversation, CrystalMessage } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)halite_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]!) : null
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const STARTERS = [
  'What are my top consumer concerns right now?',
  'Which products have the highest acceptance rate?',
  'Where are the gaps in my catalogue coverage?',
  'How can I improve routine compliance?',
]

interface Props {
  slug: string
  brandId: string
  initialConversations: CrystalConversation[]
  activeConvId: string | null
}

export function CrystalClient({ slug, brandId, initialConversations, activeConvId: initId }: Props) {
  const router = useRouter()
  const [conversations, setConversations] = useState<CrystalConversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initId)
  const [messages, setMessages] = useState<CrystalMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [loadingConv, setLoadingConv] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initId) loadConversation(initId)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  async function loadConversation(id: string) {
    const token = getToken()
    if (!token) return
    setLoadingConv(true)
    setStreamText('')
    try {
      const res = await fetch(`${API_URL}/brands/${brandId}/crystal/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.conversation.messages ?? [])
      setActiveId(id)
      router.replace(`/${slug}/crystal?conv=${id}`, { scroll: false })
      setSidebarOpen(false)
    } finally {
      setLoadingConv(false)
    }
  }

  async function createConversation(): Promise<CrystalConversation | null> {
    const token = getToken()
    if (!token) return null
    const res = await fetch(`${API_URL}/brands/${brandId}/crystal/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'New conversation' }),
    })
    if (!res.ok) return null
    return (await res.json()).conversation as CrystalConversation
  }

  async function handleNewChat() {
    const conv = await createConversation()
    if (!conv) return
    setConversations(prev => [conv, ...prev])
    setMessages([])
    setStreamText('')
    setActiveId(conv.id)
    router.replace(`/${slug}/crystal?conv=${conv.id}`, { scroll: false })
    setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function sendMessage(content?: string) {
    const text = (content ?? input).trim()
    if (!text || streaming) return
    const token = getToken()
    if (!token) return

    let convId = activeId
    if (!convId) {
      const conv = await createConversation()
      if (!conv) return
      setConversations(prev => [conv, ...prev])
      convId = conv.id
      setActiveId(conv.id)
      router.replace(`/${slug}/crystal?conv=${conv.id}`, { scroll: false })
    }

    const userMsg: CrystalMessage = {
      id: `u-${Date.now()}`,
      role: 'USER',
      content: text,
      tokenCount: null,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamText('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch(
        `${API_URL}/brands/${brandId}/crystal/conversations/${convId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: text }),
          signal: abortRef.current.signal,
        }
      )
      if (!res.ok || !res.body) { setStreaming(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let accumulated = ''

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
            if (parsed.text) { accumulated += parsed.text; setStreamText(accumulated) }
          } catch {}
        }
      }

      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: accumulated,
        tokenCount: null,
        createdAt: new Date().toISOString(),
      }])
      setStreamText('')

      const listRes = await fetch(`${API_URL}/brands/${brandId}/crystal/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (listRes.ok) setConversations((await listRes.json()).conversations ?? [])
    } catch (e: any) {
      if (e?.name !== 'AbortError') setStreamText('')
    } finally {
      setStreaming(false)
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const token = getToken()
    if (!token) return
    await fetch(`${API_URL}/brands/${brandId}/crystal/conversations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setMessages([])
      router.replace(`/${slug}/crystal`, { scroll: false })
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const activeConv = conversations.find(c => c.id === activeId)

  return (
    <div className="flex h-full overflow-hidden relative" style={{ background: 'var(--porcelain)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation list */}
      <aside
        className={[
          'flex-shrink-0 flex flex-col',
          'fixed md:relative inset-y-0 left-0 z-40 md:z-auto',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ width: '220px', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={12} style={{ color: 'var(--clay)' }} />
            <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Chat history</p>
          </div>
          <button
            onClick={handleNewChat}
            className="p-1 rounded transition-opacity hover:opacity-60"
            title="New chat"
            style={{ color: 'var(--clay)' }}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-2">
              <MessageSquare size={18} className="mx-auto" style={{ color: 'var(--border)' }} />
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>No conversations yet</p>
              <button
                onClick={handleNewChat}
                className="text-[11px] font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--clay)' }}
              >
                Start a chat →
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className="group flex items-start gap-2 px-3 py-3 cursor-pointer border-b"
                style={{
                  borderColor: 'var(--border-sub)',
                  background: conv.id === activeId ? 'var(--clay-light)' : 'transparent',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-medium truncate"
                    style={{ color: conv.id === activeId ? 'var(--clay-dim)' : 'var(--ink-2)' }}
                  >
                    {conv.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={9} style={{ color: 'var(--ink-3)' }} />
                    <p className="text-[10px]" style={{ color: 'var(--ink-3)' }}>
                      {fmtTime(conv.updatedAt)} · {conv._count.messages} msg{conv._count.messages !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={e => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded flex-shrink-0 mt-0.5 transition-opacity hover:opacity-50"
                  style={{ color: 'var(--ink-3)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 md:px-6 py-3.5"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg transition-opacity hover:opacity-60"
            style={{ color: 'var(--ink-3)' }}
          >
            <Menu size={16} />
          </button>

          <Sparkles size={14} style={{ color: 'var(--clay)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {activeConv?.title ?? 'Halite AI'}
            </p>
            {!activeConv && (
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                Full context from your brand&apos;s data
              </p>
            )}
          </div>

          {activeId && (
            <button
              onClick={handleNewChat}
              className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-75"
              style={{ background: 'var(--clay-light)', color: 'var(--clay-dim)' }}
            >
              <Plus size={11} />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
          {!activeId && !loadingConv && (
            <div className="flex flex-col items-center justify-center min-h-full text-center py-12">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--clay-light)' }}
              >
                <Sparkles size={24} style={{ color: 'var(--clay)' }} />
              </div>
              <p className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>
                Halite AI
              </p>
              <p className="text-[13px] max-w-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                Ask me anything about your consumers, products, ingredients, or brand performance. I have full context from all your data.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                {STARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-[11px] px-3 py-2.5 rounded-xl transition-colors hover:opacity-80"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingConv && (
            <div className="flex items-center justify-center gap-2 py-10">
              <Loader2 size={14} className="animate-spin" style={{ color: 'var(--clay)' }} />
              <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Loading…</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ASSISTANT' && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--clay-light)' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--clay)' }} />
                </div>
              )}
              <div
                className="max-w-[85%] md:max-w-[72%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed"
                style={msg.role === 'USER'
                  ? { background: 'var(--clay)', color: 'white', borderBottomRightRadius: '6px' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-2)', borderBottomLeftRadius: '6px' }
                }
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'var(--clay-light)' }}
              >
                <Sparkles size={12} style={{ color: 'var(--clay)' }} />
              </div>
              <div
                className="max-w-[85%] md:max-w-[72%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-2)', borderBottomLeftRadius: '6px' }}
              >
                {streamText ? (
                  <>
                    <p className="whitespace-pre-wrap">{streamText}</p>
                    <span
                      className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom animate-pulse rounded-sm"
                      style={{ background: 'var(--clay)' }}
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" style={{ color: 'var(--clay)' }} />
                    <p className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Thinking…</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-4 md:px-6 py-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{ border: '1px solid var(--border)', background: 'var(--porcelain)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                // auto-grow
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
              }}
              onKeyDown={handleKey}
              placeholder="Ask about consumers, products, ingredients, compliance…"
              rows={1}
              className="flex-1 resize-none outline-none text-[13px] leading-relaxed"
              style={{
                background: 'transparent',
                color: 'var(--ink)',
                maxHeight: '140px',
                fontFamily: 'inherit',
                minHeight: '22px',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-80"
              style={{ background: 'var(--clay)', color: 'white' }}
            >
              {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--ink-3)' }}>
            Enter to send · Shift+Enter for new line · Powered by Claude
          </p>
        </div>
      </div>
    </div>
  )
}
