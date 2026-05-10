'use client'

interface Segment {
  label: string
  value: number
  tone: 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi'
}

const TONES: Record<string, string> = {
  i:   'var(--melanin-i)',
  ii:  'var(--melanin-ii)',
  iii: 'var(--melanin-iii)',
  iv:  'var(--melanin-iv)',
  v:   'var(--melanin-v)',
  vi:  'var(--melanin-vi)',
}

interface Props {
  data: Segment[]
  showLabels?: boolean
  height?: number
}

export function SkinToneBar({ data, showLabels = true, height = 10 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="w-full space-y-2">
      <div className="flex rounded-full overflow-hidden gap-px" style={{ height }}>
        {data.map(seg => (
          <div
            key={seg.tone}
            style={{
              width: `${(seg.value / total) * 100}%`,
              background: TONES[seg.tone],
            }}
            title={`${seg.label}: ${seg.value}%`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {data.map(seg => (
            <div key={seg.tone} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: TONES[seg.tone] }}
              />
              <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                {seg.label} <span style={{ color: 'var(--ink-2)' }}>{seg.value}%</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface SkinToneGridProps {
  data: Array<{ tone: string; label: string; count: number; pct: number; engagement: number }>
}

export function SkinToneGrid({ data }: SkinToneGridProps) {
  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <div className="grid grid-cols-6 gap-2">
      {data.map(row => (
        <div key={row.tone} className="flex flex-col items-center gap-1.5">
          <div
            className="w-full rounded-lg relative overflow-hidden"
            style={{ height: 64, background: 'var(--porcelain-2)' }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all"
              style={{
                height: `${(row.count / maxCount) * 100}%`,
                background: TONES[row.tone] ?? '#ccc',
                opacity: 0.85,
              }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {row.pct}%
          </span>
        </div>
      ))}
    </div>
  )
}
