'use client'

import { useState, useRef, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const SESSION_KEY = 'halite_checkin_session'

const SYMPTOMS_POSITIVE = [
  { value: 'IMPROVEMENT', label: '✨ Improving' },
  { value: 'GLOW', label: '🌟 Glowing' },
  { value: 'HYDRATED', label: '💦 Hydrated' },
  { value: 'TEXTURE_SMOOTH', label: '🧈 Smooth' },
]

const SYMPTOMS_NEGATIVE = [
  { value: 'BREAKOUT', label: '🔴 Breakout' },
  { value: 'DRYNESS', label: '🏜️ Dryness' },
  { value: 'REDNESS', label: '🌹 Redness' },
  { value: 'IRRITATION', label: '⚡ Irritation' },
  { value: 'PURGING', label: '🔄 Purging' },
  { value: 'OILINESS', label: '💧 Oiliness' },
  { value: 'DULLNESS', label: '🌑 Dullness' },
]

const RATING_EMOJIS = ['😔', '😐', '🙂', '😊', '🤩']
const RATING_LABELS = ['Rough', 'Okay', 'Good', 'Great', 'Glowing']

const AREA_META: Record<string, { icon: string; label: string }> = {
  SKINCARE:    { icon: '🧴', label: 'Skincare' },
  BODY:        { icon: '🫧', label: 'Body Care' },
  HAIR:        { icon: '💇', label: 'Hair Care' },
  MAKEUP:      { icon: '💄', label: 'Makeup' },
  FRAGRANCE:   { icon: '🌸', label: 'Fragrance' },
  NAILS:       { icon: '💅', label: 'Nails' },
  WELLNESS:    { icon: '🌿', label: 'Wellness' },
  SUN_CARE:    { icon: '☀️', label: 'Sun Care' },
  LIP_CARE:    { icon: '💋', label: 'Lip Care' },
  EYE_CARE:    { icon: '👁️', label: 'Eye Care' },
}

function areaLabel(area: string) {
  return AREA_META[area]?.label ?? area.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function areaIcon(area: string) {
  return AREA_META[area]?.icon ?? '✦'
}

type Phase =
  | 'init'
  | 'login'
  | 'no_profile'
  | 'no_routine'
  | 'cross_brand_welcome'
  | 'area_select'
  | 'rating'
  | 'symptoms'
  | 'products'
  | 'notes'
  | 'photo'
  | 'submitting'
  | 'success'
  | 'error'

const FORM_STEPS: Phase[] = ['rating', 'symptoms', 'products', 'notes', 'photo']

interface Product { id: string; name: string }
interface RoutineStep { id: string; product: Product }
interface Routine { id: string; focusArea: string; steps: RoutineStep[] }
interface Brand { id: string; name: string; logoUrl?: string; primaryColor?: string }
interface StoredSession { token: string; brandId: string; expiresAt: number }

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    if (Date.now() > s.expiresAt) { localStorage.removeItem(SESSION_KEY); return null }
    return s
  } catch { return null }
}

