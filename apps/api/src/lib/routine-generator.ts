import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@halite/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Routine structure per beauty area ─────────────────────────────────────

const ROUTINE_STRUCTURES: Record<string, string> = {
  SKINCARE:  'AM steps and PM steps, ordered by application sequence (thinnest to thickest texture)',
  BODY:      'Daily or AM/PM steps — moisturizer, body wash, targeted treatments',
  HAIR:      'Wash day routine and between-wash routine (separate step lists)',
  MAKEUP:    'Application sequence: skin prep → base → eyes → lips → setting',
  FRAGRANCE: 'Single product recommendation with layering suggestions if applicable',
  NAILS:     'Weekly treatment routine and daily maintenance',
  WELLNESS:  'Daily supplement stack — morning and/or evening',
  SUN_CARE:  'Primary SPF recommendation with reapplication guidance',
  LIP_CARE:  'Daily lip care routine and overnight treatment if applicable',
  EYE_CARE:  'AM and PM eye area routine with targeted treatment steps',
}

const STEP_TIMING: Record<string, string[]> = {
  SKINCARE:  ['AM', 'PM'],
  BODY:      ['AM', 'PM'],
  HAIR:      ['WASH_DAY', 'BETWEEN_WASH'],
  MAKEUP:    ['DAILY'],
  FRAGRANCE: ['DAILY'],
  NAILS:     ['DAILY', 'WEEKLY'],
  WELLNESS:  ['AM', 'PM'],
  SUN_CARE:  ['DAILY'],
  LIP_CARE:  ['AM', 'PM'],
  EYE_CARE:  ['AM', 'PM'],
}

// ── Main generator ─────────────────────────────────────────────────────────

export interface GenerateRoutineOptions {
  excludeProductIds?: string[]
  checkInContext?: string
  version?: number
}

export async function generateRoutine(
  userId: string,
  brandId: string,
  sessionId: string,
  area: string,
  answers: Record<string, unknown>,
  options?: GenerateRoutineOptions
) {
  // Load brand + products for this area
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { name: true, focusAreas: true },
  })
  if (!brand) throw new Error('Brand not found')

  const selectedCategories = (answers['SH2B'] as string[]) ?? []
  const budgetRange = ((answers['SH3'] as string) ?? '').split(',')
  const spendMax = budgetRange[1] ? parseFloat(budgetRange[1]) : 9999
  const currency = (answers['SH1_currency'] as string) ?? 'USD'
  const isRoutine = (answers['SH2A'] as string) !== 'SINGLE'

  const excluded = options?.excludeProductIds ?? []

  const products = await prisma.product.findMany({
    where: {
      brandId,
      inStock: true,
      beautyArea: area as any,
      ...(selectedCategories.length > 0
        ? { category: { in: selectedCategories as any } }
        : {}),
      price: { lte: isRoutine ? spendMax : spendMax },
      ...(excluded.length > 0 ? { id: { notIn: excluded } } : {}),
    },
    select: {
      id: true, name: true, description: true, category: true,
      concerns: true, skinTypes: true, monkSkinTones: true,
      keyIngredients: true, price: true, currency: true,
      imageUrl: true, productUrl: true,
    },
    orderBy: { price: 'asc' },
    take: 40,
  })

  if (products.length === 0) {
    await prisma.routine.create({
      data: {
        endUserId: userId,
        quizSessionId: sessionId,
        focusArea: area as any,
        rationale: 'No eligible products found for your profile and budget. Please check back when the catalog is updated.',
      },
    })
    return
  }

  const climateSnapshot = answers['SH1_climate'] as Record<string, unknown> | undefined
  const userProfile = buildUserProfile(area, answers)

  // ── Claude call with prompt caching ───────────────────────────────
  // System prompt (brand catalog) is cached — expensive context paid once.
  // User turn (profile) changes per user.

  const systemPrompt = buildSystemPrompt(brand.name, products, area)
  const userTurn = buildUserTurn(userProfile, climateSnapshot, isRoutine, selectedCategories, spendMax, currency, options?.checkInContext)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // @ts-ignore — cache_control is valid in the API but not yet in SDK types
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userTurn }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const parsed = parseRoutineResponse(raw)

  const inputTokens = response.usage.input_tokens
  const cacheTokens = (response.usage as any).cache_read_input_tokens ?? 0

  // ── Persist routine ────────────────────────────────────────────────
  const timings = STEP_TIMING[area] ?? ['DAILY']
  const reorderDays = reorderDueDays(area)

  const routine = await prisma.routine.create({
    data: {
      endUserId: userId,
      quizSessionId: sessionId,
      focusArea: area as any,
      rationale: parsed.rationale,
      aiPromptTokens: inputTokens - cacheTokens,
      version: options?.version ?? 1,
      reorderDue: new Date(Date.now() + reorderDays * 24 * 60 * 60 * 1000),
      steps: {
        create: parsed.steps
          .filter((s) => products.some((p) => p.id === s.productId))
          .map((s, i) => ({
            productId: s.productId,
            timeOfDay: (timings.includes(s.timeOfDay) ? s.timeOfDay : timings[0]!) as any,
            step: s.step ?? i + 1,
            instruction: s.instruction ?? null,
          })),
      },
    },
    include: {
      steps: { include: { product: true }, orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }] },
    },
  })

  return routine
}

