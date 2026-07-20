import { prisma } from '@halite/db'
import { getAnthropic } from './model-router.js'

const SYSTEM_PROMPT = `You are a knowledgeable, warm beauty advisor reviewing a single check-in a customer just logged.

Write a short 2-4 sentence interpretation of this specific check-in, in second person ("Your skin…"). Be specific — reference the actual rating, symptoms, and products given. Be encouraging where warranted and honest about concerns. No headers, no bullet points, plain prose only.`

export async function generateCheckInResult(checkInId: string): Promise<string> {
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: {
      products: { include: { product: { select: { name: true } } } },
      endUser: { include: { beautyProfile: { select: { skinType: true, skinConcerns: true } } } },
    },
  })
  if (!checkIn) throw new Error('Check-in not found')

  const productLines = checkIn.products
    .map((p) => `${p.product.name}${p.reaction ? ` (${p.reaction.toLowerCase()} reaction)` : ''}${p.used ? '' : ' (not used)'}`)
    .join(', ') || 'none logged'

  const userContent = `USER PROFILE:
- Skin type: ${checkIn.endUser.beautyProfile?.skinType ?? 'unknown'}
- Primary concerns: ${(checkIn.endUser.beautyProfile?.skinConcerns as string[] | undefined)?.join(', ') || 'not specified'}

THIS CHECK-IN (${checkIn.date.toDateString()}):
- Skin rating: ${checkIn.skinRating}/5
- Routine compliance: ${checkIn.compliant ? 'followed routine' : 'skipped routine'}
- Symptoms logged: ${(checkIn.symptoms as string[]).join(', ') || 'none'}
- Products used: ${productLines}
- Notes: ${checkIn.notes ?? 'none'}`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const result = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null
  if (!result) throw new Error('Claude returned no text content')

  await prisma.checkIn.update({
    where: { id: checkInId },
    data: { aiResult: result, aiResultGeneratedAt: new Date() },
  })

  return result
}
