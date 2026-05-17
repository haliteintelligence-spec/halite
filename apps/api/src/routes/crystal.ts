import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin, requireHaliteAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { getAnthropic } from '../lib/model-router.js'

// ── Brand context assembler ────────────────────────────────────────────────

async function buildBrandContext(brandId: string): Promise<string> {
  const [brand, products, profiles, recentCheckIns] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true, plan: true, focusAreas: true },
    }),
    prisma.product.findMany({
      where: { brandId, inStock: true },
      select: { name: true, category: true, concerns: true, keyIngredients: true, price: true, currency: true },
      orderBy: { category: 'asc' },
      take: 80,
    }),
    prisma.userBeautyProfile.findMany({
      where: { endUser: { brandId } },
      select: { skinType: true, skinConcerns: true, monkSkinTone: true, ageRange: true, climateTag: true },
    }),
    prisma.checkIn.findMany({
      where: { endUser: { brandId }, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { skinRating: true, compliant: true, symptoms: true },
    }),
  ])

  if (!brand) return ''

  const totalUsers = profiles.length
  const avgRating = recentCheckIns.length > 0
    ? (recentCheckIns.reduce((s, c) => s + c.skinRating, 0) / recentCheckIns.length).toFixed(1)
    : 'no data'
  const compliance = recentCheckIns.length > 0
    ? Math.round((recentCheckIns.filter(c => c.compliant).length / recentCheckIns.length) * 100)
    : null

  const concernMap: Record<string, number> = {}
  profiles.forEach(p => p.skinConcerns.forEach((c: string) => { concernMap[c] = (concernMap[c] ?? 0) + 1 }))
  const topConcerns = Object.entries(concernMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([c, n]) => `${c} (${n})`).join(', ')

  const symptomMap: Record<string, number> = {}
  recentCheckIns.forEach(ci => (ci.symptoms as string[]).forEach(s => { symptomMap[s] = (symptomMap[s] ?? 0) + 1 }))
  const topSymptoms = Object.entries(symptomMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([s, n]) => `${s} (${n})`).join(', ')

  const productList = products.map(p =>
    `- ${p.name} | ${p.category} | Concerns: ${p.concerns.join(', ') || 'none'} | Key ingredients: ${p.keyIngredients.join(', ') || 'none'} | ${p.price} ${p.currency}`
  ).join('\n')

  return `You are Crystal, the AI intelligence assistant for ${brand.name} on the Halite platform.
You have deep knowledge of this brand's products, customer base, and performance data.
Be specific, data-driven, and actionable. Never make up data — if something isn't in your context, say so.

## Brand: ${brand.name}
Plan: ${brand.plan} | Focus areas: ${brand.focusAreas.join(', ')}

## Customer Base (${totalUsers} users)
Top skin concerns: ${topConcerns || 'none yet'}
Avg skin rating (30d): ${avgRating}/5
Compliance rate (30d): ${compliance !== null ? `${compliance}%` : 'no data'}
Top check-in symptoms (30d): ${topSymptoms || 'none yet'}

## Product Catalog (${products.length} products in stock)
${productList || 'No products in catalog yet.'}`
}

// ── Halite-level context assembler ────────────────────────────────────────

async function buildHaliteContext(): Promise<string> {
  const [brands, totalUsers, totalCheckIns, totalRoutines] = await Promise.all([
    prisma.brand.findMany({
      select: {
        id: true, name: true, plan: true, active: true,
        _count: { select: { endUsers: true, products: true } },
      },
    }),
    prisma.endUser.count(),
    prisma.checkIn.count(),
    prisma.routine.count(),
  ])

  const brandList = brands.map(b =>
    `- ${b.name} | ${b.plan} | ${b.active ? 'active' : 'inactive'} | ${b._count.endUsers} users | ${b._count.products} products`
  ).join('\n')

  return `You are Crystal, the AI intelligence assistant for the Halite Intelligence platform team.
You have access to platform-wide data across all brands. Be strategic, analytical, and concise.
Never reveal one brand's individual customer data to another brand context.

## Platform Overview
Total brands: ${brands.length}
Total end users: ${totalUsers}
Total check-ins: ${totalCheckIns}
Total routines generated: ${totalRoutines}

## Brands
${brandList || 'No brands onboarded yet.'}`
}

