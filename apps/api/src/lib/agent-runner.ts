import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@halite/db'
// AgentWorkflow type inlined to avoid module resolution issues
interface AgentWorkflow {
  id: string
  brandId: string
  name: string
  description: string | null
  type: string
  config: unknown
  isActive: boolean
  isPrebuilt: boolean
  createdAt: Date
  updatedAt: Date
}

const anthropic = new Anthropic()

interface WorkflowConfig {
  trigger: string
  dataSources: string[]
  objectivePrompt: string
  outputSchema: Record<string, unknown>
  filters: Record<string, unknown>
}

export async function runAgentWorkflow(
  workflow: AgentWorkflow,
  brandId: string,
): Promise<string> {
  // Create run record
  const run = await prisma.agentRun.create({
    data: { workflowId: workflow.id, status: 'RUNNING' },
  })

  try {
    const config = workflow.config as WorkflowConfig
    const dataSources = config.dataSources ?? []

    // Hydrate data sources
    const [consumers, products, checkIns, routines] = await Promise.all([
      dataSources.includes('consumers') ? hydrateConsumers(brandId) : Promise.resolve([]),
      dataSources.includes('products') ? hydrateProducts(brandId) : Promise.resolve([]),
      dataSources.includes('checkIns') ? hydrateCheckIns(brandId, config.filters) : Promise.resolve([]),
      dataSources.includes('routines') ? hydrateRoutines(brandId) : Promise.resolve([]),
    ])

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true, isDemo: true },
    })

    // Build full snapshot for executive agent
    const fullSnapshot = dataSources.includes('routines')
      ? { consumers, products, checkIns, routines }
      : null

    const inputSnapshot = { consumers, products, checkIns, routines }

    // Fill prompt template variables
    const prompt = fillTemplate(config.objectivePrompt, {
      brand_name: brand?.name ?? 'the brand',
      consumer_profiles: JSON.stringify(consumers.slice(0, 30), null, 2),
      product_catalog: JSON.stringify(products, null, 2),
      recent_check_ins: JSON.stringify(checkIns.slice(0, 50), null, 2),
      routine_assignments: JSON.stringify(routines.slice(0, 20), null, 2),
      full_brand_snapshot: JSON.stringify(fullSnapshot, null, 2),
    })

    const systemPrompt = `You are an intelligent beauty analytics agent working for Halite Intelligence.
You analyse real consumer data and produce structured, actionable intelligence for beauty brands.
Always be specific — reference actual product names, concern types, and numbers.
Return your analysis as a JSON object matching the requested output format.
The JSON must be valid and parseable. Wrap it in a \`\`\`json block.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/)
    const outputJson = jsonMatch ? jsonMatch[1]! : rawText

    let output: unknown
    try {
      output = JSON.parse(outputJson)
    } catch {
      output = { narrative: rawText }
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'DONE',
        input: inputSnapshot,
        output: output as any,
        tokenCount: response.usage.input_tokens + response.usage.output_tokens,
      },
    })

    return run.id
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', output: { error: String(err) } },
    })
    throw err
  }
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// ── Data hydrators ────────────────────────────────────────────────────────────

async function hydrateConsumers(brandId: string) {
  return prisma.endUser.findMany({
    where: { brandId },
    select: {
      id: true, firstName: true, lastName: true,
      beautyProfile: {
        select: {
          ageRange: true, skinType: true, skinConcerns: true,
          monkSkinTone: true, sleepHours: true, stressLevel: true,
        },
      },
      _count: { select: { checkIns: true } },
    },
    take: 200,
  })
}

async function hydrateProducts(brandId: string) {
  return prisma.product.findMany({
    where: { brandId },
    select: {
      id: true, name: true, category: true, beautyArea: true,
      concerns: true, skinTypes: true, keyIngredients: true,
      price: true, currency: true,
    },
  })
}

async function hydrateCheckIns(brandId: string, filters: Record<string, unknown>) {
  const minCheckIns = Number(filters.minCheckIns ?? 0)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const checkIns = await prisma.checkIn.findMany({
    where: { endUser: { brandId }, date: { gte: cutoff } },
    select: {
      id: true, date: true, skinRating: true, compliant: true,
      symptoms: true, notes: true,
      endUser: { select: { id: true, firstName: true } },
      products: {
        select: { used: true, reaction: true, product: { select: { name: true, category: true } } },
      },
    },
    orderBy: { date: 'desc' },
    take: 500,
  })

  if (minCheckIns === 0) return checkIns

  // Filter to consumers with enough check-ins
  const countByUser: Record<string, number> = {}
  for (const ci of checkIns) {
    countByUser[ci.endUser.id] = (countByUser[ci.endUser.id] ?? 0) + 1
  }
  return checkIns.filter(ci => (countByUser[ci.endUser.id] ?? 0) >= minCheckIns)
}

async function hydrateRoutines(brandId: string) {
  return prisma.routine.findMany({
    where: { endUser: { brandId }, activeTo: null },
    select: {
      id: true, focusArea: true, version: true,
      endUser: { select: { id: true, firstName: true } },
      steps: {
        select: {
          step: true, timeOfDay: true,
          product: { select: { name: true, category: true, keyIngredients: true } },
        },
        orderBy: [{ timeOfDay: 'asc' }, { step: 'asc' }],
      },
    },
    take: 200,
  })
}
