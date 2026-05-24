import Link from 'next/link'
import { getAgentWorkflows } from '@/lib/api'
import { Bot, Plus, Play, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

const TYPE_LABELS: Record<string, string> = {
  ROUTINE_OUTCOME:       'Routine Outcomes',
  CHURN_PREDICTION:      'Churn Prediction',
  PRODUCT_INTELLIGENCE:  'Product Intelligence',
  CONVERSION:            'Conversion',
  EXECUTIVE_INTELLIGENCE:'Executive Summary',
  CUSTOM:                'Custom',
}

export default async function AgentsPage({ params }: Props) {
  const { slug } = await params
  const workflows = await getAgentWorkflows()

  const prebuilt = workflows.filter(w => w.isPrebuilt)
  const custom = workflows.filter(w => !w.isPrebuilt)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: 'var(--ink)' }}>
            Agent Workflows
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
            AI-powered intelligence agents running on your brand data
          </p>
        </div>
        <Link
          href={`/${slug}/agents/new`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--clay)' }}
        >
          <Plus size={14} />
          New Agent
        </Link>
      </div>

      {prebuilt.length > 0 && (
        <section className="mb-8">
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3 px-1" style={{ color: 'var(--ink-3)' }}>
            Pre-built Workflows
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {prebuilt.map(w => (
              <WorkflowCard key={w.id} workflow={w} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {custom.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold tracking-wide uppercase mb-3 px-1" style={{ color: 'var(--ink-3)' }}>
            Custom Workflows
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {custom.map(w => (
              <WorkflowCard key={w.id} workflow={w} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {workflows.length === 0 && (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Bot size={24} className="mx-auto mb-3" style={{ color: 'var(--ink-3)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No agents yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-3)' }}>
            Create your first AI agent to start generating insights.
          </p>
          <Link
            href={`/${slug}/agents/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--clay)' }}
          >
            <Plus size={14} /> Create Agent
          </Link>
        </div>
      )}
    </div>
  )
}

function WorkflowCard({ workflow, slug }: { workflow: ReturnType<typeof getAgentWorkflows> extends Promise<(infer T)[]> ? T : never; slug: string }) {
  const lastRun = workflow.runs[0]
  const typeLabel = TYPE_LABELS[workflow.type] ?? workflow.type

  return (
    <Link
      href={`/${slug}/agents/${workflow.id}`}
      className="block rounded-xl p-4 transition-all hover:shadow-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{workflow.name}</p>
          {workflow.description && (
            <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'var(--ink-3)' }}>
              {workflow.description}
            </p>
          )}
        </div>
        {workflow.isPrebuilt && (
          <span
            className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--clay)', color: 'white' }}
          >
            BUILT-IN
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--sand-1)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}
        >
          {typeLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {lastRun ? (
            <RunStatusIcon status={lastRun.status} />
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Never run</span>
          )}
          <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
            {workflow._count.runs} run{workflow._count.runs !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}

function RunStatusIcon({ status }: { status: string }) {
  if (status === 'DONE') return <CheckCircle2 size={12} style={{ color: '#1a7a3c' }} />
  if (status === 'FAILED') return <AlertCircle size={12} style={{ color: '#e57373' }} />
  if (status === 'RUNNING') return <Loader2 size={12} className="animate-spin" style={{ color: 'var(--clay)' }} />
  return <Clock size={12} style={{ color: 'var(--ink-3)' }} />
}
