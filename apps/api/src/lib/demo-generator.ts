import bcrypt from 'bcryptjs'
import { prisma } from '@halite/db'
import { generateRoutine } from './routine-generator.js'
import { runAgentWorkflow } from './agent-runner.js'
import type { PurchaseMatrix } from './purchase-history-processor.js'

// ── Pre-built workflow definitions ────────────────────────────────────────────

const PREBUILT_WORKFLOWS = [
  {
    name: 'Routine Outcome Agent',
    description: 'Analyses consumer profiles, ingredient interactions, and check-in trajectories to predict routine efficacy and recommend adaptive changes.',
    type: 'ROUTINE_OUTCOME' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['consumers', 'checkIns', 'products', 'routines'],
      objectivePrompt: `You are a beauty intelligence agent for {{brand_name}}.
Analyse the following consumer profiles, their assigned routines, and check-in outcome data.

Identify:
1. Which routine configurations are producing the best skin rating improvements (week-over-week)
2. Any ingredient combinations that correlate with negative outcomes (irritation, REDNESS, BREAKOUT symptoms)
3. Consumer segments where efficacy is below average, with specific hypotheses for why
4. Three concrete routine modifications the brand should make, ranked by projected impact

Consumer data: {{consumer_profiles}}
Routine data: {{routine_assignments}}
Check-in outcomes: {{recent_check_ins}}
Product catalog: {{product_catalog}}`,
      outputSchema: { type: 'insight_cards', maxCards: 5, includeRecommendations: true },
      filters: { minCheckIns: 3 },
    },
  },
  {
    name: 'Churn & Dissatisfaction Prediction',
    description: 'Monitors engagement signals, compliance drops, and sentiment changes to predict at-risk consumers before they abandon their routine.',
    type: 'CHURN_PREDICTION' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_daily',
      dataSources: ['consumers', 'checkIns', 'routines'],
      objectivePrompt: `You are a retention intelligence agent for {{brand_name}}.
Analyse consumer check-in patterns, compliance rates, and skin rating trajectories.

Identify consumers at elevated churn risk using these signals:
- Declining skin ratings over last 3 check-ins
- Compliance dropping below 50% in the last 2 weeks
- Negative symptom frequency increasing (BREAKOUT, IRRITATION, REDNESS)
- No check-in in the last 14 days

For each at-risk segment, provide:
1. Risk level (HIGH / MEDIUM)
2. Most likely root cause (product mismatch, over-exfoliation, wrong routine for climate, etc.)
3. Specific intervention: product swap, routine simplification, or educational message
4. Expected retention lift if intervention is applied

Consumer data: {{consumer_profiles}}
Check-in history: {{recent_check_ins}}`,
      outputSchema: { type: 'risk_alerts', includeInterventions: true },
      filters: { minCheckIns: 2 },
    },
  },
  {
    name: 'Product Intelligence Agent',
    description: 'Aggregates outcome patterns, ingredient correlations, and cohort performance to surface formulation opportunities and white space.',
    type: 'PRODUCT_INTELLIGENCE' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['products', 'checkIns', 'consumers'],
      objectivePrompt: `You are a product intelligence agent for {{brand_name}}.
Analyse consumer outcomes correlated with product usage and ingredient profiles.

Surface:
1. Which specific ingredients are consistently correlated with positive outcomes across which skin concern cohorts
2. Any formulation weaknesses — ingredients or combinations that appear in routines with below-average outcomes
3. Unmet needs: consumer concern segments that are underserved by the current catalog
4. One formulation opportunity: a specific ingredient pairing or product gap with estimated consumer addressable market size

Product catalog: {{product_catalog}}
Consumer profiles: {{consumer_profiles}}
Check-in outcomes: {{recent_check_ins}}`,
      outputSchema: { type: 'insight_cards', maxCards: 4, includeOpportunities: true },
      filters: {},
    },
  },
  {
    name: 'Personalized Conversion Agent',
    description: 'For a given consumer profile, predicts best-fit products and likelihood of routine success using longitudinal cohort data.',
    type: 'CONVERSION' as const,
    isPrebuilt: true,
    config: {
      trigger: 'manual',
      dataSources: ['consumers', 'products', 'checkIns'],
      objectivePrompt: `You are a personalized recommendation agent for {{brand_name}}.
Given a consumer's profile, identify the top 3 product combinations most likely to produce positive outcomes.

For each recommendation:
1. State the confidence level (%) based on how similar consumers have responded
2. Explain the ingredient rationale for this consumer's specific profile
3. Flag any risk factors (e.g. "retinol not recommended for sensitive skin consumers in dry climates")
4. Predict the outcome trajectory over 4–6 weeks if the routine is followed

Consumer profile: {{consumer_profiles}}
Available products: {{product_catalog}}
Cohort benchmark data: {{recent_check_ins}}`,
      outputSchema: { type: 'product_recommendations', maxItems: 3, includeConfidence: true },
      filters: {},
    },
  },
  {
    name: 'Executive Intelligence Agent',
    description: 'Autonomous weekly scan of the full consumer base — surfaces risks, opportunities, anomalies, and strategic recommendations for leadership.',
    type: 'EXECUTIVE_INTELLIGENCE' as const,
    isPrebuilt: true,
    config: {
      trigger: 'scheduled_weekly',
      dataSources: ['consumers', 'checkIns', 'products', 'routines'],
      objectivePrompt: `You are an executive intelligence agent for {{brand_name}}.
Produce a strategic briefing from this week's consumer data.

Your briefing must cover:
1. RETENTION: Any notable shifts in compliance, check-in frequency, or rating trends this week
2. PRODUCT PERFORMANCE: Top performer and underperformer, with data rationale
3. CONSUMER COHORTS: Any emerging segment showing unusual patterns (positive or negative)
4. RISK SIGNAL: One concrete risk the brand should act on in the next 7 days
5. OPPORTUNITY: One data-backed opportunity to improve consumer outcomes or revenue

Be specific. Use numbers. Reference actual product names and concern types.
Write in a direct, executive-briefing tone — no fluff.

Full brand data snapshot: {{full_brand_snapshot}}`,
      outputSchema: { type: 'executive_briefing', sections: 5 },
      filters: {},
    },
  },
]

