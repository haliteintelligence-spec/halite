import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface AnalyticsData {
  summary: {
    totalConsumers: number
    totalCheckIns: number
    avgRating: number | null
    complianceRate: number | null
    usageRate: number | null
  }
  consumers: {
    monkSkinTones: Array<{ type: number; label: string; count: number; pct: number }>
    skinTypes: Array<{ type: string; count: number; pct: number }>
    concerns: Array<{ concern: string; count: number; pct: number }>
    ageRanges: Array<{ group: string; n: number }>
  }
  checkIns: {
    weeklyTrend: number[]
    ratingTrend: (number | null)[]
    complianceTrend: (number | null)[]
    thisWeek: number
    lastWeek: number
    symptoms: Array<{ symptom: string; count: number; positive: boolean }>
    positiveSymptomCount: number
    negativeSymptomCount: number
  }
  outcomes: {
    totalRefined: number
  }
  products: {
    topProducts: Array<{
      id: string; name: string; category: string
      used: number; positive: number; neutral: number; negative: number; total: number; rate: number
    }>
    categoryPerf: Array<{ category: string; used: number; total: number; acceptance: number }>
    topIngredients: Array<{ name: string; count: number; score: number; concerns: string[] }>
    concernCoverage: Array<{ concern: string; userPct: number; productCount: number; coverage: number }>
    totalRecommended: number
  }
}

export function decodeToken(token: string): { brandId?: string; adminId?: string; role?: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch { return null }
}

async function apiFetch<T>(path: string, token: string, noCache = false): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      ...(noCache ? { cache: 'no-store' } : { next: { revalidate: 120 } }),
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export interface BrandThemeConfig {
  primary: string
  primaryLight: string
  primaryDark: string
  background: string
  surface: string
  text: string
  textSecondary: string
  accent: string
  border: string
  fontSans: string
  fontDisplay: string
  fontUrl: string | null
}

export interface BrandProfile {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
  logoUrl: string | null
  primaryColor: string | null
  brandWebsiteUrl: string | null
  focusAreas: string[]
  shopifyShop: string | null
  createdAt: string
  isDemo: boolean
  demoLinkExpiresAt: string | null
  whiteLabelEnabled: boolean
  brandThemeConfig: BrandThemeConfig | null
}

async function apiFetchMutate<T>(path: string, token: string, method: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export async function getBrandProfile(): Promise<BrandProfile | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const data = await apiFetch<{ brand: BrandProfile }>(`/brands/${payload.brandId}/profile`, token, true)
  return data?.brand ?? null
}

export async function getTokenAndBrandId(): Promise<{ token: string; brandId: string; adminId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId || !payload?.adminId) return null
  return { token, brandId: payload.brandId, adminId: payload.adminId }
}

export interface WidgetConfig {
  apiKey: string
  primaryColor: string | null
  quizConfig: { enabledAreas: string[] } | null
}

export async function getWidgetConfig(): Promise<WidgetConfig | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const [keyData, configData, profileData] = await Promise.all([
    apiFetch<{ apiKey: string }>(`/brands/${payload.brandId}/api-key`, token),
    apiFetch<{ config: { enabledAreas: string[] } | null }>(`/brands/${payload.brandId}/quiz-config`, token),
    apiFetch<{ brand: BrandProfile }>(`/brands/${payload.brandId}/profile`, token),
  ])
  if (!keyData) return null
  return {
    apiKey: keyData.apiKey,
    primaryColor: profileData?.brand.primaryColor ?? null,
    quizConfig: configData?.config ?? null,
  }
}

export interface Product {
  id: string
  brandId: string
  name: string
  description: string | null
  category: string
  price: number
  currency: string
  imageUrl: string | null
  productUrl: string | null
  inStock: boolean
  concerns: string[]
  skinTypes: string[]
  keyIngredients: string[]
  ingredients: string[]
  monkSkinTones: number[]
  createdAt: string
  updatedAt: string
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  pages: number
}

export interface UploadRecord {
  id: string
  fileName: string
  format: string
  source: 'USER_UPLOADED' | 'AI_GENERATED'
  status: string
  fileUrl: string
  createdAt: string
  errorLog: unknown
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'MEMBER'
  createdAt: string
}

export interface IntegrationStatus {
  shopify: {
    connected: boolean
    shop: string | null
    lastSync: string | null
    lastSyncCount: number | null
  }
}

export async function getIntegrations(): Promise<IntegrationStatus | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return apiFetch<IntegrationStatus>(`/brands/${payload.brandId}/integrations`, token)
}

export async function getTeam(): Promise<TeamMember[] | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const data = await apiFetch<{ admins: TeamMember[] }>(`/brands/${payload.brandId}/team`, token)
  return data?.admins ?? null
}

export async function getProducts(page = 1): Promise<ProductsResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return apiFetch<ProductsResponse>(`/brands/${payload.brandId}/products?page=${page}&limit=50`, token)
}

