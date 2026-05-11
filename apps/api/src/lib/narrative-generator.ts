import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@halite/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const POSITIVE_SYMPTOMS = new Set([
  'IMPROVEMENT', 'GLOW', 'HYDRATED', 'TEXTURE_SMOOTH',
])

export async function generateProgressNarrative(
  userId: string,
  brandId: string,
): Promise<void> {
  const [checkIns, routine, profile] = await Promise.all([
    prisma.checkIn.findMany({
      where: { endUserId: userId },
      include: {
        products: { include: { product: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
    prisma.routine.findFirst({
      where: { endUserId: userId, activeTo: null },
      include: { steps: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userBeautyProfile.findUnique({ where: { endUserId: userId } }),
  ])

  if (checkIns.length < 4) return

  // Build stats for Claude
  const ratings = checkIns.map(c => c.skinRating)
  const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
  const trend = ratings[0]! > ratings[ratings.length - 1]! ? 'improving' : ratings[0]! < ratings[ratings.length - 1]! ? 'declining' : 'stable'
  const compliance = Math.round((checkIns.filter(c => c.compliant).length / checkIns.length) * 100)

  const symptomCounts: Record<string, number> = {}
  checkIns.forEach(c => (c.symptoms as string[]).forEach(s => { symptomCounts[s] = (symptomCounts[s] ?? 0) + 1 }))
  const topPositive = Object.entries(symptomCounts).filter(([k]) => POSITIVE_SYMPTOMS.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topConcerns = Object.entries(symptomCounts).filter(([k]) => !POSITIVE_SYMPTOMS.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const productReactions: Record<string, { name: string; pos: number; neg: number }> = {}
  checkIns.forEach(c => c.products.forEach(p => {
    if (!productReactions[p.productId]) productReactions[p.productId] = { name: p.product.name, pos: 0, neg: 0 }
    if (p.reaction === 'POSITIVE') productReactions[p.productId]!.pos++
    if (p.reaction === 'NEGATIVE') productReactions[p.productId]!.neg++
  }))

  const bestProduct = Object.values(productReactions).sort((a, b) => b.pos - a.pos)[0]
  const worstProduct = Object.values(productReactions).filter(p => p.neg > 0).sort((a, b) => b.neg - a.neg)[0]

  const routineSteps = routine?.steps.map(s => s.product.name).join(', ') ?? 'No active routine'
  const skinType = profile?.skinType ?? 'unknown'
  const concerns = (profile?.skinConcerns as string[] | null)?.join(', ') ?? 'not specified'

  const prompt = `You are a knowledgeable, warm beauty advisor reviewing a customer's skin progress data.

USER PROFILE:
- Skin type: ${skinType}
- Primary concerns: ${concerns}
- Current routine: ${routineSteps}

CHECK-IN DATA (${checkIns.length} check-ins):
- Average skin rating: ${avgRating}/5
- Trend: ${trend}
- Routine compliance: ${compliance}%
- Top positive signs: ${topPositive.map(([k, v]) => `${k} (${v}x)`).join(', ') || 'none yet'}
- Top concerns: ${topConcerns.map(([k, v]) => `${k} (${v}x)`).join(', ') || 'none'}
- Most positively rated product: ${bestProduct ? `${bestProduct.name} (${bestProduct.pos} positive reactions)` : 'n/a'}
${worstProduct ? `- Product showing negative reactions: ${worstProduct.name} (${worstProduct.neg} negative reactions)` : ''}

Write a personalised 3-paragraph progress report in second person ("Your skin…"). Be specific, warm, and actionable.

Paragraph 1: What the data shows — overall trend, rating movement, standout positives.
Paragraph 2: What's working and why — highlight the best-performing product, compliance impact.
Paragraph 3: One specific, actionable recommendation based on the data (e.g. consistency tip, product usage tweak, or next step).

Keep each paragraph to 2–3 sentences. No bullet points, no headers. Plain prose only.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const narrative = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null
  if (!narrative) return

  await prisma.userBeautyProfile.upsert({
    where: { endUserId: userId },
    update: { progressNarrative: narrative, narrativeUpdatedAt: new Date() },
    create: {
      endUserId: userId,
      progressNarrative: narrative,
      narrativeUpdatedAt: new Date(),
    },
  })
}

export async function shouldGenerateNarrative(userId: string): Promise<boolean> {
  const count = await prisma.checkIn.count({ where: { endUserId: userId } })
  if (count < 4) return false
  // Generate on the 4th, 8th, 12th check-in and every 4th after
  if (count % 4 !== 0) return false

  const profile = await prisma.userBeautyProfile.findUnique({
    where: { endUserId: userId },
    select: { narrativeUpdatedAt: true },
  })
  // Don't regenerate if already done within last hour (duplicate calls)
  if (profile?.narrativeUpdatedAt) {
    const age = Date.now() - profile.narrativeUpdatedAt.getTime()
    if (age < 60 * 60 * 1000) return false
  }
  return true
}