function saveSession(s: StoredSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function CheckInClient({ brand, slug }: { brand: Brand; slug: string }) {
  const accent = brand.primaryColor ?? '#C17A47'

  const [phase, setPhase] = useState<Phase>('init')
  const [token, setToken] = useState('')
  const [brandId, setBrandId] = useState('')
  const [routines, setRoutines] = useState<Routine[]>([])
  const [selectedArea, setSelectedArea] = useState('')
  const [totalCheckIns, setTotalCheckIns] = useState(0)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [skinRating, setSkinRating] = useState(0)
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set())
  const [reactions, setReactions] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Derived: the routine for the selected area
  const activeRoutine = routines.find(r => r.focusArea === selectedArea) ?? null

  // On mount — check for an existing valid session scoped to this brand
  useEffect(() => {
    const session = loadSession()
    if (session && session.brandId === brand.id) {
      setToken(session.token)
      setBrandId(session.brandId)
      loadRoutineData(session.token, session.brandId)
    } else {
      setPhase('login')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadRoutineData(tok: string, bid: string) {
    try {
      const [routinesRes, checkInsRes] = await Promise.all([
        fetch(`${API_URL}/brands/${bid}/me/routines`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`${API_URL}/brands/${bid}/me/check-ins`, { headers: { Authorization: `Bearer ${tok}` } }),
      ])

      // Token expired or invalid — clear session and go back to login
      if (routinesRes.status === 401 || routinesRes.status === 403) {
        localStorage.removeItem(SESSION_KEY)
        setPhase('login')
        return
      }

      if (routinesRes.ok) {
        const data = await routinesRes.json() as { routines: Routine[] }
        setRoutines(data.routines)
        if (data.routines.length === 0) {
          setPhase('no_routine')
        } else if (data.routines.length === 1) {
          setSelectedArea(data.routines[0]!.focusArea)
          setPhase('rating')
        } else {
          setPhase('area_select')
        }
      } else {
        setPhase('no_routine')
      }

      if (checkInsRes.ok) {
        const data = await checkInsRes.json() as { checkIns: unknown[] }
        setTotalCheckIns(data.checkIns.length)
      }
    } catch {
      setPhase('no_routine')
    }
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
  }
  function isValidPhone(v: string) {
    const digits = v.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15 && /^[\+\d\s\-\(\)]+$/.test(v.trim())
  }

  async function handleLogin() {
    const emailVal = email.trim()
    const phoneVal = phone.trim()
    if (!emailVal && !phoneVal) return
    if (emailVal && !isValidEmail(emailVal)) { setLoginError('Please enter a valid email address.'); return }
    if (phoneVal && !isValidPhone(phoneVal)) { setLoginError('Please enter a valid phone number.'); return }
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch(`${API_URL}/brands/slug/${slug}/check-in/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      })
      if (res.status === 404) { setPhase('no_profile'); return }
      if (!res.ok) throw new Error()
      const data = await res.json() as { token: string; brandId: string; crossBrand?: boolean }
      setToken(data.token)
      setBrandId(data.brandId)
      saveSession({ token: data.token, brandId: data.brandId, expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000 })
      if (data.crossBrand) {
        setPhase('cross_brand_welcome')
        return
      }
      await loadRoutineData(data.token, data.brandId)
    } catch {
      setLoginError('Something went wrong. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  function handleAreaSelect(area: string) {
    setSelectedArea(area)
    // Reset any prior check-in state when switching areas
    setSkinRating(0)
    setSymptoms(new Set())
    setReactions({})
    setNotes('')
    setPhotoUrl('')
    setPhase('rating')
  }

  function stepIndex() { return FORM_STEPS.indexOf(phase) }

  function progress() {
    const idx = stepIndex()
    return idx < 0 ? 0 : (idx + 1) / (FORM_STEPS.length + 1)
  }

  function goBack() {
    const idx = stepIndex()
    if (idx === 0 && routines.length > 1) { setPhase('area_select'); return }
    if (idx > 0) setPhase(FORM_STEPS[idx - 1]!)
  }

  function goNext() {
    const idx = stepIndex()
    if (idx < FORM_STEPS.length - 1) setPhase(FORM_STEPS[idx + 1]!)
    else submitCheckIn()
  }

  function toggleSymptom(value: string) {
    setSymptoms(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  async function handlePhotoChange(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/brands/${brandId}/me/check-ins/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (res.ok) {
        const { url } = await res.json() as { url: string }
        setPhotoUrl(url)
      }
    } catch { /* skip */ }
    setUploading(false)
  }

  async function submitCheckIn() {
    setPhase('submitting')
    const steps = activeRoutine?.steps ?? []
    const seen = new Set<string>()
    const unique = steps.filter(s => { if (seen.has(s.product.id)) return false; seen.add(s.product.id); return true })
    const products = unique.map(s => ({
      productId: s.product.id,
      used: s.product.id in reactions,
      reaction: reactions[s.product.id] as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | undefined,
    }))
    const compliant = unique.length === 0 || Object.keys(reactions).length >= Math.ceil(unique.length / 2)
    try {
      const res = await fetch(`${API_URL}/brands/${brandId}/me/check-ins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          skinRating, symptoms: Array.from(symptoms),
          notes: notes || undefined, compliant,
          photoUrl: photoUrl || undefined, products,
        }),
      })
      if (res.ok) setPhase('success')
      else throw new Error()
    } catch { setPhase('error') }
  }

  const isFormStep = FORM_STEPS.includes(phase)
  const idx = stepIndex()
  const canContinue = phase !== 'rating' || skinRating > 0
  const canGoBack = idx > 0 || (idx === 0 && routines.length > 1)

  return (
    <div style={{ minHeight: '100vh', background: '#faf6f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #f0ece6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        {brand.logoUrl
          ? <img src={brand.logoUrl} alt={brand.name} style={{ height: 28, objectFit: 'contain' }} />
          : <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{brand.name}</span>
        }
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#bbb' }}>Halite Intelligence</span>
      </header>

      {/* Progress bar — only during form steps */}
      {isFormStep && (
        <div style={{ height: 3, background: '#f0ece6' }}>
          <div style={{ height: '100%', width: `${Math.round(progress() * 100)}%`, background: accent, transition: 'width 0.4s ease', borderRadius: 2 }} />
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px 120px' }}>

        {phase === 'init' && <Spinner />}

        {phase === 'login' && (
          <LoginStep
            email={email} phone={phone} error={loginError} loading={loggingIn}
            accent={accent} brandName={brand.name} slug={slug}
            onEmail={setEmail} onPhone={setPhone} onSubmit={handleLogin}
          />
        )}

        {phase === 'cross_brand_welcome' && (
          <CrossBrandWelcome accent={accent} brandName={brand.name} onContinue={() => loadRoutineData(token, brandId)} />
        )}

        {phase === 'no_profile' && (
          <CenteredCard>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>No profile found</h2>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>
              We couldn&apos;t find a profile for this email or phone number at {brand.name}. Complete the skin quiz first to get started.
            </p>
            <a href={`/${slug}/quiz`} style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 10, background: accent, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Take the Quiz
            </a>
            <button
              onClick={() => setPhase('login')}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', fontSize: 13, color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Try a different email or phone
            </button>
          </CenteredCard>
        )}

        {phase === 'no_routine' && (
          <CenteredCard>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🧴</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>No active routine yet</h2>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>
              Take the personalisation quiz to get your routine, then come back here to check in.
            </p>
            <a href={`/${slug}/quiz`} style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 10, background: accent, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Take the Quiz
            </a>
            <button
              onClick={() => { localStorage.removeItem(SESSION_KEY); setPhase('login') }}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', fontSize: 13, color: '#aaa', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign in as someone else
            </button>
          </CenteredCard>
        )}

        {phase === 'area_select' && (
          <AreaSelectStep
            routines={routines}
            accent={accent}
            onSelect={handleAreaSelect}
          />
        )}

        {phase === 'rating' && (
          <RatingStep skinRating={skinRating} accent={accent} area={selectedArea} onChange={setSkinRating} />
        )}

        {phase === 'symptoms' && (
          <SymptomsStep symptoms={symptoms} accent={accent} onToggle={toggleSymptom} />
        )}

        {phase === 'products' && (
          <ProductsStep routine={activeRoutine} reactions={reactions} accent={accent}
            onReaction={(id, r) => setReactions(prev => ({ ...prev, [id]: r }))} />
        )}

        {phase === 'notes' && (
          <NotesStep notes={notes} accent={accent} onChange={setNotes} />
        )}

        {phase === 'photo' && (
          <PhotoStep
            photoUrl={photoUrl} uploading={uploading} accent={accent} fileRef={fileRef}
            onFileChange={handlePhotoChange}
          />
        )}

        {phase === 'submitting' && <Spinner message="Saving your check-in…" />}

        {phase === 'success' && (
          <CenteredCard>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>✦</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>Check-in logged</h2>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 8px', lineHeight: 1.5 }}>
              Your {areaLabel(selectedArea).toLowerCase()} data has been recorded.
            </p>
            <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 20px', lineHeight: 1.5 }}>
              Consistent check-ins help refine your routine over time.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, background: `${accent}15`, fontSize: 13, fontWeight: 600, color: accent }}>
              🔥 {totalCheckIns + 1} check-in{totalCheckIns + 1 !== 1 ? 's' : ''} total
            </div>
            {routines.length > 1 && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={() => {
                    setSkinRating(0); setSymptoms(new Set()); setReactions({}); setNotes(''); setPhotoUrl('')
                    setPhase('area_select')
                  }}
                  style={{ padding: '11px 20px', borderRadius: 10, background: '#f5f5f5', border: 'none', fontSize: 14, fontWeight: 500, color: '#555', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Check in on another routine →
                </button>
              </div>
            )}
          </CenteredCard>
        )}

        {phase === 'error' && (
          <CenteredCard>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>Please check your connection and try again.</p>
            <button onClick={() => setPhase('photo')} style={{ padding: '12px 24px', borderRadius: 10, background: accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Try Again
            </button>
          </CenteredCard>
        )}
      </main>

      {/* Sticky footer nav — only during form steps */}
      {isFormStep && phase !== 'submitting' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #f0ece6', padding: '16px 24px 24px', display: 'flex', gap: 10 }}>
          {canGoBack && (
            <button onClick={goBack} style={{ padding: '12px 20px', borderRadius: 10, background: '#f5f5f5', border: 'none', fontSize: 14, fontWeight: 500, color: '#555', cursor: 'pointer' }}>
              ← Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!canContinue}
            style={{ flex: 1, padding: '12px 20px', borderRadius: 10, background: accent, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: canContinue ? 'pointer' : 'not-allowed', opacity: canContinue ? 1 : 0.4, transition: 'opacity 0.15s' }}
          >
            {phase === 'photo' ? 'Submit Check-in' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      {children}
    </div>
  )
}

function Spinner({ message }: { message?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f0ece6', borderTopColor: '#C17A47', animation: 'spin 0.8s linear infinite' }} />
      {message && <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{message}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function LoginStep({
  email, phone, error, loading, accent, brandName, slug,
  onEmail, onPhone, onSubmit,
}: {
  email: string; phone: string; error: string; loading: boolean
  accent: string; brandName: string; slug: string
  onEmail: (v: string) => void; onPhone: (v: string) => void; onSubmit: () => void
}) {
  const canSubmit = (email.trim() || phone.trim()) && !loading

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Check-in</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.2 }}>Welcome back</h1>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 32px', lineHeight: 1.5 }}>Enter your email or phone number to access your profile at {brandName}.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => onEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSubmit && onSubmit()}
            placeholder="you@email.com"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e8e8e8', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          <span style={{ fontSize: 12, color: '#bbb', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => onPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSubmit && onSubmit()}
            placeholder="+1 (555) 000-0000"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e8e8e8', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#e57373', margin: '0 0 16px' }}>{error}</p>}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{ width: '100%', padding: '14px', borderRadius: 12, background: accent, border: 'none', fontSize: 15, fontWeight: 600, color: '#fff', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.4, transition: 'opacity 0.15s', fontFamily: 'inherit' }}
      >
        {loading ? 'Finding your profile…' : 'Continue'}
      </button>

      <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 20 }}>
        New to {brandName}?{' '}
        <a href={`/${slug}/quiz`} style={{ color: accent, textDecoration: 'none', fontWeight: 500 }}>Take the skin quiz</a>
      </p>
    </div>
  )
}