// ── Shared: stream Claude and persist messages ─────────────────────────────

async function streamAndPersist(
  conversationId: string,
  userMessage: string,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  reply: any
) {
  const anthropic = getAnthropic()

  // Persist user message immediately
  await prisma.crystalMessage.create({
    data: { conversationId, role: 'USER', content: userMessage },
  })

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  // Stream response
  reply.raw.setHeader('Content-Type', 'text/event-stream')
  reply.raw.setHeader('Cache-Control', 'no-cache')
  reply.raw.setHeader('Connection', 'keep-alive')

  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // @ts-ignore
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullResponse += event.delta.text
      reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
    }
    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens
    }
    if (event.type === 'message_start' && event.message.usage) {
      inputTokens = event.message.usage.input_tokens
    }
  }

  reply.raw.write(`data: [DONE]\n\n`)
  reply.raw.end()

  // Persist assistant message + update conversation title if first exchange
  await prisma.crystalMessage.create({
    data: {
      conversationId,
      role: 'ASSISTANT',
      content: fullResponse,
      tokenCount: inputTokens + outputTokens,
    },
  })

  // Auto-title the conversation from the first user message (truncated)
  const conversation = await prisma.crystalConversation.findUnique({
    where: { id: conversationId },
    select: { title: true, _count: { select: { messages: true } } },
  })
  if (conversation?.title === 'New conversation' && conversation._count.messages <= 2) {
    const autoTitle = userMessage.slice(0, 60) + (userMessage.length > 60 ? '…' : '')
    await prisma.crystalConversation.update({
      where: { id: conversationId },
      data: { title: autoTitle, updatedAt: new Date() },
    })
  } else {
    await prisma.crystalConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })
  }
}

// ══════════════════════════════════════════════════════════════════════════
// Brand Crystal routes
// ══════════════════════════════════════════════════════════════════════════

export async function crystalRoutes(server: FastifyInstance) {

  // ── List conversations ────────────────────────────────────────────
  server.get(
    '/:brandId/crystal/conversations',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const adminId = request.brandAdmin!.adminId

      const conversations = await prisma.crystalConversation.findMany({
        where: { brandId, adminId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, title: true, createdAt: true, updatedAt: true,
          _count: { select: { messages: true } },
        },
      })
      return { conversations }
    }
  )

  // ── Create conversation ───────────────────────────────────────────
  server.post(
    '/:brandId/crystal/conversations',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const adminId = request.brandAdmin!.adminId
      const { title } = z.object({ title: z.string().optional() }).parse(request.body)

      const conversation = await prisma.crystalConversation.create({
        data: {
          brandId,
          adminId,
          adminRole: 'BRAND',
          title: title ?? 'New conversation',
        },
      })
      return reply.status(201).send({ conversation })
    }
  )

  // ── Get conversation with messages ────────────────────────────────
  server.get(
    '/:brandId/crystal/conversations/:conversationId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, conversationId } = request.params as { brandId: string; conversationId: string }
      const adminId = request.brandAdmin!.adminId

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId, adminId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')
      return { conversation }
    }
  )

  // ── Send message (streaming) ──────────────────────────────────────
  server.post(
    '/:brandId/crystal/conversations/:conversationId/messages',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, conversationId } = request.params as { brandId: string; conversationId: string }
      const adminId = request.brandAdmin!.adminId
      const { message } = z.object({ message: z.string().min(1) }).parse(request.body)

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId, adminId },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 20 },
        },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      const history = conversation.messages.map(m => ({
        role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const systemPrompt = await buildBrandContext(brandId)
      await streamAndPersist(conversationId, message, systemPrompt, history, reply)
    }
  )

  // ── Rename conversation ───────────────────────────────────────────
  server.patch(
    '/:brandId/crystal/conversations/:conversationId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, conversationId } = request.params as { brandId: string; conversationId: string }
      const adminId = request.brandAdmin!.adminId
      const { title } = z.object({ title: z.string().min(1).max(120) }).parse(request.body)

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId, adminId },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      const updated = await prisma.crystalConversation.update({
        where: { id: conversationId },
        data: { title },
      })
      return { conversation: updated }
    }
  )

  // ── Delete conversation ───────────────────────────────────────────
  server.delete(
    '/:brandId/crystal/conversations/:conversationId',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, conversationId } = request.params as { brandId: string; conversationId: string }
      const adminId = request.brandAdmin!.adminId

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId, adminId },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      await prisma.crystalConversation.delete({ where: { id: conversationId } })
      return reply.status(204).send()
    }
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Halite admin Crystal routes
// ══════════════════════════════════════════════════════════════════════════

