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
const CONSUMER_KEY = 'halite_consumer'

interface StoredSession {
  token: string
  userId: string
  brandId: string
  expiresAt: number
}

interface StoredConsumer {
  token: string
  consumerId: string
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

function loadConsumer(): StoredConsumer | null {
  try {
    const raw = localStorage.getItem(CONSUMER_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredConsumer
    if (Date.now() > s.expiresAt) { localStorage.removeItem(CONSUMER_KEY); return null }
    return s
  } catch { return null }
}

function saveConsumer(s: StoredConsumer) {
  localStorage.setItem(CONSUMER_KEY, JSON.stringify(s))
}

export class HaliteApi {
  private token = ''
  private userId = ''
  private brandId = ''
  private consumerToken = ''

  constructor(private apiUrl: string, private apiKey: string) {
    const stored = loadConsumer()
    if (stored) this.consumerToken = stored.token
  }

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
    await this.post(`/brands/${this.brandId}/quiz/sessions/${sessionId}/complete`, {
      ...(this.consumerToken ? { consumerToken: this.consumerToken } : {}),
    })
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

  async identifyConsumer(contact: { email?: string; phone?: string }): Promise<{
    consumerId: string
    prefillAnswers: Record<string, unknown>
    isReturning: boolean
  }> {
    const res = await this.post<{
      token: string
      consumerId: string
      prefillAnswers: Record<string, unknown>
      isReturning: boolean
    }>('/consumers/identify', contact, false)

    this.consumerToken = res.token
    saveConsumer({
      token: res.token,
      consumerId: res.consumerId,
      expiresAt: Date.now() + 364 * 24 * 60 * 60 * 1000,
    })

    return { consumerId: res.consumerId, prefillAnswers: res.prefillAnswers, isReturning: res.isReturning }
  }

  async saveEndUserName(firstName: string, lastName?: string): Promise<void> {
    await this.patch(`/brands/${this.brandId}/me`, {
      firstName,
      ...(lastName ? { lastName } : {}),
    })
  }

  async saveConsumerAnswers(answers: Record<string, unknown>): Promise<void> {
    if (!this.consumerToken) return
    await fetch(`${this.apiUrl}/consumers/me/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.consumerToken}` },
      body: JSON.stringify({ answers }),
    })
  }

  async uploadCheckInPhoto(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${this.apiUrl}/brands/${this.brandId}/me/check-ins/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    })
    if (!res.ok) throw new Error(`Photo upload failed: ${res.status}`)
    const { url } = await res.json() as { url: string }
    return url
  }

  async submitCheckIn(data: {
    skinRating: number
    symptoms: string[]
    notes?: string
    compliant: boolean
    photoUrl?: string
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