// ── Prompt builders ────────────────────────────────────────────────────────

function buildSystemPrompt(
  brandName: string,
  products: Array<{
    id: string; name: string; description?: string | null; category: string;
    concerns: string[]; skinTypes: string[]; monkSkinTones: number[];
    keyIngredients: string[]; price: number; currency: string;
  }>,
  area: string
): string {
  const productList = products
    .map(
      (p) =>
        `ID:${p.id} | ${p.name} | ${p.category} | Concerns: ${p.concerns.join(', ')} | ` +
        `Skin types: ${p.skinTypes.join(', ')} | Monk Skin Tones: ${p.monkSkinTones.join(', ') || 'all'} | ` +
        `Key ingredients: ${p.keyIngredients.join(', ')} | Price: ${p.price} ${p.currency}`
    )
    .join('\n')

  return `You are a professional beauty advisor for ${brandName}, specializing in ${area.toLowerCase().replace('_', ' ')} routines.

Your job is to build a personalized ${area.toLowerCase().replace('_', ' ')} routine using ONLY the products listed below.
You MUST only recommend products from this exact list — never suggest products not in this catalog.

CATALOG (${products.length} products):
${productList}

ROUTINE STRUCTURE FOR ${area}:
${ROUTINE_STRUCTURES[area] ?? 'Ordered steps from first to last applied.'}

RESPONSE FORMAT — respond with valid JSON only, no markdown fences:
{
  "rationale": "2-3 sentence explanation of why this routine was chosen for this person",
  "steps": [
    {
      "productId": "<exact product ID from catalog>",
      "timeOfDay": "<one of: ${(STEP_TIMING[area] ?? ['DAILY']).join(', ')}>",
      "step": <integer order within that time block, starting at 1>,
      "instruction": "<one specific usage tip for this person's skin/hair/profile>"
    }
  ]
}

Rules:
- For ROUTINE format: recommend 2–6 products maximum (budget permitting)
- For SINGLE format: recommend exactly 1 product
- Sequence products in correct application order (thinnest → thickest for skincare)
- Do NOT recommend products that conflict with sensitivity flags
- Do NOT recommend products that together exceed the user's budget
- Prefer products that match the user's Monk Skin Tone if specified
- If fewer than 2 eligible products exist, set incomplete: true in your JSON`
}

function buildUserTurn(
  profile: Record<string, unknown>,
  climate: Record<string, unknown> | undefined,
  isRoutine: boolean,
  selectedCategories: string[],
  spendMax: number,
  currency: string,
  checkInContext?: string
): string {
  const lines: string[] = [
    `## User Profile`,
    JSON.stringify(profile, null, 2),
  ]

  if (climate) {
    lines.push(`\n## Climate Data (current + 14-day forecast)`)
    lines.push(JSON.stringify(climate, null, 2))
  }

  lines.push(`\n## Preferences`)
  lines.push(`- Format: ${isRoutine ? 'Full routine' : 'Single product recommendation'}`)
  lines.push(`- Budget: up to ${spendMax} ${currency} total`)
  if (selectedCategories.length > 0) {
    lines.push(`- Requested categories: ${selectedCategories.join(', ')}`)
  }

  if (checkInContext) {
    lines.push(`\n## Check-in History`)
    lines.push(checkInContext)
  }

  lines.push(`\nPlease build the most suitable routine for this person using only the products in your catalog.`)

  return lines.join('\n')
}

