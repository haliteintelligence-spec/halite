'use client'

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: number[]
  color?: string
  height?: number
  showTooltip?: boolean
}

export function Sparkline({ data, color = 'var(--clay)', height = 40, showTooltip = false }: Props) {
  const points = data.map((v, i) => ({ v, i }))
  const min = Math.min(...data)
  const max = Math.max(...data)
  const trend = data[data.length - 1] > data[0]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showTooltip && (
          <Tooltip
            content={({ payload }) =>
              payload?.[0] ? (
                <div className="bg-ink text-white text-[11px] px-2 py-1 rounded shadow-lg">
                  {payload[0].value}
                </div>
              ) : null
            }
          />
        )}
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sg-${color.replace(/[^a-z]/gi, '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface TrendBadgeProps {
  current: number
  previous: number
  suffix?: string
}

export function TrendBadge({ current, previous, suffix = '%' }: TrendBadgeProps) {
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const up = delta >= 0
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded"
      style={{
        background: up ? 'var(--sage-light)' : 'var(--blush-light)',
        color: up ? 'var(--sage)' : 'var(--blush)',
      }}
    >
      {up ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}{suffix}
    </span>
  )
}
