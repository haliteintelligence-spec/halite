import {
  QUESTIONS_BY_AREA,
  SHARED_QUESTIONS,
  type QuizQuestion,
  type QuizOption,
} from './quiz-questions.js'

type BeautyArea =
  | 'SKINCARE' | 'BODY' | 'HAIR' | 'MAKEUP' | 'FRAGRANCE'
  | 'NAILS' | 'WELLNESS' | 'SUN_CARE' | 'LIP_CARE' | 'EYE_CARE'

type RoutineFormat = 'SINGLE' | 'ROUTINE'

// ── Category suggestions per area + concern ───────────────────────────────

const CATEGORY_DEFAULTS: Record<BeautyArea, string[]> = {
  SKINCARE:   ['CLEANSER', 'MOISTURIZER', 'SPF'],
  BODY:       ['BODY_MOISTURIZER', 'BODY_WASH'],
  HAIR:       ['SHAMPOO', 'CONDITIONER'],
  MAKEUP:     ['FOUNDATION', 'SETTING_SPRAY'],
  FRAGRANCE:  ['EAU_DE_PARFUM'],
  NAILS:      ['NAIL_TREATMENT'],
  WELLNESS:   ['SUPPLEMENT'],
  SUN_CARE:   ['SPF', 'BODY_SPF'],
  LIP_CARE:   ['LIP_BALM'],
  EYE_CARE:   ['EYE_CREAM'],
}

const CONCERN_CATEGORY_MAP: Record<string, string[]> = {
  // Skincare concerns
  ACNE:               ['SERUM', 'SPOT_TREATMENT', 'TONER', 'EXFOLIANT'],
  HYPERPIGMENTATION:  ['SERUM', 'TONER', 'SPF', 'EXFOLIANT'],
  AGING:              ['SERUM', 'EYE_CREAM', 'FACIAL_OIL', 'SPF'],
  DRYNESS:            ['SERUM', 'FACIAL_OIL', 'MASK'],
  OILINESS:           ['TONER', 'MIST', 'SPOT_TREATMENT'],
  REDNESS:            ['SERUM', 'MIST'],
  DULLNESS:           ['EXFOLIANT', 'SERUM', 'MASK'],
  UNEVEN_TEXTURE:     ['EXFOLIANT', 'TONER', 'SERUM'],
  DARK_CIRCLES:       ['EYE_CREAM', 'EYE_PATCHES'],
  PORES:              ['TONER', 'SERUM', 'MASK'],
  DEHYDRATION:        ['SERUM', 'MIST', 'MASK'],
  SENSITIVITY:        ['SERUM', 'MIST'],
  // Body concerns
  stretch_marks:      ['BODY_OIL', 'BODY_TREATMENT'],
  cellulite:          ['BODY_TREATMENT', 'BODY_OIL'],
  keratosis_pilaris:  ['BODY_SCRUB', 'BODY_MOISTURIZER'],
  body_acne:          ['BODY_WASH', 'BODY_TREATMENT'],
  ingrown_hairs:      ['BODY_SCRUB', 'BODY_TREATMENT'],
  // Hair concerns
  frizz:              ['LEAVE_IN', 'STYLING', 'HAIR_OIL'],
  breakage:           ['HAIR_MASK', 'HAIR_OIL', 'LEAVE_IN'],
  dandruff:           ['SCALP_TREATMENT', 'SHAMPOO'],
  thinning:           ['SCALP_TREATMENT', 'SUPPLEMENT'],
  curl_definition:    ['LEAVE_IN', 'STYLING'],
  color_damage:       ['HAIR_MASK', 'LEAVE_IN'],
  heat_damage:        ['HAIR_MASK', 'HAIR_OIL'],
  oily_scalp:         ['SCALP_TREATMENT', 'SHAMPOO'],
  // Eye concerns
  dark_circles:       ['EYE_CREAM', 'EYE_PATCHES'],
  puffiness:          ['EYE_PATCHES', 'EYE_CREAM'],
  fine_lines:         ['EYE_CREAM', 'SERUM'],
  sparse_lashes:      ['LASH_SERUM'],
  sparse_brows:       ['BROW_SERUM'],
  // Nail concerns
  brittle_breaking:   ['NAIL_TREATMENT', 'CUTICLE_OIL'],
  slow_growth:        ['NAIL_TREATMENT', 'COLLAGEN'],
  dry_cuticles:       ['CUTICLE_OIL'],
}

