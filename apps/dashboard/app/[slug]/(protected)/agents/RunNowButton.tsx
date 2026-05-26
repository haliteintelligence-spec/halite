'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)halite_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]!) : null
}

export function RunNowButton({ workflowId, onDone }: { workflowId: string; onDone?: () => void }) {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (running) return

    const token = getToken()
    if (!token) return
    const brandId = (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId

    setRunning(true)
    setDone(false)
    try {
      await fetch(`${API_URL}/brands/${brandId}/agents/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setDone(true)
      onDone?.()
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={running}
      title="Run Now"
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
      style={{ background: done ? 'var(--sage-light, #e8f4ec)' : 'var(--clay)', color: done ? '#1a7a3c' : 'white' }}
    >
      {running
        ? <Loader2 size={11} className="animate-spin" />
        : <Play size={11} />}
      {running ? 'Running…' : done ? 'Queued' : 'Run Now'}
    </button>
  )
}
