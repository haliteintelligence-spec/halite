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

      // Enrich session answers with Consumer.prefillAnswers to fill profile gaps
      // (session answers win — Consumer data only fills fields the consumer didn't re-answer here)
      const euWithConsumer = await prisma.endUser.findUnique({
        where: { id: userId },
        select: { consumerId: true },
      })
      let effectiveAnswers = answers
      if (euWithConsumer?.consumerId) {
        const consumerPrefill = await prisma.consumer.findUnique({
          where: { id: euWithConsumer.consumerId },
          select: { prefillAnswers: true },
        })
        if (consumerPrefill?.prefillAnswers) {
          effectiveAnswers = { ...(consumerPrefill.prefillAnswers as Record<string, unknown>), ...answers }
        }
      }

      // Persist beauty profile
      const locationData = effectiveAnswers['SH1_location'] as Record<string, string> | undefined
      const climateData = effectiveAnswers['SH1_climate'] as Record<string, unknown> | undefined
      const budgetRange = ((effectiveAnswers['SH3'] as string) ?? '').split(',')

      await prisma.userBeautyProfile.upsert({
        where: { endUserId: userId },
        update: {
          ageRange: effectiveAnswers['SH0'] ? birthdayToAgeRange(effectiveAnswers['SH0'] as string) : null,
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
          routineFormat: (effectiveAnswers['SH2A'] as any) ?? undefined,
          selectedCategories: (effectiveAnswers['SH2B'] as any) ?? [],
          spendMin: budgetRange[0] ? parseFloat(budgetRange[0]) : null,
          spendMax: budgetRange[1] ? parseFloat(budgetRange[1]) : null,
          spendCurrency: locationData?.currency ?? 'USD',
          waterIntakeMl: effectiveAnswers['SH4'] ? (WATER_LABELS[effectiveAnswers['SH4'] as string] ?? String(effectiveAnswers['SH4'])) : null,
          sleepHours: effectiveAnswers['SH5'] ? (SLEEP_LABELS[effectiveAnswers['SH5'] as string] ?? String(effectiveAnswers['SH5'])) : null,
          stressLevel: effectiveAnswers['SH6'] ? parseInt(effectiveAnswers['SH6'] as string) : null,
          monkSkinTone: effectiveAnswers['S5'] ? parseInt(effectiveAnswers['S5'] as string) : null,
          skinType: mapSkinType(effectiveAnswers['S1'] as string | undefined),
          skinConcerns: (effectiveAnswers['S4'] as any) ?? [],
          bodyProfile: (extractAreaAnswers(effectiveAnswers, 'B') ?? Prisma.JsonNull) as any,
          hairProfile: (extractAreaAnswers(effectiveAnswers, 'H') ?? Prisma.JsonNull) as any,
          makeupProfile: (extractAreaAnswers(effectiveAnswers, 'M') ?? Prisma.JsonNull) as any,
          fragranceProfile: (extractAreaAnswers(effectiveAnswers, 'F') ?? Prisma.JsonNull) as any,
          nailsProfile: (extractAreaAnswers(effectiveAnswers, 'N') ?? Prisma.JsonNull) as any,
          wellnessProfile: (extractAreaAnswers(effectiveAnswers, 'W') ?? Prisma.JsonNull) as any,
          sunCareProfile: (extractAreaAnswers(effectiveAnswers, 'SC') ?? Prisma.JsonNull) as any,
          lipProfile: (extractAreaAnswers(effectiveAnswers, 'L') ?? Prisma.JsonNull) as any,
          eyeProfile: (extractAreaAnswers(effectiveAnswers, 'E') ?? Prisma.JsonNull) as any,
        },
        create: {
          endUserId: userId,
          ageRange: effectiveAnswers['SH0'] ? birthdayToAgeRange(effectiveAnswers['SH0'] as string) : null,
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
          routineFormat: (effectiveAnswers['SH2A'] as any) ?? 'ROUTINE',
          selectedCategories: (effectiveAnswers['SH2B'] as any) ?? [],
          spendMin: budgetRange[0] ? parseFloat(budgetRange[0]) : null,
          spendMax: budgetRange[1] ? parseFloat(budgetRange[1]) : null,
          spendCurrency: locationData?.currency ?? 'USD',
          waterIntakeMl: effectiveAnswers['SH4'] ? (WATER_LABELS[effectiveAnswers['SH4'] as string] ?? String(effectiveAnswers['SH4'])) : null,
          sleepHours: effectiveAnswers['SH5'] ? (SLEEP_LABELS[effectiveAnswers['SH5'] as string] ?? String(effectiveAnswers['SH5'])) : null,
          stressLevel: effectiveAnswers['SH6'] ? parseInt(effectiveAnswers['SH6'] as string) : null,
          monkSkinTone: effectiveAnswers['S5'] ? parseInt(effectiveAnswers['S5'] as string) : null,
          skinType: mapSkinType(effectiveAnswers['S1'] as string | undefined),
          skinConcerns: (effectiveAnswers['S4'] as any) ?? [],
          bodyProfile: (extractAreaAnswers(effectiveAnswers, 'B') ?? Prisma.JsonNull) as any,
          hairProfile: (extractAreaAnswers(effectiveAnswers, 'H') ?? Prisma.JsonNull) as any,
          makeupProfile: (extractAreaAnswers(effectiveAnswers, 'M') ?? Prisma.JsonNull) as any,
          fragranceProfile: (extractAreaAnswers(effectiveAnswers, 'F') ?? Prisma.JsonNull) as any,
          nailsProfile: (extractAreaAnswers(effectiveAnswers, 'N') ?? Prisma.JsonNull) as any,
          wellnessProfile: (extractAreaAnswers(effectiveAnswers, 'W') ?? Prisma.JsonNull) as any,
          sunCareProfile: (extractAreaAnswers(effectiveAnswers, 'SC') ?? Prisma.JsonNull) as any,
          lipProfile: (extractAreaAnswers(effectiveAnswers, 'L') ?? Prisma.JsonNull) as any,
          eyeProfile: (extractAreaAnswers(effectiveAnswers, 'E') ?? Prisma.JsonNull) as any,
        },
      })

      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { completed: true, completedAt: new Date() },
      })

      // Sync completed answers back to Consumer.prefillAnswers and sibling EndUsers
      const endUserRecord = await prisma.endUser.findUnique({
        where: { id: userId },
        select: { consumerId: true, firstName: true, lastName: true, email: true },
      })
      if (endUserRecord?.consumerId) {
        const consumer = await prisma.consumer.findUnique({
          where: { id: endUserRecord.consumerId },
          select: { prefillAnswers: true },
        })
        if (consumer) {
          // Brand-agnostic answers: everything except brand-specific preferences (SH2, SH3 budget/category)
          const BRAND_SPECIFIC = new Set(['SH2A', 'SH2B', 'SH3'])
          const merged: Record<string, unknown> = { ...(consumer.prefillAnswers as Record<string, unknown> ?? {}) }
          for (const [key, val] of Object.entries(answers)) {
            if (!BRAND_SPECIFIC.has(key) && val !== undefined) merged[key] = val
          }
          const birthdayVal = answers['SH0'] as string | undefined
          await prisma.consumer.update({
            where: { id: endUserRecord.consumerId },
            data: {
              prefillAnswers: merged as Prisma.InputJsonValue,
              ...(birthdayVal ? { birthday: new Date(birthdayVal) } : {}),
            },
          }).catch(() => {})

          // Push name and email to any sibling EndUsers that are missing them
          if (endUserRecord.firstName || endUserRecord.email) {
            await prisma.endUser.updateMany({
              where: {
                consumerId: endUserRecord.consumerId,
                id: { not: userId },
                firstName: null,
              },
              data: {
                ...(endUserRecord.firstName ? { firstName: endUserRecord.firstName } : {}),
                ...(endUserRecord.lastName ? { lastName: endUserRecord.lastName } : {}),
                ...(endUserRecord.email ? { email: endUserRecord.email } : {}),
              },
            }).catch(() => {})
          }
        }
      }

      // Generate a routine per selected area (async, non-blocking)
      const areasToGenerate = selectedAreas.length > 0
        ? selectedAreas
        : (await prisma.brand.findUnique({ where: { id: brandId } }))?.focusAreas ?? []

      generateRoutinesAsync(userId, brandId, sessionId, areasToGenerate as string[], effectiveAnswers)

      return reply.status(202).send({
        message: 'Quiz complete. Your personalized routine is being prepared.',
        sessionId,
        areasQueued: areasToGenerate,
      })
    }
  )

  // ── Check-in auto-setup ───────────────────────────────────────────
  // Called after cross-brand check-in auth. Uses the Consumer's stored
  // brand-agnostic answers (skin/hair/lifestyle concerns only — no
  // product or brand data from other brands) to generate a routine for
  // this brand's catalog without the consumer redoing the full quiz.
  server.post(
    '/:brandId/quiz/auto-setup',
    { preHandler: requireEndUser },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const userId = request.endUser!.userId

      const endUserRecord = await prisma.endUser.findUnique({
        where: { id: userId },
        select: { firstName: true, consumerId: true },
      })

      // Already has routines — return them immediately
      const existingRoutines = await prisma.routine.findMany({
        where: { endUserId: userId, quizSession: { brandId } },
        include: { steps: { include: { product: { select: { id: true, name: true } } } } },
      })
      if (existingRoutines.length > 0) {
        return reply.send({ status: 'ready', routines: existingRoutines, firstName: endUserRecord?.firstName ?? null })
      }

      // Already has a completed quiz — routines may still be generating
      const existingSession = await prisma.quizSession.findFirst({
        where: { endUserId: userId, brandId, completed: true },
      })
      if (existingSession) {
        return reply.send({ status: 'generating', routines: [], firstName: endUserRecord?.firstName ?? null })
      }

      // Get Consumer prefillAnswers — brand-agnostic concerns and preferences only
      // (skin type, concerns, hair, lifestyle — never products or brand-specific choices)
      const consumer = endUserRecord?.consumerId
        ? await prisma.consumer.findUnique({
            where: { id: endUserRecord.consumerId },
            select: { prefillAnswers: true },
          })
        : null
      const rawAnswers = (consumer?.prefillAnswers as Record<string, unknown>) ?? {}

      // Strip any brand-specific keys that may have crept in
      const BRAND_SPECIFIC = new Set(['SH2A', 'SH2B', 'SH3'])
      const answers: Record<string, unknown> = Object.fromEntries(
        Object.entries(rawAnswers).filter(([k]) => !BRAND_SPECIFIC.has(k))
      )

      const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { focusAreas: true } })
      const areas = (brand?.focusAreas as string[]) ?? []

      // Upsert beauty profile so check-in auth can find the EndUser
      await prisma.userBeautyProfile.upsert({
        where: { endUserId: userId },
        update: {
          completedAreas: areas as any,
          skinType: mapSkinType(answers['S1'] as string | undefined),
          skinConcerns: (answers['S4'] as any) ?? [],
          monkSkinTone: answers['S5'] ? parseInt(answers['S5'] as string) : null,
          hairProfile: (extractAreaAnswers(answers, 'H') ?? Prisma.JsonNull) as any,
          bodyProfile: (extractAreaAnswers(answers, 'B') ?? Prisma.JsonNull) as any,
        },
        create: {
          endUserId: userId,
          completedAreas: areas as any,
          skinType: mapSkinType(answers['S1'] as string | undefined),
          skinConcerns: (answers['S4'] as any) ?? [],
          monkSkinTone: answers['S5'] ? parseInt(answers['S5'] as string) : null,
          hairProfile: (extractAreaAnswers(answers, 'H') ?? Prisma.JsonNull) as any,
          bodyProfile: (extractAreaAnswers(answers, 'B') ?? Prisma.JsonNull) as any,
        },
      })

      // Create a completed quiz session
      const session = await prisma.quizSession.create({
        data: {
          brandId,
          endUserId: userId,
          answers: answers as any,
          selectedAreas: areas as any,
          completed: true,
          completedAt: new Date(),
        },
      })

      // Generate routines using this brand's catalog — non-blocking
      generateRoutinesAsync(userId, brandId, session.id, areas, answers)

      return reply.send({ status: 'generating', routines: [], firstName: endUserRecord?.firstName ?? null })
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

const SLEEP_LABELS: Record<string, string> = {
  '4': 'Under 5 hours', '6': '5–7 hours', '8': '7–9 hours', '9.5': 'Over 9 hours',
}
const WATER_LABELS: Record<string, string> = {
  '500': 'Under 1L', '1250': '1–1.5L', '1750': '1.5–2L', '2250': '2–2.5L', '3000': 'Over 2.5L',
}

function birthdayToAgeRange(birthday: string): string | null {
  const dob = new Date(birthday)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  if (age < 18) return 'under_18'
  if (age < 25) return '18_24'
  if (age < 35) return '25_34'
  if (age < 45) return '35_44'
  if (age < 55) return '45_54'
  if (age < 65) return '55_64'
  return '65_plus'
}

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
