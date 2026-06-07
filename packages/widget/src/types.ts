export interface QuizOption {
  value: string
  label: string
  description?: string
  swatchColor?: string
}

export interface QuizQuestion {
  id: string
  area: string
  type: 'single' | 'multi' | 'scale' | 'text' | 'date' | 'unit_select' | 'area_select' | 'location'
  question: string
  subtext?: string
  options?: QuizOption[]
  units?: Array<{ unit: string; label: string; options: QuizOption[] }>
  scaleMin?: string
  scaleMax?: string
  scaleSteps?: number
  required?: boolean
}

export interface RoutineStep {
  id: string
  step: number
  timeOfDay: string
  instruction: string
  product: {
    id: string
    name: string
    category: string
    price: number
    currency: string
    keyIngredients: string[]
    description: string
    productUrl?: string | null
    shopifyVariantId?: string | null
  }
}

export interface Routine {
  id: string
  area?: string
  focusArea: string
  steps: RoutineStep[]
}

export interface CheckInProduct {
  productId: string
  used: boolean
  reaction?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  product: { id: string; name: string }
}

export interface CheckIn {
  id: string
  date: string
  skinRating: number
  symptoms: string[]
  notes?: string
  compliant: boolean
  products: CheckInProduct[]
}

export interface ReorderItem {
  product: {
    id: string
    name: string
    price: number
    currency: string
    imageUrl?: string | null
    productUrl?: string | null
    category: string
  }
  routineArea: string
  reorderDue: string | null
  daysUntil: number | null
  urgency: 'overdue' | 'soon' | 'upcoming' | 'none'
}

export interface WidgetConfig {
  apiKey: string
  apiUrl: string
  accentColor: string
}