// ── Name banks for synthetic consumers ───────────────────────────────────────

const FIRST_NAMES = [
  'Aisha','Brianna','Chloe','Danielle','Elena','Fatima','Grace','Hannah','Imani','Jade',
  'Kezia','Layla','Maya','Nadia','Olivia','Priya','Quinn','Rachel','Sofia','Tara',
  'Uma','Victoria','Wendy','Xara','Yasmin','Zoe','Amara','Beth','Camille','Diana',
  'Esther','Fiona','Gabi','Hana','Iris','Jess','Kira','Leila','Mia','Nia',
  'Obi','Phoebe','Rosa','Sage','Tina','Ursula','Vera','Wren','Xena','Yara',
]
const LAST_NAMES = [
  'Adams','Baker','Carter','Davis','Evans','Foster','Garcia','Harris','Iyer','Jones',
  'Kim','Lopez','Martin','Nguyen','Osei','Patel','Quinn','Rivera','Smith','Taylor',
  'Ueda','Vargas','Walker','Xu','Young','Zhang','Adeyemi','Brooks','Chen','Diaz',
]

const AGE_RANGES = ['18_24','25_34','25_34','35_44','35_44','45_54','55_64']
const SKIN_TYPES = ['DRY','OILY','COMBINATION','COMBINATION','NORMAL','SENSITIVE']
const CONCERN_POOL = ['ACNE','HYPERPIGMENTATION','AGING','SENSITIVITY','DRYNESS','OILINESS','REDNESS','DULLNESS','UNEVEN_TEXTURE','PORES','DEHYDRATION']

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]! }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function randomSlug4() {
  return Math.random().toString(36).slice(2, 6)
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export interface DemoProvisionParams {
  prospectName: string
  createdByAdminId: string
  focusAreas: string[]
  consumerCount: number
  purchaseMatrix?: PurchaseMatrix | undefined
  existingBrandId?: string | undefined
}

export interface DemoProvisionResult {
  brandId: string
  slug: string
  loginUrl: string
  email: string
  password: string
  expiresAt: Date
  stats: {
    products: number
    consumers: number
    routines: number
    checkIns: number
  }
}

export async function provisionDemoEnvironment(
  params: DemoProvisionParams,
): Promise<DemoProvisionResult> {
  const { prospectName, createdByAdminId, focusAreas, consumerCount, purchaseMatrix, existingBrandId } = params

  let slug: string
  let brand: { id: string; slug: string }

  if (existingBrandId) {
    // Brand already created by API route — just fetch it
    const existing = await prisma.brand.findUnique({ where: { id: existingBrandId }, select: { id: true, slug: true } })
    if (!existing) throw new Error(`Brand ${existingBrandId} not found`)
    brand = existing
    slug = existing.slug
  } else {
    slug = `${slugify(prospectName)}-demo-${randomSlug4()}`
    const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    brand = await prisma.brand.create({
      data: {
        name: prospectName,
        slug,
        isDemo: true,
        demoProspectName: prospectName,
        demoCreatedBy: createdByAdminId,
        demoLinkExpiresAt: expiresAt,
        focusAreas: focusAreas as any,
        primaryColor: '#C17A47',
        active: true,
      },
    })
  }

  const email = `admin@${slug}.halite`
  const password = `demo-${slug}`
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)

  // 2. Create BrandAdmin login (skip if already exists)
  const existingAdmin = await prisma.brandAdmin.findFirst({ where: { brandId: brand.id } })
  if (!existingAdmin) {
    const hashedPw = await bcrypt.hash(password, 12)
    await prisma.brandAdmin.create({
      data: {
        brandId: brand.id,
        email,
        password: hashedPw,
        name: `${prospectName} Demo`,
        role: 'OWNER',
      },
    })
  }

  // 3. QuizConfig (upsert)
  await prisma.quizConfig.upsert({
    where: { brandId: brand.id },
    update: { enabledAreas: focusAreas as any },
    create: {
      brandId: brand.id,
      enabledAreas: focusAreas as any,
      questionOverrides: {},
      customQuestions: [],
    },
  })

  // 4. Get ingested products
  const products = await prisma.product.findMany({
    where: { brandId: brand.id },
    select: {
      id: true, name: true, category: true, beautyArea: true,
      concerns: true, skinTypes: true, monkSkinTones: true,
      price: true, currency: true, keyIngredients: true,
      externalId: true,
    },
  })

  // 5. Analyse product catalog to calibrate consumer profiles
  const catalogProfile = analyzeProductCatalog(products)

  // 6. Build purchase frequency if provided
  const productFreq = purchaseMatrix ? buildProductFrequency(purchaseMatrix, products) : {}

  // 7. Generate synthetic consumers + quiz sessions
  const count = Math.min(Math.max(consumerCount, 50), 200)
  const consumerIds = await generateConsumers(brand.id, count, catalogProfile, productFreq)

  // 8. Generate routines (batched, 10 at a time)
  const routineCount = await generateRoutines(brand.id, consumerIds, focusAreas)

  // 9. Generate check-ins (8 simulated weeks)
  const checkInCount = await generateCheckIns(brand.id, consumerIds, 8, catalogProfile)

  // 10. Seed pre-built agent workflows
  await seedAgentWorkflows(brand.id)

  // Update brand's demoLinkExpiresAt to reflect actual expiry
  const finalExpiry = existingBrandId
    ? (await prisma.brand.findUnique({ where: { id: brand.id }, select: { demoLinkExpiresAt: true } }))?.demoLinkExpiresAt ?? expiresAt
    : expiresAt

  return {
    brandId: brand.id,
    slug,
    loginUrl: `${process.env.DASHBOARD_URL ?? 'https://dashboard.haliteintelligence.com'}/${slug}/login`,
    email,
    password,
    expiresAt: finalExpiry,
    stats: {
      products: products.length,
      consumers: consumerIds.length,
      routines: routineCount,
      checkIns: checkInCount,
    },
  }
}

