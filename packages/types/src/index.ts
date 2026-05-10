// Re-export all shared types used across apps and API

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

export interface BrandSummary {
  id: string
  name: string
  slug: string
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE'
  active: boolean
  shopifyConnected: boolean
  userCount: number
  productCount: number
}

export interface SkinProfileData {
  fitzpatrickType: number
  skinType: string
  concerns: string[]
  climateType?: string
  monthlyBudget?: number
  currency: string
}

export interface CheckInData {
  skinRating: number
  symptoms: string[]
  notes?: string
  compliant: boolean
  photoUrl?: string
}
