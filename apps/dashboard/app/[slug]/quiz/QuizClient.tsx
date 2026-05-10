'use client'

import { useState, useRef, useCallback } from 'react'
import { LocationSearch } from '@/components/quiz/LocationSearch'
import { UnitSelect } from '@/components/quiz/UnitSelect'

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'unit_select' | 'area_select' | 'location'

interface QuizOption {
  value: string
  label: string
  description?: string
}

interface QuizQuestion {
  id: string
  area: string
  type: QuestionType
  question: string
  subtext?: string
  options?: QuizOption[]
  units?: Array<{ unit: string; label: string; options: QuizOption[] }>
  scaleMin?: string
  scaleMax?: string
  scaleSteps?: number
}

interface QuizFlow {
  areaSelector: { question: string; options: QuizOption[] } | null
  blocks: Array<{ area: string; questions: QuizQuestion[] }>
}

interface BrandInfo {
  id: string
  name: string
  focusAreas: string[]
  logoUrl?: string
  primaryColor?: string
}

interface LocationData {
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  timezone: string
  currency: string
}

type Phase = 'intro' | 'starting' | 'area_select' | 'questions' | 'submitting' | 'done' | 'error'

function flattenFlow(flow: QuizFlow): QuizQuestion[] {
  return flow.blocks.flatMap((b) => b.questions)
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuizClient({ brand, slug }: { brand: BrandInfo; slug: string }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  const [phase, setPhase] = useState<Phase>('intro')
  const [brandId, setBrandId] = useState(brand.id)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [flatQuestions, setFlatQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [areaSelector, setAreaSelector] = useState<{ question: string; options: QuizOption[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saveRef = useRef<Promise<void>>(Promise.resolve())

  async function handleStart() {
    setPhase('starting')
    try {
      const tokenRes = await fetch(`${apiUrl}/brands/slug/${slug}/quiz/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!tokenRes.ok) throw new Error('Failed to initialize quiz')
      const { token, brandId: bid } = (await tokenRes.json()) as { token: string; brandId: string }

      const [flowRes, sessionRes] = await Promise.all([
        fetch(`${apiUrl}/brands/${bid}/quiz/questions`),
        fetch(`${apiUrl}/brands/${bid}/quiz/sessions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: '{}',
        }),
      ])

      if (!flowRes.ok || !sessionRes.ok) throw new Error('Failed to start quiz')

      const { flow } = (await flowRes.json()) as { flow: QuizFlow }
      const { sessionId: sid } = (await sessionRes.json()) as { sessionId: string }

      setUserToken(token)
      setBrandId(bid)
      setSessionId(sid)

      if (flow.areaSelector && brand.focusAreas.length > 1) {
        setAreaSelector(flow.areaSelector)
        setPhase('area_select')
      } else {
        setFlatQuestions(flattenFlow(flow))
        setPhase('questions')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  async function handleAreaSubmit(areas: string[]) {
    setSelectedAreas(areas)
    try {
      const [, flowRes] = await Promise.all([
        fetch(`${apiUrl}/brands/${brandId}/quiz/sessions/${sessionId}/areas`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ areas }),
        }),
        fetch(`${apiUrl}/brands/${brandId}/quiz/questions?selectedAreas=${areas.join(',')}`),
      ])

      const { flow } = (await flowRes.json()) as { flow: QuizFlow }
      setFlatQuestions(flattenFlow(flow))
      setCurrentIndex(0)
      setPhase('questions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  const saveAnswers = useCallback(
    (newAnswers: Record<string, unknown>) => {
      const p = saveRef.current.then(async () => {
        try {
          const res = await fetch(
            `${apiUrl}/brands/${brandId}/quiz/sessions/${sessionId}/answers`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(newAnswers),
            }
          )
          if (res.ok) {
            const data = (await res.json()) as { updatedFlow?: QuizFlow }
            if (data.updatedFlow) {
              const updatedMap = new Map(flattenFlow(data.updatedFlow).map((q) => [q.id, q]))
              setFlatQuestions((prev) => prev.map((q) => updatedMap.get(q.id) ?? q))
            }
          }
        } catch {
          /* fire-and-forget */
        }
      })
      saveRef.current = p
    },
    [apiUrl, brandId, sessionId, userToken]
  )

  function advance() {
    setCurrentIndex((i) => {
      if (i < flatQuestions.length - 1) return i + 1
      handleComplete()
      return i
    })
  }

  function handleAnswer(questionId: string, value: unknown, autoAdvance = false) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    saveAnswers({ [questionId]: value })

    if (questionId === 'SH2A') {
      fetch(
        `${apiUrl}/brands/${brandId}/quiz/questions?` +
          new URLSearchParams({
            ...(selectedAreas.length ? { selectedAreas: selectedAreas.join(',') } : {}),
            routineFormat: value as string,
          })
      )
        .then((r) => r.json())
        .then(({ flow }: { flow: QuizFlow }) => {
          const updatedMap = new Map(flattenFlow(flow).map((q) => [q.id, q]))
          setFlatQuestions((prev) => prev.map((q) => updatedMap.get(q.id) ?? q))
        })
        .catch(() => {})
    }

    if (autoAdvance) setTimeout(advance, 200)
  }

  function handleLocationAnswer(location: LocationData, climateTag: string, climateSnapshot: unknown) {
    const partial = {
      SH1_location: location,
      SH1_climate: { climateTag, ...((climateSnapshot as object) ?? {}) },
      SH1_currency: location.currency,
    }
    setAnswers((prev) => ({ ...prev, ...partial }))
    saveAnswers(partial)
    advance()
  }

  async function handleComplete() {
    setPhase('submitting')
    try {
      await fetch(`${apiUrl}/brands/${brandId}/quiz/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  const totalQuestions = flatQuestions.length
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0
  const currentQuestion = flatQuestions[currentIndex]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Progress bar */}
      {phase === 'questions' && (
        <div className="h-0.5" style={{ background: 'var(--border)' }}>
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">

          {/* ── Intro ── */}
          {phase === 'intro' && (
            <div className="text-center space-y-10">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="h-9 mx-auto object-contain" />
              ) : (
                <p
                  className="text-[10px] font-semibold tracking-[0.22em] uppercase"
                  style={{ color: 'var(--text-3)' }}
                >
                  {brand.name}
                </p>
              )}
              <div className="space-y-4">
                <h1 className="font-display text-4xl leading-tight" style={{ color: 'var(--text-1)' }}>
                  Your personalized routine starts here
                </h1>
                <p className="text-base leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Answer a few questions and we'll match you with products made for your skin,
                  hair, and lifestyle.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleStart}
                  className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--text-1)' }}
                >
                  Get started
                </button>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Takes about 3 minutes</p>
              </div>
            </div>
          )}

          {/* ── Starting ── */}
          {phase === 'starting' && (
            <div className="text-center space-y-4">
              <Spinner />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Setting things up…</p>
            </div>
          )}

          {/* ── Area selector ── */}
          {phase === 'area_select' && areaSelector && (
            <AreaSelectStep
              question={areaSelector.question}
              options={areaSelector.options}
              brandFocusAreas={brand.focusAreas}
              onSubmit={handleAreaSubmit}
            />
          )}

          {/* ── Questions ── */}
          {phase === 'questions' && currentQuestion && (
            <QuestionStep
              key={`${currentQuestion.id}-${currentIndex}`}
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              locationAnswer={answers['SH1_location'] as LocationData | undefined}
              apiUrl={apiUrl}
              onAnswer={handleAnswer}
              onLocationAnswer={handleLocationAnswer}
              onContinue={advance}
              onBack={currentIndex > 0 ? () => setCurrentIndex((i) => i - 1) : undefined}
              isLast={currentIndex === totalQuestions - 1}
              stepLabel={`${currentIndex + 1} of ${totalQuestions}`}
            />
          )}

          {/* ── Submitting ── */}
          {phase === 'submitting' && (
            <div className="text-center space-y-5">
              <Spinner />
              <h2 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>
                Building your routine…
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Our AI is matching products to your profile
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="text-center space-y-7">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'var(--bg-muted)' }}
              >
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-3xl" style={{ color: 'var(--text-1)' }}>You're all set</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Your personalized routine is being prepared. Check back shortly — your
                  recommendations will be ready soon.
                </p>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="text-center space-y-6">
              <h2 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>
                Something went wrong
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>{error}</p>
              <button
                onClick={() => { setPhase('intro'); setError(null) }}
                className="px-8 py-3 rounded-xl text-sm font-medium text-white"
                style={{ background: 'var(--text-1)' }}
              >
                Try again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mx-auto"
      style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}
    >
      <div className="sr-only">Loading</div>
    </div>
  )
}

// ── Area selector step ────────────────────────────────────────────────────────

function AreaSelectStep({
  question,
  options,
  brandFocusAreas,
  onSubmit,
}: {
  question: string
  options: QuizOption[]
  brandFocusAreas: string[]
  onSubmit: (areas: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>(
    brandFocusAreas.length === 1 ? brandFocusAreas : []
  )

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-snug" style={{ color: 'var(--text-1)' }}>
          {question}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Select all that apply</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="px-4 py-4 rounded-2xl border text-left text-sm font-medium transition-all"
              style={{
                borderColor: active ? '#f09118' : 'var(--border)',
                background: active ? '#fef9ee' : 'white',
                color: 'var(--text-1)',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <Btn
        onClick={() => onSubmit(selected.length ? selected : brandFocusAreas)}
        disabled={selected.length === 0}
      >
        Continue
      </Btn>
    </div>
  )
}

// ── Question step ─────────────────────────────────────────────────────────────

function QuestionStep({
  question,
  answer,
  locationAnswer,
  apiUrl,
  onAnswer,
  onLocationAnswer,
  onContinue,
  onBack,
  isLast: _isLast,
  stepLabel,
}: {
  question: QuizQuestion
  answer: unknown
  locationAnswer?: LocationData
  apiUrl: string
  onAnswer: (questionId: string, value: unknown, autoAdvance?: boolean) => void
  onLocationAnswer: (location: LocationData, climateTag: string, climateSnapshot: unknown) => void
  onContinue: () => void
  onBack?: () => void
  isLast: boolean
  stepLabel: string
}) {
  return (
    <div className="space-y-8">
      {/* Step counter + back */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#f5f0eb]"
            style={{ color: 'var(--text-3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : <div />}
        <span className="text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>{stepLabel}</span>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <h2
          className="font-display text-2xl leading-snug"
          style={{ color: 'var(--text-1)' }}
        >
          {question.question}
        </h2>
        {question.subtext && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
            {question.subtext}
          </p>
        )}
      </div>

      {/* Inputs */}
      {question.type === 'single' && question.options && (
        <SingleChoice
          options={question.options}
          value={answer as string | undefined}
          onSelect={(v) => onAnswer(question.id, v, true)}
        />
      )}

      {question.type === 'multi' && question.options && (
        <MultiChoice
          options={question.options}
          value={(answer as string[] | undefined) ?? []}
          onChange={(v) => onAnswer(question.id, v, false)}
          onContinue={onContinue}
        />
      )}

      {question.type === 'scale' && (
        <ScaleInput
          steps={question.scaleSteps ?? 5}
          min={question.scaleMin ?? ''}
          max={question.scaleMax ?? ''}
          value={answer as string | undefined}
          onSelect={(v) => onAnswer(question.id, v, true)}
        />
      )}

      {question.type === 'location' && (
        <LocationSearch
          apiUrl={apiUrl}
          initialValue={locationAnswer}
          onConfirm={onLocationAnswer}
        />
      )}

      {question.type === 'unit_select' && question.units && (
        <UnitSelect
          units={question.units}
          value={answer as string | undefined}
          onConfirm={(v) => { onAnswer(question.id, v, false); onContinue() }}
        />
      )}
    </div>
  )
}

// ── Single choice ─────────────────────────────────────────────────────────────

function SingleChoice({
  options,
  value,
  onSelect,
}: {
  options: QuizOption[]
  value?: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className="w-full text-left px-5 py-4 rounded-2xl border transition-all"
            style={{
              borderColor: active ? '#f09118' : 'var(--border)',
              background: active ? '#fef9ee' : 'white',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                style={{
                  borderColor: active ? '#f09118' : 'var(--border)',
                  background: active ? '#f09118' : 'transparent',
                }}
              >
                {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{opt.label}</p>
                {opt.description && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{opt.description}</p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Multi choice ──────────────────────────────────────────────────────────────

function MultiChoice({
  options,
  value,
  onChange,
  onContinue,
}: {
  options: QuizOption[]
  value: string[]
  onChange: (v: string[]) => void
  onContinue: () => void
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((opt) => {
          const checked = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="w-full text-left px-5 py-4 rounded-2xl border transition-all"
              style={{
                borderColor: checked ? '#f09118' : 'var(--border)',
                background: checked ? '#fef9ee' : 'white',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: checked ? '#f09118' : 'var(--border)',
                    background: checked ? '#f09118' : 'transparent',
                  }}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{opt.label}</span>
              </div>
            </button>
          )
        })}
      </div>
      <Btn onClick={onContinue} disabled={value.length === 0}>
        Continue{value.length > 0 ? ` · ${value.length} selected` : ''}
      </Btn>
    </div>
  )
}

// ── Scale input ───────────────────────────────────────────────────────────────

function ScaleInput({
  steps,
  min,
  max,
  value,
  onSelect,
}: {
  steps: number
  min: string
  max: string
  value?: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        {Array.from({ length: steps }, (_, i) => i + 1).map((n) => {
          const active = value === String(n)
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(String(n))}
              className="flex-1 aspect-square rounded-2xl border-2 text-sm font-semibold transition-all"
              style={{
                borderColor: active ? '#f09118' : 'var(--border)',
                background: active ? '#f09118' : 'white',
                color: active ? 'white' : 'var(--text-1)',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      {(min || max) && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}

// ── Shared button ─────────────────────────────────────────────────────────────

function Btn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
      style={{ background: 'var(--text-1)' }}
    >
      {children}
    </button>
  )
}
