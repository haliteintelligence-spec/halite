import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@halite/db'
import { requireConsumer } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'

// Questions that are about the person (brand-agnostic) — safe to pre-fill
const PREFILL_QUESTION_IDS = new Set([
  'S1', 'S2', 'S3', 'S4', 'S5',         // Skincare biology
  'B1', 'B2', 'B3', 'B4',               // Body skin
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',  // Hair biology
  'M1', 'M2', 'M3',                     // Makeup skin base
  'SH0',                                 // Age range
  'SH1_location', 'SH1_climate', 'SH1_currency', // Location
  'SH4', 'SH5', 'SH6',                  // Lifestyle (water, sleep, stress)
])

export async function consumerRoutes(server: FastifyInstance) {
  // ── Identify (lookup or create) ──────────────────────────────────────
  // Called from quiz intro — consumer must provide email or phone (or both).
  // Returns a platform token + any pre-fill answers from prior quizzes.
  server.post(
    '/consumers/identify',
    async (request, reply) => {
      const schema = z.object({
        email: z.string().email().optional(),
        phone: z.string().min(7).max(20).optional(),
      }).refine(d => d.email || d.phone, { message: 'email or phone is required' })

      const { email, phone } = schema.parse(request.body)

      // Look up existing consumer by email or phone
      let consumer = await prisma.consumer.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      })

      if (consumer) {
        // Merge any newly provided contact info (e.g. first time email, now also has phone)
        const updates: Record<string, string> = {}
        if (email && !consumer.email) updates.email = email
        if (phone && !consumer.phone) updates.phone = phone
        if (Object.keys(updates).length > 0) {
          consumer = await prisma.consumer.update({ where: { id: consumer.id }, data: updates })
        }
      } else {
        consumer = await prisma.consumer.create({
          data: { email: email ?? null, phone: phone ?? null },
        })
      }

      const token = server.jwt.sign(
        { role: 'consumer', consumerId: consumer.id },
        { expiresIn: '365d' }
      )

      return reply.send({
        token,
        consumerId: consumer.id,
        prefillAnswers: consumer.prefillAnswers ?? {},
        isReturning: Object.keys(consumer.prefillAnswers as object).length > 0,
      })
    }
  )

  // ── Get platform profile ─────────────────────────────────────────────
  server.get(
    '/consumers/me',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const consumer = await prisma.consumer.findUnique({
        where: { id: consumerId },
        include: {
          endUsers: {
            select: {
              id: true,
              brandId: true,
              brand: { select: { name: true, slug: true, logoUrl: true } },
              createdAt: true,
            },
          },
        },
      })
      if (!consumer) throw new ApiError(404, 'Consumer not found')
      return { consumer }
    }
  )

  // ── Update pre-fill answers after quiz completion ─────────────────────
  // Called by the quiz client on completion — merges new answers into the
  // consumer's stored profile, keeping only brand-agnostic question IDs.
  server.patch(
    '/consumers/me/answers',
    { preHandler: requireConsumer },
    async (request) => {
      const { consumerId } = request.consumer!
      const { answers } = z.object({
        answers: z.record(z.unknown()),
      }).parse(request.body)

      // Only persist answers for brand-agnostic questions
      const filtered = Object.fromEntries(
        Object.entries(answers).filter(([k]) => PREFILL_QUESTION_IDS.has(k))
      )

      const consumer = await prisma.consumer.findUnique({
        where: { id: consumerId },
        select: { prefillAnswers: true },
      })
      if (!consumer) throw new ApiError(404, 'Consumer not found')

      const merged = {
        ...(consumer.prefillAnswers as object),
        ...filtered,
      }

      const updated = await prisma.consumer.update({
        where: { id: consumerId },
        data: { prefillAnswers: merged as Prisma.InputJsonValue },
        select: { id: true, email: true, prefillAnswers: true, updatedAt: true },
      })

      return { consumer: updated }
    }
  )
}
