import type {
  QuizQuestion, QuizOption, Routine, CheckIn, ReorderItem,
  ConnectSession, ConnectRecommendations, ConnectEventName,
  ConnectQuiz,
} from './types'

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
// The public hl_… id for this browser. Not a secret: it is useless without
// a live grant, and the grant is checked on every call.
const CONNECT_KEY = 'halite_connect'

interface StoredSession {
  token: string
  userId: string
  brandId: string
  isDemo?: boolean
  shopifyShop?: string | null
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

interface StoredConnect {
  consumerId: string
  visitorId: string
}

function loadConnect(): StoredConnect | null {
  try {
    const raw = localStorage.getItem(CONNECT_KEY)
    return raw ? JSON.parse(raw) as StoredConnect : null
  } catch { return null }
}

export class HaliteApi {
  private token = ''
  private userId = ''
  private brandId = ''
  private consumerToken = ''
  private visitorId = ''
  isDemo = false
  shopifyShop: string | null = null

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
      this.isDemo = stored.isDemo ?? false
      this.shopifyShop = stored.shopifyShop ?? null
      return
    }
    const res = await this.post<{
      token: string; userId: string; isDemo: boolean; shopifyShop: string | null
    }>('/auth/end-user/token', {
      apiKey: this.apiKey,
      externalId: `widget-${Math.random().toString(36).slice(2)}`,
    }, false)
    this.token = res.token
    this.userId = res.userId
    this.isDemo = res.isDemo
    this.shopifyShop = res.shopifyShop ?? null

    // Decode brandId from JWT payload
    const payload = JSON.parse(atob(res.token.split('.')[1])) as { brandId: string }
    this.brandId = payload.brandId

    saveSession({
      token: this.token,
      userId: this.userId,
      brandId: this.brandId,
      isDemo: this.isDemo,
      shopifyShop: this.shopifyShop,
      expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
    })
  }

  async recordCartIntent(productIds: string[]): Promise<void> {
    await this.post(`/brands/${this.brandId}/me/cart`, { productIds }).catch(() => {})
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

  // ── Halite Connect ──────────────────────────────────────────────────

  /** The hl_… id for this browser, if the shopper has connected here before. */
  get connectedConsumerId(): string | null {
    return loadConnect()?.consumerId ?? null
  }

  async connectSession(surface: string): Promise<ConnectSession> {
    const stored = loadConnect()
    const res = await this.post<ConnectSession>('/v1/connect/session', {
      apiKey: this.apiKey,
      surface,
      ...(stored?.visitorId ? { visitorId: stored.visitorId } : {}),
    }, false)
    this.visitorId = res.visitorId
    return res
  }

  async connectAuthorize(args: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    surface: string
  }): Promise<{ consumer_id: string }> {
    const res = await this.post<{ consumer_id: string }>('/v1/connect/authorize', {
      apiKey: this.apiKey,
      ...args,
      ...(this.visitorId ? { visitorId: this.visitorId } : {}),
    }, false)
    try {
      localStorage.setItem(CONNECT_KEY, JSON.stringify({
        consumerId: res.consumer_id,
        visitorId: this.visitorId,
      }))
    } catch { /* private browsing — the id just does not persist */ }
    return res
  }

  /** The preference quiz for this brand's categories. */
  async connectQuiz(): Promise<ConnectQuiz> {
    return this.get<ConnectQuiz>(`/v1/connect/quiz?key=${encodeURIComponent(this.apiKey)}`, false)
  }

  /** Creates a Hallie profile from quiz answers, and connects in one step. */
  async connectSubmitQuiz(args: {
    email: string
    answers: Record<string, string[]>
    surface: string
  }): Promise<{ consumer_id: string; categories: string[] }> {
    const res = await this.post<{ consumer_id: string; categories: string[] }>('/v1/connect/quiz', {
      apiKey: this.apiKey,
      ...args,
      ...(this.visitorId ? { visitorId: this.visitorId } : {}),
    }, false)
    try {
      localStorage.setItem(CONNECT_KEY, JSON.stringify({
        consumerId: res.consumer_id,
        visitorId: this.visitorId,
      }))
    } catch { /* private browsing — the id just does not persist */ }
    return res
  }

  async connectDecline(surface: string): Promise<void> {
    await this.post('/v1/connect/decline', {
      apiKey: this.apiKey,
      surface,
      ...(this.visitorId ? { visitorId: this.visitorId } : {}),
    }, false).catch(() => {})
  }

  async connectRecommendations(opts: {
    surface?: string
    limit?: number
    maxPrice?: number
  } = {}): Promise<ConnectRecommendations | null> {
    const consumerId = this.connectedConsumerId
    if (!consumerId) return null
    try {
      return await this.post<ConnectRecommendations>('/v1/recommendations', {
        apiKey: this.apiKey,
        consumer_id: consumerId,
        ...(opts.surface ? { surface: opts.surface } : {}),
        ...(opts.limit ? { limit: opts.limit } : {}),
        ...(opts.maxPrice ? { max_price: opts.maxPrice } : {}),
      }, false)
    } catch {
      // A revoked grant answers 403 here. That is a normal state, not an
      // error the storefront should surface.
      return null
    }
  }

  async connectEvent(event: ConnectEventName, payload: {
    sku?: string
    productId?: string
    recommendationId?: string
    surface?: string
    value?: number
    currency?: string
  } = {}): Promise<void> {
    await this.post('/v1/events', {
      apiKey: this.apiKey,
      event,
      ...(this.connectedConsumerId ? { consumer_id: this.connectedConsumerId } : {}),
      ...(payload.sku ? { sku: payload.sku } : {}),
      ...(payload.productId ? { product_id: payload.productId } : {}),
      ...(payload.recommendationId ? { recommendation_id: payload.recommendationId } : {}),
      ...(payload.surface ? { surface: payload.surface } : {}),
      ...(payload.value != null ? { value: payload.value } : {}),
      ...(payload.currency ? { currency: payload.currency } : {}),
      ...(this.visitorId ? { visitor_id: this.visitorId } : {}),
    }, false).catch(() => {})
  }

  private async get<T>(path: string, auth = true): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      headers: auth ? { Authorization: `Bearer ${this.token}` } : {},
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