export async function adminCrystalRoutes(server: FastifyInstance) {

  // ── List conversations ────────────────────────────────────────────
  server.get(
    '/admin/crystal/conversations',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const adminId = request.haliteAdmin!.adminId

      const conversations = await prisma.crystalConversation.findMany({
        where: { brandId: null, adminId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, title: true, createdAt: true, updatedAt: true,
          _count: { select: { messages: true } },
        },
      })
      return { conversations }
    }
  )

  // ── Create conversation ───────────────────────────────────────────
  server.post(
    '/admin/crystal/conversations',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const adminId = request.haliteAdmin!.adminId
      const { title } = z.object({ title: z.string().optional() }).parse(request.body)

      const conversation = await prisma.crystalConversation.create({
        data: {
          brandId: null,
          adminId,
          adminRole: 'HALITE',
          title: title ?? 'New conversation',
        },
      })
      return reply.status(201).send({ conversation })
    }
  )

  // ── Get conversation with messages ────────────────────────────────
  server.get(
    '/admin/crystal/conversations/:conversationId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { conversationId } = request.params as { conversationId: string }
      const adminId = request.haliteAdmin!.adminId

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId: null, adminId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')
      return { conversation }
    }
  )

  // ── Send message (streaming) ──────────────────────────────────────
  server.post(
    '/admin/crystal/conversations/:conversationId/messages',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string }
      const adminId = request.haliteAdmin!.adminId
      const { message } = z.object({ message: z.string().min(1) }).parse(request.body)

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId: null, adminId },
        include: {
          messages: { orderBy: { createdAt: 'asc' }, take: 20 },
        },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      const history = conversation.messages.map(m => ({
        role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      const systemPrompt = await buildHaliteContext()
      await streamAndPersist(conversationId, message, systemPrompt, history, reply)
    }
  )

  // ── Rename conversation ───────────────────────────────────────────
  server.patch(
    '/admin/crystal/conversations/:conversationId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { conversationId } = request.params as { conversationId: string }
      const adminId = request.haliteAdmin!.adminId
      const { title } = z.object({ title: z.string().min(1).max(120) }).parse(request.body)

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId: null, adminId },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      const updated = await prisma.crystalConversation.update({
        where: { id: conversationId },
        data: { title },
      })
      return { conversation: updated }
    }
  )

  // ── Delete conversation ───────────────────────────────────────────
  server.delete(
    '/admin/crystal/conversations/:conversationId',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string }
      const adminId = request.haliteAdmin!.adminId

      const conversation = await prisma.crystalConversation.findFirst({
        where: { id: conversationId, brandId: null, adminId },
      })
      if (!conversation) throw new ApiError(404, 'Conversation not found')

      await prisma.crystalConversation.delete({ where: { id: conversationId } })
      return reply.status(204).send()
    }
  )
}
