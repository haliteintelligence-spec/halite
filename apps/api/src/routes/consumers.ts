import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
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
  // Called from quiz intro when consumer enters email.
  // Returns a platform token + any pre-fill answers from prior quizzes.
  server.post(
    '/consumers/identify',
    async (request, reply) => {
      const { email } = z.object({
        email: z.string().email(),
      }).parse(request.body)

      const consumer = await prisma.consumer.upsert({
        where: { email },
        update: {},
        create: { email },
      })

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
        data: { prefillAnswers: merged },
        select: { id: true, email: true, prefillAnswers: true, updatedAt: true },
      })

      return { consumer: updated }
    }
  )
}