export async function getUploadHistory(): Promise<UploadRecord[] | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const data = await apiFetch<{ uploads: UploadRecord[] }>(`/brands/${payload.brandId}/catalog/uploads`, token)
  return data?.uploads ?? null
}

export async function getTimeframe(raw: { days?: string; from?: string; to?: string }): Promise<{
  days: number
  from: string | undefined
  to: string | undefined
}> {
  if (raw.days || raw.from) {
    return { days: Number(raw.days) || 30, from: raw.from, to: raw.to }
  }
  const cookieStore = await cookies()
  const saved = cookieStore.get('halite_tf')?.value
  if (saved) {
    const p = new URLSearchParams(saved)
    return {
      days: Number(p.get('days')) || 30,
      from: p.get('from') ?? undefined,
      to: p.get('to') ?? undefined,
    }
  }
  return { days: 30, from: undefined, to: undefined }
}

export async function getAnalytics(days = 30, from?: string, to?: string): Promise<AnalyticsData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const qs = from
    ? `?from=${from}${to ? `&to=${to}` : ''}`
    : `?days=${days}`
  return apiFetch<AnalyticsData>(`/brands/${payload.brandId}/analytics${qs}`, token)
}

export interface IdentityData {
  total: number
  identified: number
  anonymous: number
  crossBrand: number
  retained: number
  identificationRate: number
  crossBrandRate: number
  retentionRate: number
  trend: Array<{
    week: number
    total: number
    identified: number
    rate: number | null
  }>
}

export async function getIdentityIntelligence(): Promise<IdentityData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return apiFetch<IdentityData>(`/brands/${payload.brandId}/intelligence`, token)
}

export interface IngredientSignalProduct {
  id: string
  name: string
  category: string
  count: number
  avgRating: number | null
  positiveRate: number | null
  topSymptoms: string[]
}

export interface IngredientSignal {
  ingredient: string
  consumerCount: number
  partnerBrandCount: number
  ourProducts: IngredientSignalProduct[]
  outcomes: {
    avgRating: number | null
    positiveRate: number
    topSymptoms: string[]
    checkInCount: number
  }
}

export interface IngredientSignalsData {
  signals: IngredientSignal[]
  crossBrandConsumerCount: number
}

export async function getIngredientSignals(): Promise<IngredientSignalsData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  return apiFetch<IngredientSignalsData>(`/brands/${payload.brandId}/intelligence/ingredient-signals`, token)
}

export interface AgentWorkflow {
  id: string
  name: string
  description: string | null
  type: string
  isPrebuilt: boolean
  isActive: boolean
  createdAt: string
  _count: { runs: number }
  runs: Array<{ id: string; status: string; createdAt: string }>
}

export interface AgentRun {
  id: string
  workflowId: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  output: unknown
  tokenCount: number | null
  createdAt: string
}

export async function getAgentWorkflows(): Promise<AgentWorkflow[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return []
  const payload = decodeToken(token)
  if (!payload?.brandId) return []
  const data = await apiFetch<{ workflows: AgentWorkflow[] }>(`/brands/${payload.brandId}/agents/workflows`, token)
  return data?.workflows ?? []
}

export type WorkflowDetail = Omit<AgentWorkflow, 'runs'> & { runs: AgentRun[] }

export async function getAgentWorkflow(workflowId: string): Promise<WorkflowDetail | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload?.brandId) return null
  const data = await apiFetch<{ workflow: WorkflowDetail }>(`/brands/${payload.brandId}/agents/workflows/${workflowId}`, token)
  return data?.workflow ?? null
}

// ── Crystal ─────────────────────────────────────────────────────────────────

export interface CrystalConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

export interface CrystalMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  tokenCount: number | null
  createdAt: string
}

export async function getCrystalConversations(): Promise<CrystalConversation[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('halite_token')?.value
  if (!token) return []
  const payload = decodeToken(token)
  if (!payload?.brandId) return []
  const data = await apiFetch<{ conversations: CrystalConversation[] }>(
    `/brands/${payload.brandId}/crystal/conversations`, token
  )
  return data?.conversations ?? []
}

// ── Halite Connect ───────────────────────────────────────────────────

export interface ConnectAnalytics {
  window: { days: number; from: string }
  summary: {
    connectedConsumers: number
    newConnections: number
    newConnectionsDelta: number | null
    promptsShown: number
    accepted: number
    declined: number
    acceptanceRate: number
    revenueInfluenced: number
    revenueDelta: number | null
    orders: number
    averageOrderValue: number
    revoked: number
  }
  funnel: {
    recommendationsShown: number
    productViews: number
    addToCart: number
    saved: number
    purchases: number
    returns: number
    viewToCartRate: number
    cartToPurchaseRate: number
    returnRate: number
  }
  surfaces: Array<{ surface: string; shown: number; accepted: number; acceptanceRate: number }>
  topProducts: Array<{
    productId: string
    name: string
    sku: string | null
    shown: number
    avgMatch: number
    addToCartRate: number
    purchases: number
    revenue: number
  }>
}

