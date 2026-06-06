'use client'

import { useState } from 'react'
import { Play, Loader2, FileText } from 'lucide-react'
import { DemoReportModal } from './DemoReportModal'

export function RunNowButton({
  workflowId,
  workflowType,
  workflowName,
}: {
  workflowId: string
  workflowType: string
  workflowName: string
}) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [showReport, setShowReport] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'running') return
    if (state === 'done') { setShowReport(true); return }
    setState('running')
    await new Promise(resolve => setTimeout(resolve, 2800))
    setState('done')
    setShowReport(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={state === 'running'}
        title={state === 'done' ? 'View Report' : 'Run Now'}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
        style={{ background: 'var(--clay)', color: 'white' }}
      >
        {state === 'running' ? (
          <Loader2 size={11} className="animate-spin" />
        ) : state === 'done' ? (
          <FileText size={11} />
        ) : (
          <Play size={11} />
        )}
        {state === 'running' ? 'Running…' : state === 'done' ? 'View Report' : 'Run Now'}
      </button>

      {showReport && (
        <DemoReportModal
          workflowType={workflowType}
          workflowName={workflowName}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  )
}