// ── Budget options ────────────────────────────────────────────────────────

function buildBudgetOptions(format: RoutineFormat, currency: string): QuizOption[] {
  const symbol = currencySymbol(currency)
  if (format === 'SINGLE') {
    return [
      { value: '0,25', label: `Under ${symbol}25` },
      { value: '25,50', label: `${symbol}25 – ${symbol}50` },
      { value: '50,100', label: `${symbol}50 – ${symbol}100` },
      { value: '100,200', label: `${symbol}100 – ${symbol}200` },
      { value: '200,9999', label: `${symbol}200+` },
    ]
  }
  return [
    { value: '0,75', label: `Under ${symbol}75` },
    { value: '75,150', label: `${symbol}75 – ${symbol}150` },
    { value: '150,300', label: `${symbol}150 – ${symbol}300` },
    { value: '300,500', label: `${symbol}300 – ${symbol}500` },
    { value: '500,9999', label: `${symbol}500+` },
  ]
}

function currencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$', NGN: '₦',
    ZAR: 'R', KES: 'KSh', GHS: '₵', INR: '₹', JPY: '¥', CNY: '¥',
    AED: 'AED ', SAR: 'SAR ', BRL: 'R$', MXN: 'MX$',
  }
  return symbols[code] ?? `${code} `
}

// ── Category option builder ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  CLEANSER: 'Cleanser', TONER: 'Toner', SERUM: 'Serum', MOISTURIZER: 'Moisturizer',
  EYE_CREAM: 'Eye cream', SPF: 'SPF / Sunscreen', MASK: 'Face mask', EXFOLIANT: 'Exfoliant',
  FACIAL_OIL: 'Facial oil', MIST: 'Facial mist', SPOT_TREATMENT: 'Spot treatment',
  BODY_WASH: 'Body wash', BODY_MOISTURIZER: 'Body moisturizer', BODY_OIL: 'Body oil',
  BODY_SCRUB: 'Body scrub', BODY_TREATMENT: 'Body treatment', BODY_SPF: 'Body SPF',
  SHAMPOO: 'Shampoo', CONDITIONER: 'Conditioner', HAIR_MASK: 'Hair mask',
  SCALP_TREATMENT: 'Scalp treatment', LEAVE_IN: 'Leave-in conditioner',
  HAIR_OIL: 'Hair oil', STYLING: 'Styling product',
  PRIMER: 'Primer', FOUNDATION: 'Foundation / Tinted moisturizer', CONCEALER: 'Concealer',
  BLUSH_BRONZER: 'Blush / Bronzer', EYE_MAKEUP: 'Eye makeup', LIP_COLOR: 'Lip color',
  SETTING_SPRAY: 'Setting spray', SETTING_POWDER: 'Setting powder', COLOR_CORRECTOR: 'Color corrector',
  EAU_DE_PARFUM: 'Eau de parfum', EAU_DE_TOILETTE: 'Eau de toilette',
  BODY_MIST_SCENTED: 'Scented body mist', HAIR_MIST: 'Hair mist',
  NAIL_TREATMENT: 'Nail treatment', NAIL_COLOR: 'Nail color', CUTICLE_OIL: 'Cuticle oil',
  BASE_COAT: 'Base coat', TOP_COAT: 'Top coat',
  SUPPLEMENT: 'Beauty supplement', COLLAGEN: 'Collagen',
  LIP_BALM: 'Lip balm', LIP_TREATMENT: 'Lip treatment', LIP_PLUMPER: 'Lip plumper',
  LASH_SERUM: 'Lash serum', BROW_SERUM: 'Brow serum', EYE_PATCHES: 'Eye patches',
}