// ── Catalog analysis ──────────────────────────────────────────────────────────

interface CatalogProfile {
  dominantConcerns: string[]
  hasAntiAging: boolean
  hasAcne: boolean
  hasPigmentation: boolean
  hasSensitivity: boolean
  areas: string[]
}

function analyzeProductCatalog(products: Array<{ concerns: string[]; beautyArea: string; category: string }>): CatalogProfile {
  const concernFreq: Record<string, number> = {}
  for (const p of products) {
    for (const c of p.concerns) concernFreq[c] = (concernFreq[c] ?? 0) + 1
  }
  const dominantConcerns = Object.entries(concernFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c)

  return {
    dominantConcerns,
    hasAntiAging: !!concernFreq['AGING'],
    hasAcne: !!concernFreq['ACNE'],
    hasPigmentation: !!concernFreq['HYPERPIGMENTATION'],
    hasSensitivity: !!concernFreq['SENSITIVITY'],
    areas: [...new Set(products.map(p => p.beautyArea))],
  }
}

function buildProductFrequency(
  matrix: PurchaseMatrix,
  products: Array<{ id: string; name: string; externalId: string | null }>,
): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const purchases of Object.values(matrix)) {
    for (const [pid, qty] of Object.entries(purchases)) {
      // Match by externalId or name
      const product = products.find(p =>
        p.externalId === pid || p.name.toLowerCase() === pid.toLowerCase()
      )
      const key = product?.id ?? pid
      freq[key] = (freq[key] ?? 0) + qty
    }
  }
  return freq
}