// ── Answer → profile mapper ────────────────────────────────────────────────

function buildUserProfile(area: string, answers: Record<string, unknown>): Record<string, unknown> {
  const shared = {
    city: (answers['SH1_location'] as Record<string, string> | undefined)?.city,
    country: (answers['SH1_location'] as Record<string, string> | undefined)?.country,
    sleepHours: answers['SH5'],
    stressLevel: answers['SH6'],
    waterIntakeMl: answers['SH4'],
  }

  const ageRange = answers['SH0'] as string | undefined

  const areaProfiles: Record<string, () => Record<string, unknown>> = {
    SKINCARE: () => ({
      ageRange,
      monkSkinTone: answers['S5'],
      skinType: answers['S1'],
      concerns: answers['S4'],
      sensitivity: answers['S3'],
      breakoutFrequency: answers['S2'],
      ...shared,
    }),
    BODY: () => ({
      ageRange,
      bodySkinType: answers['B1'],
      bodyConcerns: answers['B2'],
      shavesOrWaxes: answers['B3'],
      scentPreference: answers['B4'],
      ...shared,
    }),
    HAIR: () => ({
      ageRange,
      hairTexture: answers['H1'],
      curlPattern: answers['H2'],
      scalpCondition: answers['H3'],
      hairConcerns: answers['H4'],
      heatUsage: answers['H5'],
      chemicalTreatments: answers['H6'],
      ...shared,
    }),
    MAKEUP: () => ({
      ageRange,
      undertone: answers['M1'],
      coverage: answers['M2'],
      finish: answers['M3'],
      makeupConcerns: answers['M4'],
      wearDuration: answers['M5'],
      skinType: answers['S1'],
      monkSkinTone: answers['S5'],
      ...shared,
    }),
    FRAGRANCE: () => ({
      ageRange,
      scentFamilies: answers['F1'],
      occasions: answers['F2'],
      longevity: answers['F3'],
      dislikedNotes: answers['F4'],
      ...shared,
    }),
    NAILS: () => ({
      ageRange,
      nailCondition: answers['N1'],
      nailConcerns: answers['N2'],
      enhancements: answers['N3'],
      nailGoals: answers['N4'],
      ...shared,
    }),
    WELLNESS: () => ({
      ageRange,
      wellnessGoals: answers['W1'],
      dietaryRestrictions: answers['W2'],
      currentSupplements: answers['W3'],
      ...shared,
    }),
    SUN_CARE: () => ({
      ageRange,
      outdoorTime: answers['SC1'],
      activities: answers['SC2'],
      spfType: answers['SC3'],
      spfTexture: answers['SC4'],
      wearUnderMakeup: answers['SC5'],
      monkSkinTone: answers['S5'],
      ...shared,
    }),
    LIP_CARE: () => ({
      ageRange,
      lipCondition: answers['L1'],
      lipNeeds: answers['L2'],
      wearsMakeup: answers['L3'],
      ...shared,
    }),
    EYE_CARE: () => ({
      ageRange,
      eyeConcerns: answers['E1'],
      wearsContacts: answers['E2'],
      wearsEyeMakeup: answers['E3'],
      monkSkinTone: answers['S5'],
      ...shared,
    }),
  }

  return areaProfiles[area]?.() ?? shared
}

// ── Response parser ────────────────────────────────────────────────────────

interface RoutineStep {
  productId: string
  timeOfDay: string
  step?: number
  instruction?: string
}

interface ParsedRoutine {
  rationale: string
  steps: RoutineStep[]
}

function parseRoutineResponse(raw: string): ParsedRoutine {
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned) as ParsedRoutine
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error('No steps array in response')
    }
    return parsed
  } catch {
    console.error('Failed to parse Claude routine response:', raw)
    return { rationale: 'Routine could not be generated at this time.', steps: [] }
  }
}

// ── Reorder cadence per area ───────────────────────────────────────────────

export function reorderDueDays(area: string): number {
  const cadence: Record<string, number> = {
    SKINCARE: 45,
    BODY: 60,
    HAIR: 45,
    MAKEUP: 90,
    FRAGRANCE: 90,
    NAILS: 30,
    WELLNESS: 30,
    SUN_CARE: 30,
    LIP_CARE: 30,
    EYE_CARE: 60,
  }
  return cadence[area] ?? 45
}