export interface ConnectedConsumerRow {
  consumerId: string
  name: string | null
  email: string | null
  phone: string | null
  status: string
  categories: string[]
  connectedVia: string | null
  connectedAt: string
  disconnectedAt: string | null
  expiresAt: string | null
  lastReadAt: string | null
  orders: number
  revenue: number
}

export interface ConnectedConsumerDetail {
  consumerId: string
  identity: { name: string | null; email: string | null; phone: string | null }
  permission: {
    status: string
    categories: string[]
    purpose: string
    grantedAt: string
    expiresAt: string | null
    storage: string
  }
  context: {
    preferences: { liked: string[]; avoided: string[]; concerns: string[]; skin_type: string | null }
    outcomes: { positive: string[]; negative: string[] }
    intent: { budget_max: number | null; currency: string }
    confidence: number
    collection: {
      yours: Array<{ productId: string; name: string; sku: string | null; outcome: string | null }>
      elsewhere: Array<{ category: string; attributes: string[]; outcome: string | null }>
    }
  } | null
  recommendations: Array<{
    productId: string; name: string; sku: string | null; price: number; currency: string
    score: number; reasons: string[]; warnings: string[]
  }>
  activity: Array<{
    type: string; sku: string | null; value: number | null; currency: string | null
    surface: string | null; recommendationId: string | null; at: string
  }>
}

export async function getConnectAnalytics(days = 30): Promise<ConnectAnalytics | null> {
  const auth = await getTokenAndBrandId()
  if (!auth) return null
  return apiFetch<ConnectAnalytics>(`/brands/${auth.brandId}/connect/analytics?days=${days}`, auth.token, true)
}

export async function getConnectedConsumers(
  status: 'active' | 'revoked' | 'all' = 'active',
): Promise<ConnectedConsumerRow[]> {
  const auth = await getTokenAndBrandId()
  if (!auth) return []
  const res = await apiFetch<{ consumers: ConnectedConsumerRow[] }>(
    `/brands/${auth.brandId}/connect/consumers?status=${status}`, auth.token, true,
  )
  return res?.consumers ?? []
}

export async function getConnectedConsumer(publicId: string): Promise<ConnectedConsumerDetail | null> {
  const auth = await getTokenAndBrandId()
  if (!auth) return null
  return apiFetch<ConnectedConsumerDetail>(
    `/brands/${auth.brandId}/connect/consumers/${publicId}`, auth.token, true,
  )
}

export interface ConnectPermissions {
  counts: Record<string, number>
  grants: Array<{
    consumerId: string
    status: string
    categories: string[]
    purpose: string
    grantedAt: string
    revokedAt: string | null
    expiresAt: string | null
  }>
  accessLog: Array<{
    action: string
    scoped: number | null
    detail: unknown
    at: string
  }>
}

export async function getConnectPermissions(): Promise<ConnectPermissions | null> {
  const auth = await getTokenAndBrandId()
  if (!auth) return null
  return apiFetch<ConnectPermissions>(`/brands/${auth.brandId}/connect/permissions`, auth.token, true)
}

export interface ConnectSetup {
  brand: { name: string; apiKey: string; accentColor: string; categories: string[] }
  steps: Array<{ key: string; label: string; done: boolean; detail: string }>
  catalog: {
    total: number
    inStock: number
    source: { kind: 'shopify' | 'upload' | 'none'; label: string; connected: boolean }
    lastSyncAt: string | null
    coverage: Array<{ field: string; filled: number; total: number }>
  }
  placements: Array<{ surface: string; shown: number }>
  events: Record<string, number>
}

export interface ConnectInsights {
  cohort: number
  minimumCohort: number
  suppressed: boolean
  catalogSize?: number
  demand: Array<{ attribute: string; wantedPct: number; stockedPct: number; people: number; products: number }>
  unmet: Array<{ attribute: string; wantedPct: number; stockedPct: number; people: number; products: number }>
  overstocked?: Array<{ attribute: string; stockedPct: number; wantedPct: number }>
  avoided?: Array<{ attribute: string; pct: number; people: number }>
  concerns?: Array<{ concern: string; pct: number; people: number }>
  budget: { median: number; sample: number } | null
  outcomes: Array<{
    productId: string; name: string; purchases: number; revenue: number
    addedToCart: number; returns: number; keptPct: number
  }>
}

export async function getConnectSetup(): Promise<ConnectSetup | null> {
  const auth = await getTokenAndBrandId()
  if (!auth) return null
  return apiFetch<ConnectSetup>(`/brands/${auth.brandId}/connect/setup`, auth.token, true)
}

export async function getConnectInsights(): Promise<ConnectInsights | null> {
  const auth = await getTokenAndBrandId()
  if (!auth) return null
  return apiFetch<ConnectInsights>(`/brands/${auth.brandId}/connect/insights`, auth.token, true)
}
