'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function RunNowButton({ workflowId }: { workflowId: string }) {
  const [running, setRunning] = useState(false)
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (running) return
    setRunning(true)
    try {
      const token = document.cookie.match(/halite_token=([^;]+)/)?.[1]
      if (!token) return
      const brandId = (JSON.parse(atob(token.split('.')[1])) as { brandId: string }).brandId
      await fetch(`${API_URL}/brands/${brandId}/agents/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      router.push(`/${slug}/agents/${workflowId}`)
    } catch {
      setRunning(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={running}
      title="Run Now"
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
      style={{ background: 'var(--clay)', color: 'white' }}
    >
      {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
      {running ? 'Starting…' : 'Run Now'}
    </button>
  )
}