function buildCategoryOptions(
  areas: BeautyArea[],
  answers: Record<string, unknown>
): QuizOption[] {
  const suggested = new Set<string>()

  // Always include defaults for each area
  for (const area of areas) {
    for (const cat of CATEGORY_DEFAULTS[area] ?? []) suggested.add(cat)
  }

  // Add concern-based suggestions
  const concerns = [
    ...((answers['S4'] as string[]) ?? []),
    ...((answers['B2'] as string[]) ?? []),
    ...((answers['H4'] as string[]) ?? []),
    ...((answers['E1'] as string[]) ?? []),
    ...((answers['N1'] as string[]) ?? []),
  ]
  for (const concern of concerns) {
    for (const cat of CONCERN_CATEGORY_MAP[concern] ?? []) suggested.add(cat)
  }

  return [...suggested]
    .filter((cat) => cat in CATEGORY_LABELS)
    .map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat]! }))
}

// ── Main quiz builder ─────────────────────────────────────────────────────

export interface QuizFlow {
  // Present an area selector if brand has multiple focus areas
  areaSelector: { question: string; options: QuizOption[] } | null
  // Ordered blocks of questions
  blocks: Array<{ area: string; questions: QuizQuestion[] }>
  // IDs of questions that are deduplicated (e.g. Fitzpatrick shared between SKINCARE + SUN_CARE)
  deduped: string[]
}

export function buildQuizFlow(
  brandFocusAreas: BeautyArea[],
  selectedAreas: BeautyArea[],          // user's area selection (from SH area_select step)
  answers: Record<string, unknown> = {},
  currency = 'USD',
  routineFormat: RoutineFormat = 'ROUTINE'
): QuizFlow {
  const areas = selectedAreas.length > 0 ? selectedAreas : brandFocusAreas

  const areaSelector =
    brandFocusAreas.length > 1
      ? {
          question: 'What would you like to focus on today?',
          options: brandFocusAreas.map((a) => ({
            value: a,
            label: AREA_LABELS[a] ?? a,
          })),
        }
      : null

  // Collect all questions for selected areas
  const seen = new Set<string>()
  const deduped: string[] = []
  const blocks: QuizFlow['blocks'] = []

  // Area-specific blocks
  for (const area of areas) {
    const qs = (QUESTIONS_BY_AREA[area] ?? []).filter((q) => {
      if (seen.has(q.id)) { deduped.push(q.id); return false }
      seen.add(q.id)
      return true
    })
    if (qs.length > 0) blocks.push({ area, questions: qs })
  }

  // Shared block — built dynamically
  const sharedQs = buildSharedQuestions(areas, answers, currency, routineFormat, seen)
  blocks.push({ area: 'SHARED', questions: sharedQs })

  return { areaSelector, blocks, deduped }
}

function buildSharedQuestions(
  areas: BeautyArea[],
  answers: Record<string, unknown>,
  currency: string,
  routineFormat: RoutineFormat,
  seen: Set<string>
): QuizQuestion[] {
  const qs: QuizQuestion[] = []

  for (const q of SHARED_QUESTIONS) {
    if (seen.has(q.id)) continue
    seen.add(q.id)

    if (q.id === 'SH2B') {
      // Inject dynamic category options
      qs.push({ ...q, options: buildCategoryOptions(areas, answers) })
    } else if (q.id === 'SH3') {
      // Inject budget options + copy based on format
      const isSingle = routineFormat === 'SINGLE'
      qs.push({
        ...q,
        question: isSingle
          ? 'How much are you looking to spend on this product?'
          : 'What is your total budget for this routine?',
        options: buildBudgetOptions(routineFormat, currency),
      })
    } else {
      qs.push(q)
    }
  }

  return qs
}

const AREA_LABELS: Record<BeautyArea, string> = {
  SKINCARE:  'Skincare',
  BODY:      'Body Care',
  HAIR:      'Hair Care',
  MAKEUP:    'Makeup & Color',
  FRAGRANCE: 'Fragrance',
  NAILS:     'Nail Care',
  WELLNESS:  'Wellness & Supplements',
  SUN_CARE:  'Sun Care',
  LIP_CARE:  'Lip Care',
  EYE_CARE:  'Eye & Brow Care',
}