function CrossBrandWelcome({ accent, brandName, onContinue }: { accent: string; brandName: string; onContinue: () => void }) {
  return (
    <div>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>✦</div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Welcome back</p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px', lineHeight: 1.2 }}>Your profile is linked</h1>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 32px', lineHeight: 1.6 }}>
        We found your beauty profile and connected it to {brandName}. You can check in now — take the skin quiz to get product recommendations personalised for this brand.
      </p>
      <button
        onClick={onContinue}
        style={{ width: '100%', padding: '14px', borderRadius: 12, background: accent, border: 'none', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Continue to check-in
      </button>
      <p style={{ fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 16 }}>
        Your data is private and never shared across brands.
      </p>
    </div>
  )
}

function AreaSelectStep({ routines, accent, onSelect }: {
  routines: Array<{ focusArea: string; steps: Array<{ product: { name: string } }> }>
  accent: string
  onSelect: (area: string) => void
}) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Check-in</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px', lineHeight: 1.2 }}>Which routine today?</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px', lineHeight: 1.5 }}>You have {routines.length} active routines. Select one to check in on.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {routines.map(r => {
          const seen = new Set<string>()
          const unique = r.steps.filter(s => { if (seen.has(s.product.name)) return false; seen.add(s.product.name); return true })
          const preview = unique.slice(0, 3).map(s => s.product.name)
          const extra = unique.length - preview.length

          return (
            <button
              key={r.focusArea}
              onClick={() => onSelect(r.focusArea)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                borderRadius: 14, border: '1.5px solid #e8e8e8', background: '#fff',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 3px ${accent}18` }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e8e8e8'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {areaIcon(r.focusArea)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: '0 0 3px' }}>{areaLabel(r.focusArea)}</p>
                <p style={{ fontSize: 12, color: '#aaa', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {preview.join(' · ')}{extra > 0 ? ` +${extra} more` : ''}
                </p>
              </div>
              <span style={{ fontSize: 18, color: '#ccc', flexShrink: 0 }}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RatingStep({ skinRating, accent, area, onChange }: { skinRating: number; accent: string; area: string; onChange: (n: number) => void }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>
        {areaLabel(area)} · Step 1 of 5
      </p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>How is your skin today?</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px' }}>Rate your overall skin condition</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {RATING_EMOJIS.map((emoji, i) => {
          const val = i + 1
          const selected = skinRating === val
          return (
            <button
              key={val}
              onClick={() => onChange(val)}
              style={{
                flex: 1, padding: '16px 0', borderRadius: 14, border: `1.5px solid ${selected ? accent : '#e8e8e8'}`,
                background: selected ? `${accent}18` : '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: selected ? accent : '#aaa' }}>{RATING_LABELS[i]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SymptomsStep({ symptoms, accent, onToggle }: { symptoms: Set<string>; accent: string; onToggle: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Step 2 of 5</p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Any symptoms to note?</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>Select all that apply — or skip</p>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#bbb', margin: '0 0 10px' }}>Positive</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {SYMPTOMS_POSITIVE.map(s => {
          const sel = symptoms.has(s.value)
          return (
            <button key={s.value} onClick={() => onToggle(s.value)} style={{
              padding: '11px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${sel ? '#4caf82' : '#e8e8e8'}`,
              background: sel ? '#4caf8214' : '#fff', color: sel ? '#4caf82' : '#555',
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              {s.label}
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#bbb', margin: '0 0 10px' }}>Concerns</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SYMPTOMS_NEGATIVE.map(s => {
          const sel = symptoms.has(s.value)
          return (
            <button key={s.value} onClick={() => onToggle(s.value)} style={{
              padding: '11px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${sel ? accent : '#e8e8e8'}`,
              background: sel ? `${accent}14` : '#fff', color: sel ? accent : '#555',
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProductsStep({ routine, reactions, accent, onReaction }: {
  routine: { steps: Array<{ product: { id: string; name: string } }> } | null
  reactions: Record<string, string>
  accent: string
  onReaction: (productId: string, reaction: string) => void
}) {
  const steps = routine?.steps ?? []
  const seen = new Set<string>()
  const unique = steps.filter(s => { if (seen.has(s.product.id)) return false; seen.add(s.product.id); return true })

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Step 3 of 5</p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>How are your products working?</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>Rate each product from your routine</p>

      {unique.length === 0
        ? <p style={{ fontSize: 14, color: '#aaa', padding: '24px 0' }}>No products in your routine yet.</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unique.map(step => {
              const r = reactions[step.product.id]
              const REACTIONS = [
                { value: 'POSITIVE', emoji: '👍', activeColor: '#4caf82' },
                { value: 'NEUTRAL',  emoji: '👌', activeColor: '#aaa' },
                { value: 'NEGATIVE', emoji: '👎', activeColor: '#e57373' },
              ]
              return (
                <div key={step.product.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #f0f0f0', background: '#fafafa' }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#333' }}>{step.product.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {REACTIONS.map(rx => (
                      <button
                        key={rx.value}
                        onClick={() => onReaction(step.product.id, rx.value)}
                        style={{
                          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 15,
                          border: `1.5px solid ${r === rx.value ? rx.activeColor : '#e8e8e8'}`,
                          background: r === rx.value ? `${rx.activeColor}20` : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                        title={rx.value.toLowerCase()}
                      >
                        {rx.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

function NotesStep({ notes, accent, onChange }: { notes: string; accent: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Step 4 of 5</p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Any other notes?</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>Optional — changes to diet, stress, sleep, environment…</p>
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        rows={5}
        placeholder="e.g. Been drinking more water this week, started a new supplement…"
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #e8e8e8', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
      />
    </div>
  )
}

function PhotoStep({ photoUrl, uploading, accent, fileRef, onFileChange }: {
  photoUrl: string; uploading: boolean; accent: string
  fileRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (file: File) => void
}) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: accent, margin: '0 0 8px' }}>Step 5 of 5</p>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Add a skin photo</h2>
      <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>Optional — helps track visible progress over time. Stored privately.</p>

      <div
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          width: '100%', height: 180, borderRadius: 16,
          border: `2px dashed ${photoUrl ? accent : '#e0d6cc'}`,
          background: photoUrl ? `${accent}08` : '#faf6f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: uploading ? 'default' : 'pointer', overflow: 'hidden', position: 'relative',
          transition: 'border-color 0.15s',
        }}
      >
        {photoUrl
          ? <img src={photoUrl} alt="Skin photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : uploading
            ? <><span style={{ fontSize: 28 }}>⏳</span><p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Uploading…</p></>
            : <><span style={{ fontSize: 32 }}>📷</span><p style={{ fontSize: 13, fontWeight: 500, color: '#aaa', margin: 0 }}>Tap to add photo</p></>
        }
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f) }}
      />
      {photoUrl && (
        <p style={{ fontSize: 12, color: '#4caf82', marginTop: 8, textAlign: 'center' }}>✓ Photo added</p>
      )}
    </div>
  )
}
