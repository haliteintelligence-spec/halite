import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@halite/db'
import { requireEndUser, requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { buildQuizFlow } from '../lib/quiz-engine.js'
import { generateRoutine } from '../lib/routine-generator.js'

const BeautyAreaEnum = z.enum([
  'SKINCARE', 'BODY', 'HAIR', 'MAKEUP', 'FRAGRANCE',
  'NAILS', 'WELLNESS', 'SUN_CARE', 'LIP_CARE', 'EYE_CARE',
])

export async function quizRoutes(server: FastifyInstance) {

  // ── Brand admin: get/update quiz config ───────────────────────────
  server.get(
    '/:brandId/quiz/config',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: { quizConfig: true },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      return {
        focusAreas: brand.focusAreas,
        quizConfig: brand.quizConfig,
      }
    }
  )

  server.patch(
    '/:brandId/quiz/config',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        focusAreas: z.array(BeautyAreaEnum).min(1).optional(),
        questionOverrides: z.record(z.unknown()).optional(),
        customQuestions: z.array(z.unknown()).optional(),
      })
      const data = schema.parse(request.body)

      if (data.focusAreas) {
        await prisma.brand.update({
          where: { id: brandId },
          data: { focusAreas: data.focusAreas as any },
        })
      }

      const config = await prisma.quizConfig.upsert({
        where: { brandId },
        update: {
          enabledAreas: (data.focusAreas as any) ?? undefined,
          ...(data.questionOverrides !== undefined ? { questionOverrides: data.questionOverrides as Prisma.InputJsonValue } : {}),
          ...(data.customQuestions !== undefined ? { customQuestions: data.customQuestions as Prisma.InputJsonValue } : {}),
        },
        create: {
          brandId,
          enabledAreas: (data.focusAreas as any) ?? [],
          questionOverrides: (data.questionOverrides ?? {}) as Prisma.InputJsonValue,
          customQuestions: (data.customQuestions ?? []) as Prisma.InputJsonValue,
        },
      })

      return { config }
    }
  )

  // ── Get quiz question flow ─────────────────────────────────────────
  // Called before/after area selection. Includes area selector if needed.
  server.get(
    '/:brandId/quiz/questions',
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        selectedAreas: z.string().optional(), // comma-separated
        currency: z.string().default('USD'),
        routineFormat: z.enum(['SINGLE', 'ROUTINE']).default('ROUTINE'),
      })
      const { selectedAreas, currency, routineFormat } = schema.parse(request.query)

      const brand = await prisma.brand.findUnique({ where: { id: brandId } })
      if (!brand) throw new ApiError(404, 'Brand not found')

      const brandAreas = brand.focusAreas as string[]
      const userAreas = selectedAreas
        ? selectedAreas.split(',').filter((a) => brandAreas.includes(a))
        : []

      const flow = buildQuizFlow(
        brandAreas as any,
        userAreas as any,
        {},
        currency,
        routineFormat
      )

      return { flow }
    }
  )

  // ── Start quiz session ─────────────────────────────────────────────
  server.post(
    '/:brandId/quiz/sessions',
    { preHandler: requireEndUser },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const userId = request.endUser!.userId

      const session = await prisma.quizSession.create({
        data: {
          brandId,
          endUserId: userId,
          answers: {},
          selectedAreas: [],
        },
      })
      return reply.status(201).send({ sessionId: session.id })
    }
  )

  // ── Save area selections ───────────────────────────────────────────
  server.patch(
    '/:brandId/quiz/sessions/:sessionId/areas',
    { preHandler: requireEndUser },
    async (request) => {
      const { brandId, sessionId } = request.params as { brandId: string; sessionId: string }
      const { areas } = z.object({ areas: z.array(BeautyAreaEnum) }).parse(request.body)

      const session = await prisma.quizSession.findFirst({
        where: { id: sessionId, brandId, endUserId: request.endUser!.userId },
      })
      if (!session) throw new ApiError(404, 'Session not found')
      if (session.completed) throw new ApiError(400, 'Session already completed')

      const updated = await prisma.quizSession.update({
        where: { id: sessionId },
        data: { selectedAreas: areas as any },
      })

      // Return updated question flow for selected areas
      const brand = await prisma.brand.findUnique({ where: { id: brandId } })
      const flow = buildQuizFlow(brand!.focusAreas as any, areas as any)

      return { session: updated, flow }
    }
  )

  // ── Save answers (progressive — called after each question/block) ──
  server.patch(
    '/:brandId/quiz/sessions/:sessionId/answers',
    { preHandler: requireEndUser },
    async (request) => {
      const { brandId, sessionId } = request.params as { brandId: string; sessionId: string }

      const session = await prisma.quizSession.findFirst({
        where: { id: sessionId, brandId, endUserId: request.endUser!.userId },
      })
      if (!session) throw new ApiError(404, 'Session not found')
      if (session.completed) throw new ApiError(400, 'Session already completed')

      const newAnswers = z.record(z.unknown()).parse(request.body)
      const merged = { ...(session.answers as object), ...newAnswers }

      // If SH1 (location) is being saved, also persist climate data
      const locationPayload = newAnswers['SH1_location'] as Record<string, unknown> | undefined
      const climatePayload = newAnswers['SH1_climate'] as Record<string, unknown> | undefined

      const updated = await prisma.quizSession.update({
        where: { id: sessionId },
        data: { answers: merged as Prisma.InputJsonValue },
      })

      // If format and areas are known, return updated category suggestions
      const routineFormat = (merged as Record<string, string>)['SH2A'] ?? 'ROUTINE'
      const currency = (merged as Record<string, string>)['SH1_currency'] ?? 'USD'
      const selectedAreas = updated.selectedAreas as string[]

      // Rebuild SH2B options dynamically when new concern answers arrive
      if (['S4', 'B2', 'H4', 'E1', 'N1'].some((id) => id in newAnswers)) {
        const brand = await prisma.brand.findUnique({ where: { id: brandId } })
        const flow = buildQuizFlow(
          brand!.focusAreas as any,
          selectedAreas as any,
          merged as Record<string, unknown>,
          currency,
          routineFormat as 'SINGLE' | 'ROUTINE'
        )
        return { session: updated, updatedFlow: flow }
      }

      return { session: updated }
    }
  )

  // ── Complete quiz → generate routine(s) ───────────────────────────
  server.post(
    '/:brandId/quiz/sessions/:sessionId/complete',
    { preHandler: requireEndUser },
    async (request, reply) => {
      const { brandId, sessionId } = request.params as { brandId: string; sessionId: string }
      const userId = request.endUser!.userId

      const { consumerToken } = z.object({ consumerToken: z.string().optional() }).parse(request.body ?? {})

      const session = await prisma.quizSession.findFirst({
        where: { id: sessionId, brandId, endUserId: userId },
      })
      if (!session) throw new ApiError(404, 'Session not found')
      if (session.completed) throw new ApiError(400, 'Session already completed')

      // Link EndUser → Consumer if a valid consumer token was provided
      if (consumerToken) {
        try {
          const payload = server.jwt.verify(consumerToken) as { consumerId?: string; role?: string }
          if (payload.role === 'consumer' && payload.consumerId) {
            const endUser = await prisma.endUser.findUnique({ where: { id: userId }, select: { consumerId: true } })
            if (!endUser?.consumerId) {
              await prisma.endUser.update({ where: { id: userId }, data: { consumerId: payload.consumerId } })
            }
          }
        } catch { /* invalid/expired token — skip linking */ }
      }

      const answers = session.answers as Record<string, unknown>
      const selectedAreas = session.selectedAreas as string[]

      // Persist beauty profile
      const locationData = answers['SH1_location'] as Record<string, string> | undefined
      const climateData = answers['SH1_climate'] as Record<string, unknown> | undefined
      const budgetRange = ((answers['SH3'] as string) ?? '').split(',')

      await prisma.userBeautyProfile.upsert({
        where: { endUserId: userId },
        update: {
          ageRange: (answers['SH0'] as string | undefined) ?? null,
          completedAreas: selectedAreas as any,
          city: locationData?.city ?? null,
          country: locationData?.country ?? null,
          countryCode: locationData?.countryCode ?? null,
          lat: locationData?.lat ? parseFloat(locationData.lat) : null,
          lng: locationData?.lng ? parseFloat(locationData.lng) : null,
          timezone: locationData?.timezone ?? null,
          detectedCurrency: locationData?.currency ?? null,
          climateTag: (climateData?.climateTag as any) ?? undefined,
          climateSnapshot: (climateData ?? Prisma.JsonNull) as any,
          routineFormat: (answers['SH2A'] as any) ?? undefined,
          selectedCategories: (answers['SH2B'] as any) ?? [],
          spendMin: budgetRange[0] ? parseFloat(budgetRange[0]) : null,
          spendMax: budgetRange[1] ? parseFloat(budgetRange[1]) : null,
          spendCurrency: locationData?.currency ?? 'USD',
          waterIntakeMl: answers['SH4'] ? parseFloat(answers['SH4'] as string) : null,
          sleepHours: answers['SH5'] ? parseFloat(answers['SH5'] as string) : null,
          stressLevel: answers['SH6'] ? parseInt(answers['SH6'] as string) : null,
          monkSkinTone: answers['S5'] ? parseInt(answers['S5'] as string) : null,
          skinType: mapSkinType(answers['S1'] as string | undefined),
          skinConcerns: (answers['S4'] as any) ?? [],
          bodyProfile: (extractAreaAnswers(answers, 'B') ?? Prisma.JsonNull) as any,
          hairProfile: (extractAreaAnswers(answers, 'H') ?? Prisma.JsonNull) as any,
          makeupProfile: (extractAreaAnswers(answers, 'M') ?? Prisma.JsonNull) as any,
          fragranceProfile: (extractAreaAnswers(answers, 'F') ?? Prisma.JsonNull) as any,
          nailsProfile: (extractAreaAnswers(answers, 'N') ?? Prisma.JsonNull) as any,
          wellnessProfile: (extractAreaAnswers(answers, 'W') ?? Prisma.JsonNull) as any,
          sunCareProfile: (extractAreaAnswers(answers, 'SC') ?? Prisma.JsonNull) as any,
          lipProfile: (extractAreaAnswers(answers, 'L') ?? Prisma.JsonNull) as any,
          eyeProfile: (extractAreaAnswers(answers, 'E') ?? Prisma.JsonNull) as any,
        },
        create: {
          endUserId: userId,
          ageRange: (answers['SH0'] as string | undefined) ?? null,
          completedAreas: selectedAreas as any,
          city: locationData?.city ?? null,
          country: locationData?.country ?? null,
          countryCode: locationData?.countryCode ?? null,
          lat: locationData?.lat ? parseFloat(locationData.lat) : null,
          lng: locationData?.lng ? parseFloat(locationData.lng) : null,
          timezone: locationData?.timezone ?? null,
          detectedCurrency: locationData?.currency ?? 'USD',
          climateTag: (climateData?.climateTag as any) ?? undefined,
          climateSnapshot: (climateData ?? Prisma.JsonNull) as any,
          routineFormat: (answers['SH2A'] as any) ?? 'ROUTINE',
          selectedCategories: (answers['SH2B'] as any) ?? [],
          spendMin: budgetRange[0] ? parseFloat(budgetRange[0]) : null,
          spendMax: budgetRange[1] ? parseFloat(budgetRange[1]) : null,
          spendCurrency: locationData?.currency ?? 'USD',
          waterIntakeMl: answers['SH4'] ? parseFloat(answers['SH4'] as string) : null,
          sleepHours: answers['SH5'] ? parseFloat(answers['SH5'] as string) : null,
          stressLevel: answers['SH6'] ? parseInt(answers['SH6'] as string) : null,
          monkSkinTone: answers['S5'] ? parseInt(answers['S5'] as string) : null,
          skinType: mapSkinType(answers['S1'] as string | undefined),
          skinConcerns: (answers['S4'] as any) ?? [],
          bodyProfile: (extractAreaAnswers(answers, 'B') ?? Prisma.JsonNull) as any,
          hairProfile: (extractAreaAnswers(answers, 'H') ?? Prisma.JsonNull) as any,
          makeupProfile: (extractAreaAnswers(answers, 'M') ?? Prisma.JsonNull) as any,
          fragranceProfile: (extractAreaAnswers(answers, 'F') ?? Prisma.JsonNull) as any,
          nailsProfile: (extractAreaAnswers(answers, 'N') ?? Prisma.JsonNull) as any,
          wellnessProfile: (extractAreaAnswers(answers, 'W') ?? Prisma.JsonNull) as any,
          sunCareProfile: (extractAreaAnswers(answers, 'SC') ?? Prisma.JsonNull) as any,
          lipProfile: (extractAreaAnswers(answers, 'L') ?? Prisma.JsonNull) as any,
          eyeProfile: (extractAreaAnswers(answers, 'E') ?? Prisma.JsonNull) as any,
        },
      })

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { completed: true, completedAt: new Date() },
      })

      // Generate a routine per selected area (async, non-blocking)
      const areasToGenerate = selectedAreas.length > 0
        ? selectedAreas
        : (await prisma.brand.findUnique({ where: { id: brandId } }))?.focusAreas ?? []

      generateRoutinesAsync(userId, brandId, sessionId, areasToGenerate as string[], answers)

      return reply.status(202).send({
        message: 'Quiz complete. Your personalized routine is being prepared.',
        sessionId,
        areasQueued: areasToGenerate,
      })
    }
  )

  // ── Get session (for resuming) ─────────────────────────────────────
  server.get(
    '/:brandId/quiz/sessions/:sessionId',
    { preHandler: requireEndUser },
    async (request) => {
      const { brandId, sessionId } = request.params as { brandId: string; sessionId: string }
      const session = await prisma.quizSession.findFirst({
        where: { id: sessionId, brandId, endUserId: request.endUser!.userId },
      })
      if (!session) throw new ApiError(404, 'Session not found')
      return { session }
    }
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapSkinType(s1Answer: string | undefined) {
  if (!s1Answer) return undefined
  const map: Record<string, string> = {
    oily_all: 'OILY', oily_tzone: 'COMBINATION',
    normal: 'NORMAL', dry: 'DRY', very_dry: 'DRY',
  }
  return (map[s1Answer] ?? 'NORMAL') as any
}

function extractAreaAnswers(
  answers: Record<string, unknown>,
  prefix: string
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(answers)) {
    if (key.startsWith(prefix) && key.length <= prefix.length + 2) {
      result[key] = val
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

async function generateRoutinesAsync(
  userId: string,
  brandId: string,
  sessionId: string,
  areas: string[],
  answers: Record<string, unknown>
) {
  for (const area of areas) {
    try {
      await generateRoutine(userId, brandId, sessionId, area, answers)
    } catch (err) {
      console.error(`Routine generation failed for area ${area}:`, err)
    }
  }
}