// ── Consumer generation ───────────────────────────────────────────────────────

async function generateConsumers(
  brandId: string,
  count: number,
  catalog: CatalogProfile,
  productFreq: Record<string, number>,
): Promise<string[]> {
  const usedNames = new Set<string>()
  const ids: string[] = []

  // Weight age ranges based on catalog
  const ageWeights = catalog.hasAntiAging
    ? ['25_34','35_44','35_44','45_54','45_54','55_64','18_24']
    : ['18_24','25_34','25_34','35_44','45_54','55_64']

  for (let i = 0; i < count; i++) {
    let firstName: string, lastName: string, fullName: string
    do {
      firstName = randomItem(FIRST_NAMES)
      lastName = randomItem(LAST_NAMES)
      fullName = `${firstName} ${lastName}`
    } while (usedNames.has(fullName))
    usedNames.add(fullName)

    const emailSuffix = ['gmail.com','yahoo.com','outlook.com','icloud.com','hotmail.com']
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1,99)}@${randomItem(emailSuffix)}`

    // Calibrate profile to catalog
    const ageRange = randomItem(ageWeights)
    const skinType = randomItem(SKIN_TYPES)

    // Weight concerns toward catalog's dominant concerns
    const numConcerns = randomInt(2, 4)
    const weightedPool = [
      ...catalog.dominantConcerns,
      ...catalog.dominantConcerns, // double-weight
      ...CONCERN_POOL,
    ]
    const concerns = shuffle([...new Set(weightedPool)]).slice(0, numConcerns)

    const monkTone = randomInt(1, 10)

    const endUser = await prisma.endUser.create({
      data: {
        brandId,
        email,
        firstName,
        lastName,
      },
    })

    await prisma.userBeautyProfile.create({
      data: {
        endUserId: endUser.id,
        ageRange,
        skinType: skinType as any,
        skinConcerns: concerns as any,
        monkSkinTone: monkTone,
        completedAreas: catalog.areas as any,
        sleepHours: randomItem([6, 6.5, 7, 7.5, 8, 8.5]),
        stressLevel: randomInt(1, 5),
        waterIntakeMl: randomInt(1000, 3000),
      },
    })

    ids.push(endUser.id)
  }

  return ids
}

// ── Routine generation ────────────────────────────────────────────────────────

async function generateRoutines(
  brandId: string,
  consumerIds: string[],
  focusAreas: string[],
): Promise<number> {
  // Create quiz sessions first
  const sessionMap: Record<string, string> = {}

  for (const userId of consumerIds) {
    const profile = await prisma.userBeautyProfile.findUnique({
      where: { endUserId: userId },
      select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
    })

    const answers: Record<string, unknown> = {
      __area_select: focusAreas,
      SH0: profile?.ageRange ?? '25_34',
      S1: profile?.skinType?.toLowerCase() ?? 'combination',
      S4: profile?.skinConcerns ?? [],
      S5: String(profile?.monkSkinTone ?? 5),
    }

    const session = await prisma.quizSession.create({
      data: {
        brandId,
        endUserId: userId,
        selectedAreas: focusAreas as any,
        answers: answers as any,
        completed: true,
        completedAt: new Date(Date.now() - randomInt(7, 60) * 24 * 60 * 60 * 1000),
      },
    })
    sessionMap[userId] = session.id
  }

  // Generate routines in batches of 10
  let routineCount = 0
  const BATCH_SIZE = 10

  for (let i = 0; i < consumerIds.length; i += BATCH_SIZE) {
    const batch = consumerIds.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async userId => {
        const sessionId = sessionMap[userId]!
        const profile = await prisma.userBeautyProfile.findUnique({
          where: { endUserId: userId },
          select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
        })

        const answers: Record<string, unknown> = {
          __area_select: focusAreas,
          SH0: profile?.ageRange ?? '25_34',
          S1: profile?.skinType?.toLowerCase() ?? 'combination',
          S4: profile?.skinConcerns ?? [],
          S5: String(profile?.monkSkinTone ?? 5),
        }

        for (const area of focusAreas) {
          try {
            await generateRoutine(userId, brandId, sessionId, area, answers)
            routineCount++
          } catch { /* skip if product catalog too sparse for this area */ }
        }
      })
    )
  }

  return routineCount
}

// ── Check-in generation ───────────────────────────────────────────────────────

const NEGATIVE_SYMPTOMS = ['BREAKOUT','DRYNESS','REDNESS','IRRITATION','PURGING','OILINESS','DULLNESS']
const POSITIVE_SYMPTOMS = ['IMPROVEMENT','GLOW','HYDRATED','TEXTURE_SMOOTH']

async function generateCheckIns(
  brandId: string,
  consumerIds: string[],
  weeks: number,
  catalog: CatalogProfile,
): Promise<number> {
  let totalCheckIns = 0
  const now = Date.now()

  for (const userId of consumerIds) {
    const routine = await prisma.routine.findFirst({
      where: { endUserId: userId, activeTo: null },
      include: { steps: { include: { product: true } } },
    })

    // 15% of consumers drop off after week 3 (realistic compliance arc)
    const dropOffWeek = Math.random() < 0.15 ? randomInt(3, 5) : weeks + 1

    for (let w = 0; w < weeks; w++) {
      if (w >= dropOffWeek) continue

      const checkInDate = new Date(now - (weeks - w) * 7 * 24 * 60 * 60 * 1000)
      // Offset by ±2 days for realism
      checkInDate.setDate(checkInDate.getDate() + randomInt(-2, 2))

      // Rating arc: starts 2–3, trends up to 3.5–4.5 by end
      const baseRating = 2.5 + (w / weeks) * 1.5
      const skinRating = Math.min(5, Math.max(1, Math.round(baseRating + (Math.random() - 0.5))))

      // Compliance: higher early, slight dip around week 4-5
      const complianceProbability = w < 3 ? 0.9 : w < 5 ? 0.75 : 0.85
      const compliant = Math.random() < complianceProbability

      // Symptoms: negative early, more positive later
      const negativeWeight = Math.max(0, 0.6 - (w / weeks) * 0.5)
      const symptoms: string[] = []
      if (Math.random() < negativeWeight && catalog.dominantConcerns.length > 0) {
        symptoms.push(randomItem(catalog.dominantConcerns.filter(c => NEGATIVE_SYMPTOMS.includes(c))))
      }
      if (Math.random() < 0.3 + (w / weeks) * 0.4) {
        symptoms.push(randomItem(POSITIVE_SYMPTOMS))
      }

      // Product reactions
      const products: Array<{ productId: string; used: boolean; reaction?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }> = []
      if (routine) {
        const seen = new Set<string>()
        for (const step of routine.steps) {
          if (seen.has(step.productId)) continue
          seen.add(step.productId)

          const used = compliant || Math.random() > 0.3
          const reactionRoll = Math.random()
          const reaction: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | undefined = used
            ? reactionRoll > 0.75 ? 'POSITIVE' : reactionRoll > 0.25 ? 'NEUTRAL' : 'NEGATIVE'
            : undefined

          products.push({ productId: step.productId, used, ...(reaction !== undefined ? { reaction } : {}) })
        }
      }

      await prisma.checkIn.create({
        data: {
          endUserId: userId,
          date: checkInDate,
          skinRating,
          symptoms: symptoms.filter(Boolean) as any,
          compliant,
          products: {
            create: products.map(p => ({
              product: { connect: { id: p.productId } },
              used: p.used,
              ...(p.reaction !== undefined ? { reaction: p.reaction } : {}),
            })),
          },
        },
      })
      totalCheckIns++
    }
  }

  return totalCheckIns
}

// ── Agent workflow seeding ────────────────────────────────────────────────────

async function seedAgentWorkflows(brandId: string): Promise<void> {
  // Create all workflow records first
  const workflows = await Promise.all(
    PREBUILT_WORKFLOWS.map(wf =>
      prisma.agentWorkflow.create({
        data: {
          brandId,
          name: wf.name,
          description: wf.description,
          type: wf.type,
          config: wf.config as any,
          isActive: true,
          isPrebuilt: wf.isPrebuilt,
        },
      })
    )
  )

  // Run all workflows in parallel so demo shows completed results
  await Promise.allSettled(
    workflows.map(wf => runAgentWorkflow(wf, brandId).catch(console.error))
  )
}
