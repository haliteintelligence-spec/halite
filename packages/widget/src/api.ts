import type { QuizQuestion, QuizOption, Routine, CheckIn, ReorderItem } from './types'

interface RawFlow {
  areaSelector: { question: string; options: QuizOption[] }
  blocks: Array<{ area: string; questions: QuizQuestion[] }>
}

function flattenFlow(flow: RawFlow): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  // Inject the area selector as a synthetic multi question
  questions.push({
    id: '__area_select',
    area: 'SHARED',
    type: 'area_select',
    question: flow.areaSelector.question,
    options: flow.areaSelector.options,
    required: true,
  })

  // Add shared questions first (SH*), then area questions
  const shared = flow.blocks.find(b => b.area === 'SHARED')
  const areaBlocks = flow.blocks.filter(b => b.area !== 'SHARED')

  if (shared) {
    for (const q of shared.questions) {
      // Skip location question — widget uses a simplified text fallback
      if (q.type !== 'location') questions.push(q)
    }
  }

  for (const block of areaBlocks) {
    for (const q of block.questions) {
      questions.push(q)
    }
  }

  return questions
}

const STORAGE_KEY = 'halite_session'

interface StoredSession {
  token: string
  userId: string
  brandId: string
  expiresAt: number
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    if (Date.now() > s.expiresAt) { localStorage.removeItem(STORAGE_KEY); return null }
    return s
  } catch { return null }
}

function saveSession(s: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export class HaliteApi {
  private token = ''
  private userId = ''
  private brandId = ''

  constructor(private apiUrl: string, private apiKey: string) {}

  async init(): Promise<void> {
    const stored = loadSession()
    if (stored) {
      this.token = stored.token
      this.userId = stored.userId
      this.brandId = stored.brandId
      return
    }
    const res = await this.post<{ token: string; userId: string }>('/auth/end-user/token', {
      apiKey: this.apiKey,
      externalId: `widget-${Math.random().toString(36).slice(2)}`,
    }, false)
    this.token = res.token
    this.userId = res.userId

    // Decode brandId from JWT payload
    const payload = JSON.parse(atob(res.token.split('.')[1])) as { brandId: string }
    this.brandId = payload.brandId

    saveSession({
      token: this.token,
      userId: this.userId,
      brandId: this.brandId,
      expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
    })
  }

  async getQuestions(): Promise<QuizQuestion[]> {
    const res = await this.get<{ flow: RawFlow }>(`/brands/${this.brandId}/quiz/questions`)
    return flattenFlow(res.flow)
  }

  async createSession(): Promise<string> {
    const res = await this.post<{ sessionId: string }>(`/brands/${this.brandId}/quiz/sessions`, {})
    return res.sessionId
  }

  async saveAnswers(sessionId: string, answers: Record<string, unknown>): Promise<void> {
    await this.patch(`/brands/${this.brandId}/quiz/sessions/${sessionId}/answers`, answers)
  }

  async completeSession(sessionId: string): Promise<void> {
    await this.post(`/brands/${this.brandId}/quiz/sessions/${sessionId}/complete`, {})
  }

  async getRoutine(): Promise<Routine | null> {
    try {
      const res = await this.get<{ routine: Routine }>(`/brands/${this.brandId}/me/routine`)
      return res.routine
    } catch { return null }
  }

  async getRoutines(): Promise<Routine[]> {
    try {
      const res = await this.get<{ routines: Routine[] }>(`/brands/${this.brandId}/me/routines`)
      return res.routines
    } catch { return [] }
  }

  async submitCheckIn(data: {
    skinRating: number
    symptoms: string[]
    notes?: string
    compliant: boolean
    products: Array<{ productId: string; used: boolean; reaction?: string }>
  }): Promise<void> {
    await this.post(`/brands/${this.brandId}/me/check-ins`, data)
  }

  async getCheckIns(): Promise<CheckIn[]> {
    try {
      const res = await this.get<{ checkIns: CheckIn[] }>(`/brands/${this.brandId}/me/check-ins`)
      return res.checkIns
    } catch { return [] }
  }

  async getNarrative(): Promise<{ narrative: string | null; checkInsRequired?: number }> {
    try {
      return await this.get(`/brands/${this.brandId}/me/narrative`)
    } catch { return { narrative: null } }
  }

  async getReorderItems(): Promise<ReorderItem[]> {
    try {
      const res = await this.get<{ items: ReorderItem[] }>(`/brands/${this.brandId}/me/reorder`)
      return res.items
    } catch { return [] }
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }

  private async post<T>(path: string, body: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (auth) headers['Authorization'] = `Bearer ${this.token}`
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }
}
