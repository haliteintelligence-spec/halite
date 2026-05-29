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

interface ContactInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface LookupResult {
  found: boolean
  firstName?: string | null
  completedAreas?: string[]
  brandCount?: number
  prefillToken?: string
}

type Phase =
  | 'intro'
  | 'contact'
  | 'lookup'
  | 'returning'
  | 'starting'
  | 'area_select'
  | 'questions'
  | 'submitting'
  | 'done'
  | 'routine'
  | 'error'

interface RoutineStep {
  id: string
  timeOfDay: string
  step: number
  instruction?: string
  product: {
    id: string
    name: string
    category: string
    description?: string
    price: number
    currency: string
    imageUrl?: string
    productUrl?: string
    keyIngredients?: string[]
  }
}

interface Routine {
  id: string
  focusArea: string
  rationale?: string
  steps: RoutineStep[]
}

// Shared question IDs (not area-specific — skip if already answered in prefill)
const SHARED_QUESTION_IDS = new Set(['SH0', 'SH1', 'SH2A', 'SH2B', 'SH3', 'SH4', 'SH5', 'SH6'])

function filterQuestionsForPrefill(
  questions: QuizQuestion[],
  completedAreas: string[],
  prefillAnswers: Record<string, unknown>,
): QuizQuestion[] {
  const doneAreas = new Set(completedAreas)
  return questions.filter(q => {
    // Keep questions for brand focus areas that aren't yet completed
    if (!doneAreas.has(q.area)) return true
    // For shared questions: keep if not already answered in prefill
    if (SHARED_QUESTION_IDS.has(q.id) && prefillAnswers[q.id] === undefined) return true
    return false
  })
}

function flattenFlow(flow: QuizFlow): QuizQuestion[] {
  return flow.blocks.flatMap((b) => b.questions)
}

