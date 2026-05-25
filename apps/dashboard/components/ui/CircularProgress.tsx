'use client'

import { useEffect, useRef, useState } from 'react'

// Fixed internal coordinate system
const CX = 60
const CY = 60
const R = 50
const SW = 8
const CIRC = 2 * Math.PI * R // ≈ 314.16

const STEPS = [
  { at: 0,  label: 'Setting up brand environment' },
  { at: 18, label: 'Ingesting product catalog' },
  { at: 35, label: 'Generating consumer profiles' },
  { at: 55, label: 'Building skincare routines' },
  { at: 72, label: 'Simulating check-in history' },
  { at: 87, label: 'Finalising demo environment' },
]

interface Props {
  /** Jump straight to 100 % when true (generation complete) */
  done?: boolean
  /** Rendered px size of the SVG — internal viewBox is always 120×120 */
  size?: number
  /** Unix-ms timestamp when generation started — used to seed elapsed time */
  startTime?: number
  /** Show the step label below the ring */
  showLabel?: boolean
}

export function CircularProgress({ done = false, size = 120, startTime, showLabel = true }: Props) {
  const originRef = useRef(startTime ?? Date.now())
  const [pct, setPct] = useState(0)

  useEffect(() => {
    if (done) {
      setPct(100)
      return
    }

    const tick = () => {
      const elapsed = (Date.now() - originRef.current) / 1000
      // Exponential ease that asymptotes to 89 % — snaps to 100 only when done=true
      const simulated = 89 * (1 - Math.exp(-elapsed / 100))
      setPct(Math.min(89, Math.round(simulated)))
    }

    tick()
    const id = setInterval(tick, 600)
    return () => clearInterval(id)
  }, [done])

  const offset = CIRC * (1 - pct / 100)
  const step = [...STEPS].reverse().find(s => pct >= s.at) ?? STEPS[0]!

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        aria-label={`${pct}% complete`}
      >
        {/* Track ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth={SW}
        />
        {/* Progress arc — starts at 12 o'clock */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="var(--clay)"
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Percentage text */}
        <text
          x={CX} y={CY - 6}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize="20"
          fontWeight="700"
          fill="var(--ink)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {pct}%
        </text>
        <text
          x={CX} y={CY + 12}
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize="9"
          fill="var(--ink-3)"
          letterSpacing="0.05em"
        >
          COMPLETE
        </text>
      </svg>

      {showLabel && (
        <p
          className="text-[12px] text-center max-w-[160px]"
          style={{ color: 'var(--ink-3)' }}
        >
          {done ? 'Done!' : `${step.label}…`}
        </p>
      )}
    </div>
  )
}