function fmtArea(a: string) {
  return a.charAt(0) + a.slice(1).toLowerCase().replace(/_/g, ' ')
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
  const [routine, setRoutine] = useState<Routine | null>(null)

  // Contact & returning-consumer state
  const [contact, setContact] = useState<ContactInfo>({ firstName: '', lastName: '', email: '', phone: '' })
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [prefillAnswers, setPrefillAnswers] = useState<Record<string, unknown>>({})
  const [completedAreas, setCompletedAreas] = useState<string[]>([])

  const saveRef = useRef<Promise<void>>(Promise.resolve())
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Contact step → lookup ────────────────────────────────────────────

  async function handleContactSubmit() {
    setPhase('lookup')
    try {
      const contactId = contact.email || contact.phone
      if (!contactId) throw new Error('No contact provided')

      const params = new URLSearchParams()
      if (contact.email) params.set('email', contact.email)
      if (contact.phone) params.set('phone', contact.phone)

      const res = await fetch(`${apiUrl}/brands/slug/${slug}/quiz/lookup?${params}`)
      if (!res.ok) throw new Error('Lookup failed')

      const result: LookupResult = await res.json()
      setLookupResult(result)

      if (result.found && result.prefillToken && (result.completedAreas?.length ?? 0) > 0) {
        // Check if any of the consumer's completed areas overlap with this brand's focus areas
        const overlap = (result.completedAreas ?? []).filter(a => brand.focusAreas.includes(a))
        if (overlap.length > 0) {
          setPhase('returning')
          return
        }
      }

      // No relevant prior profile — go straight to quiz
      await handleStart(null)
    } catch {
      // Lookup failed — proceed without pre-fill
      await handleStart(null)
    }
  }

  // ── Returning user accepted pre-fill ────────────────────────────────

  async function handleAcceptPrefill() {
    if (!lookupResult?.prefillToken) return
    try {
      const res = await fetch(`${apiUrl}/brands/slug/${slug}/quiz/prefill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefillToken: lookupResult.prefillToken }),
      })
      if (!res.ok) throw new Error('Prefill failed')
      const data = await res.json() as { prefillAnswers: Record<string, unknown>; completedAreas: string[]; firstName?: string | null; lastName?: string | null }
      setPrefillAnswers(data.prefillAnswers)
      setCompletedAreas(data.completedAreas)
      // Merge prefilled name if we don't have one
      if (data.firstName && !contact.firstName) {
        setContact(c => ({ ...c, firstName: data.firstName!, lastName: data.lastName ?? c.lastName }))
      }
      await handleStart(data.prefillAnswers, data.completedAreas)
    } catch {
      await handleStart(null)
    }
  }

  async function handleDeclinePrefill() {
    setPrefillAnswers({})
    setCompletedAreas([])
    await handleStart(null)
  }

  // ── Core start ───────────────────────────────────────────────────────

  async function handleStart(
    existingAnswers: Record<string, unknown> | null,
    existingAreas: string[] = [],
  ) {
    setPhase('starting')
    try {
      // Get end-user token — pass contact info and consumerId if returning
      const tokenBody: Record<string, string> = {}
      if (contact.email) tokenBody.email = contact.email
      if (contact.phone) tokenBody.phone = contact.phone
      if (contact.firstName) tokenBody.firstName = contact.firstName
      if (contact.lastName) tokenBody.lastName = contact.lastName

      const tokenRes = await fetch(`${apiUrl}/brands/slug/${slug}/quiz/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenBody),
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

      // Persist session so the check-in page can reuse it without re-auth
      try {
        localStorage.setItem('halite_session', JSON.stringify({
          token, brandId: bid, expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
        }))
      } catch { /* ignore — private browsing */ }

      // Seed session with pre-filled answers before showing questions
      if (existingAnswers && Object.keys(existingAnswers).length > 0) {
        setAnswers(existingAnswers)
        // Fire-and-forget — seed the server session so routine generation has all data
        fetch(`${apiUrl}/brands/${bid}/quiz/sessions/${sid}/answers`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(existingAnswers),
        }).catch(() => {})
      }

      if (flow.areaSelector && brand.focusAreas.length > 1) {
        // Filter area selector to only show new areas if returning
        if (existingAreas.length > 0) {
          const newAreas = flow.areaSelector.options.filter(o => !existingAreas.includes(o.value))
          if (newAreas.length === 0) {
            // All areas already done — skip straight to complete
            await completeWithPrefill(token, bid, sid, existingAnswers ?? {})
            return
          }
          if (newAreas.length < flow.areaSelector.options.length) {
            setAreaSelector({ ...flow.areaSelector, options: newAreas })
            setPhase('area_select')
            return
          }
        }
        setAreaSelector(flow.areaSelector)
        setPhase('area_select')
      } else {
        let questions = flattenFlow(flow)
        if (existingAnswers && existingAreas.length > 0) {
          questions = filterQuestionsForPrefill(questions, existingAreas, existingAnswers)
        }
        if (questions.length === 0) {
          await completeWithPrefill(token, bid, sid, existingAnswers ?? {})
          return
        }
        setFlatQuestions(questions)
        setPhase('questions')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  // When all areas are already complete, submit immediately using prefill answers
  async function completeWithPrefill(
    token: string, bid: string, sid: string, answers: Record<string, unknown>,
  ) {
    setPhase('submitting')
    try {
      await fetch(`${apiUrl}/brands/${bid}/quiz/sessions/${sid}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      setPhase('done')
      pollForRoutine(token, bid, 0)
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
      let questions = flattenFlow(flow)
      if (completedAreas.length > 0 && Object.keys(prefillAnswers).length > 0) {
        questions = filterQuestionsForPrefill(questions, completedAreas, prefillAnswers)
      }
      setCurrentIndex(0)
      setFlatQuestions(questions)
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
        } catch { /* fire-and-forget */ }
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
      pollForRoutine(userToken!, brandId, 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setPhase('error')
    }
  }

  function pollForRoutine(token: string, bid: string, attempts: number) {
    if (attempts > 20) return
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/brands/${bid}/me/routine`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { routine: r } = await res.json() as { routine: Routine }
          if (r?.steps?.length > 0) {
            setRoutine(r)
            setPhase('routine')
            return
          }
        }
      } catch {}
      pollForRoutine(token, bid, attempts + 1)
    }, 2000)
  }

  const totalQuestions = flatQuestions.length
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0
  const currentQuestion = flatQuestions[currentIndex]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {phase === 'questions' && (
        <div className="h-0.5" style={{ background: 'var(--border)' }}>
          <div className="h-full bg-amber-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
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
                <p className="text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: 'var(--text-3)' }}>
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
                  onClick={() => setPhase('contact')}
                  className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--text-1)' }}
                >
                  Get started
                </button>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Takes about 3 minutes</p>
              </div>
            </div>
          )}

          {/* ── Contact ── */}
          {phase === 'contact' && (
            <ContactStep
              value={contact}
              onChange={setContact}
              onSubmit={handleContactSubmit}
            />
          )}

          {/* ── Lookup spinner ── */}
          {phase === 'lookup' && (
            <div className="text-center space-y-4">
              <Spinner />
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Checking your profile…</p>
            </div>
          )}

          {/* ── Returning consumer ── */}
          {phase === 'returning' && lookupResult && (
            <ReturningStep
              firstName={lookupResult.firstName ?? contact.firstName ?? null}
              completedAreas={lookupResult.completedAreas ?? []}
              brandFocusAreas={brand.focusAreas}
              brandCount={lookupResult.brandCount ?? 1}
              onAccept={handleAcceptPrefill}
              onDecline={handleDeclinePrefill}
            />
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

          {/* ── Done (polling) ── */}
          {phase === 'done' && (
            <div className="text-center space-y-6">
              <Spinner />
              <div className="space-y-2">
                <h2 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>
                  Building your routine…
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Our AI is matching products to your skin profile
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: 'var(--text-3)', animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Routine ── */}
          {phase === 'routine' && routine && (
            <RoutineDisplay routine={routine} brand={brand} firstName={contact.firstName || null} />
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="text-center space-y-6">
              <h2 className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Something went wrong</h2>
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

// ── Contact step ──────────────────────────────────────────────────────────────

function ContactStep({
  value,
  onChange,
  onSubmit,
}: {
  value: ContactInfo
  onChange: (v: ContactInfo) => void
  onSubmit: () => void
}) {
  const canSubmit = value.firstName.trim().length > 0 && (value.email.trim().length > 0 || value.phone.trim().length > 0)

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-snug" style={{ color: 'var(--text-1)' }}>
          Let's get to know you
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          If you've taken a quiz with another brand, we can pre-fill your results.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--text-3)' }}>
              First name <span style={{ color: '#f09118' }}>*</span>
            </label>
            <input
              type="text"
              value={value.firstName}
              onChange={e => onChange({ ...value, firstName: e.target.value })}
              placeholder="Sofia"
              autoComplete="given-name"
              className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all"
              style={{ borderColor: 'var(--border)', background: 'white', color: 'var(--text-1)' }}
              onFocus={e => (e.target.style.borderColor = '#f09118')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--text-3)' }}>
              Last name
            </label>
            <input
              type="text"
              value={value.lastName}
              onChange={e => onChange({ ...value, lastName: e.target.value })}
              placeholder="Osei"
              autoComplete="family-name"
              className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all"
              style={{ borderColor: 'var(--border)', background: 'white', color: 'var(--text-1)' }}
              onFocus={e => (e.target.style.borderColor = '#f09118')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--text-3)' }}>
            Email address <span className="text-[9px] font-normal normal-case" style={{ color: 'var(--text-3)' }}>or phone below</span>
          </label>
          <input
            type="email"
            value={value.email}
            onChange={e => onChange({ ...value, email: e.target.value })}
            placeholder="sofia@example.com"
            autoComplete="email"
            className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all"
            style={{ borderColor: 'var(--border)', background: 'white', color: 'var(--text-1)' }}
            onFocus={e => (e.target.style.borderColor = '#f09118')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wide uppercase mb-1.5" style={{ color: 'var(--text-3)' }}>
            Phone number <span className="text-[9px] font-normal normal-case" style={{ color: 'var(--text-3)' }}>optional if email given</span>
          </label>
          <input
            type="tel"
            value={value.phone}
            onChange={e => onChange({ ...value, phone: e.target.value })}
            placeholder="+1 555 000 0000"
            autoComplete="tel"
            className="w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all"
            style={{ borderColor: 'var(--border)', background: 'white', color: 'var(--text-1)' }}
            onFocus={e => (e.target.style.borderColor = '#f09118')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Btn onClick={onSubmit} disabled={!canSubmit}>Continue</Btn>
        <p className="text-[11px] text-center" style={{ color: 'var(--text-3)' }}>
          Your information is private and never sold.
        </p>
      </div>
    </div>
  )
}

// ── Returning consumer step ───────────────────────────────────────────────────

function ReturningStep({
  firstName,
  completedAreas,
  brandFocusAreas,
  brandCount,
  onAccept,
  onDecline,
}: {
  firstName: string | null
  completedAreas: string[]
  brandFocusAreas: string[]
  brandCount: number
  onAccept: () => void
  onDecline: () => void
}) {
  const [loading, setLoading] = useState(false)

  const overlap = completedAreas.filter(a => brandFocusAreas.includes(a))
  const newAreas = brandFocusAreas.filter(a => !completedAreas.includes(a))

  async function accept() {
    setLoading(true)
    await onAccept()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-3xl leading-snug" style={{ color: 'var(--text-1)' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}!
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          We found your beauty profile from{' '}
          {brandCount === 1 ? 'another brand' : `${brandCount} other brands`} on Halite.
          Want to bring it here?
        </p>
      </div>

      {/* What we already know */}
      {overlap.length > 0 && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#fef9ee', border: '1px solid #fde68a' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#92400e' }}>
            Already completed
          </p>
          <div className="flex flex-wrap gap-2">
            {overlap.map(a => (
              <span key={a} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#f59e0b', color: '#fff' }}>
                {fmtArea(a)}
              </span>
            ))}
          </div>
          {newAreas.length > 0 && (
            <p className="text-[11px]" style={{ color: '#92400e' }}>
              We'll only ask you about {newAreas.map(fmtArea).join(' & ')} — everything else is already saved.
            </p>
          )}
          {newAreas.length === 0 && (
            <p className="text-[11px]" style={{ color: '#92400e' }}>
              Your profile covers all areas for this brand — we'll build your routine straight away.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        <button
          onClick={accept}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'var(--text-1)' }}
        >
          {loading ? 'Loading your profile…' : 'Yes, use my profile'}
        </button>
        <button
          onClick={onDecline}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}
        >
          Start fresh instead
        </button>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mx-auto"
      style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }}>
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
    setSelected((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-snug" style={{ color: 'var(--text-1)' }}>{question}</h2>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Select all that apply</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value)
          return (
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
              className="px-4 py-4 rounded-2xl border text-left text-sm font-medium transition-all"
              style={{ borderColor: active ? '#f09118' : 'var(--border)', background: active ? '#fef9ee' : 'white', color: 'var(--text-1)' }}>
              {opt.label}
            </button>
          )
        })}
      </div>
      <Btn onClick={() => onSubmit(selected.length ? selected : brandFocusAreas)} disabled={selected.length === 0}>
        Continue
      </Btn>
    </div>
  )
}

// ── Question step ─────────────────────────────────────────────────────────────

function QuestionStep({
  question, answer, locationAnswer, apiUrl,
  onAnswer, onLocationAnswer, onContinue, onBack, isLast: _isLast, stepLabel,
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
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#f5f0eb]"
            style={{ color: 'var(--text-3)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : <div />}
        <span className="text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>{stepLabel}</span>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl leading-snug" style={{ color: 'var(--text-1)' }}>
          {question.question}
        </h2>
        {question.subtext && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>{question.subtext}</p>
        )}
      </div>

      {question.type === 'single' && question.options && (
        <SingleChoice options={question.options} value={answer as string | undefined}
          onSelect={(v) => onAnswer(question.id, v, true)} />
      )}
      {question.type === 'multi' && question.options && (
        <MultiChoice options={question.options} value={(answer as string[] | undefined) ?? []}
          onChange={(v) => onAnswer(question.id, v, false)} onContinue={onContinue} />
      )}
      {question.type === 'scale' && (
        <ScaleInput steps={question.scaleSteps ?? 5} min={question.scaleMin ?? ''} max={question.scaleMax ?? ''}
          value={answer as string | undefined} onSelect={(v) => onAnswer(question.id, v, true)} />
      )}
      {question.type === 'location' && (
        <LocationSearch apiUrl={apiUrl} initialValue={locationAnswer} onConfirm={onLocationAnswer} />
      )}
      {question.type === 'unit_select' && question.units && (
        <UnitSelect units={question.units} value={answer as string | undefined}
          onConfirm={(v) => { onAnswer(question.id, v, false); onContinue() }} />
      )}
    </div>
  )
}

// ── Single choice ─────────────────────────────────────────────────────────────

function SingleChoice({ options, value, onSelect }: { options: QuizOption[]; value?: string; onSelect: (v: string) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onSelect(opt.value)}
            className="w-full text-left px-5 py-4 rounded-2xl border transition-all"
            style={{ borderColor: active ? '#f09118' : 'var(--border)', background: active ? '#fef9ee' : 'white' }}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                style={{ borderColor: active ? '#f09118' : 'var(--border)', background: active ? '#f09118' : 'transparent' }}>
                {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{opt.label}</p>
                {opt.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{opt.description}</p>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Multi choice ──────────────────────────────────────────────────────────────

function MultiChoice({ options, value, onChange, onContinue }: {
  options: QuizOption[]; value: string[]; onChange: (v: string[]) => void; onContinue: () => void
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
            <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
              className="w-full text-left px-5 py-4 rounded-2xl border transition-all"
              style={{ borderColor: checked ? '#f09118' : 'var(--border)', background: checked ? '#fef9ee' : 'white' }}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{ borderColor: checked ? '#f09118' : 'var(--border)', background: checked ? '#f09118' : 'transparent' }}>
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

function ScaleInput({ steps, min, max, value, onSelect }: {
  steps: number; min: string; max: string; value?: string; onSelect: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        {Array.from({ length: steps }, (_, i) => i + 1).map((n) => {
          const active = value === String(n)
          return (
            <button key={n} type="button" onClick={() => onSelect(String(n))}
              className="flex-1 aspect-square rounded-2xl border-2 text-sm font-semibold transition-all"
              style={{ borderColor: active ? '#f09118' : 'var(--border)', background: active ? '#f09118' : 'white', color: active ? 'white' : 'var(--text-1)' }}>
              {n}
            </button>
          )
        })}
      </div>
      {(min || max) && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-3)' }}>
          <span>{min}</span><span>{max}</span>
        </div>
      )}
    </div>
  )
}

// ── Routine display ───────────────────────────────────────────────────────────

function RoutineDisplay({ routine, brand, firstName }: { routine: Routine; brand: BrandInfo; firstName: string | null }) {
  const grouped = routine.steps.reduce<Record<string, RoutineStep[]>>((acc, step) => {
    const key = step.timeOfDay
    if (!acc[key]) acc[key] = []
    acc[key].push(step)
    return acc
  }, {})

  const timeLabels: Record<string, string> = {
    AM: 'Morning Routine', PM: 'Evening Routine', DAILY: 'Daily',
    WASH_DAY: 'Wash Day', BETWEEN_WASH: 'Between Washes', WEEKLY: 'Weekly Treatment',
  }

  const area = routine.focusArea.charAt(0) + routine.focusArea.slice(1).toLowerCase().replace('_', ' ')

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-muted)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--text-1)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-3xl" style={{ color: 'var(--text-1)' }}>
          {firstName ? `${firstName}'s` : 'Your'} {area} Routine
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Personalised by {brand.name} · {routine.steps.length} product{routine.steps.length !== 1 ? 's' : ''}
        </p>
      </div>

      {routine.rationale && (
        <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ background: 'var(--bg-muted)', color: 'var(--text-2)' }}>
          {routine.rationale}
        </div>
      )}

      {Object.entries(grouped).map(([timeOfDay, steps]) => (
        <div key={timeOfDay} className="space-y-3">
          <h3 className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: 'var(--text-3)' }}>
            {timeLabels[timeOfDay] ?? timeOfDay}
          </h3>
          <div className="space-y-2">
            {steps.sort((a, b) => a.step - b.step).map((step, i) => (
              <div key={step.id} className="flex gap-4 p-4 rounded-2xl border bg-white" style={{ borderColor: 'var(--border)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{step.product.name}</p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-3)' }}>
                    {step.product.category.toLowerCase().replace('_', ' ')}
                    {step.product.price > 0 && (
                      <span> · {step.product.currency === 'USD' ? '$' : step.product.currency}{step.product.price.toFixed(0)}</span>
                    )}
                  </p>
                  {step.instruction && (
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-2)' }}>{step.instruction}</p>
                  )}
                  {step.product.keyIngredients && step.product.keyIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step.product.keyIngredients.slice(0, 3).map(ing => (
                        <span key={ing} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                          {ing}
                        </span>
                      ))}
                    </div>
                  )}
                  {step.product.productUrl && (
                    <a href={step.product.productUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-xs mt-2 font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text-1)' }}>
                      Shop →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-xs pb-4" style={{ color: 'var(--text-3)' }}>
        Routine generated by Halite AI · {brand.name}
      </p>
    </div>
  )
}

// ── Shared button ─────────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl text-sm font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 active:scale-[0.98]"
      style={{ background: 'var(--text-1)' }}>
      {children}
    </button>
  )
}
