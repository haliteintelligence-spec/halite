import { prisma } from '@halite/db'
import { generateRoutine } from './routine-generator.js'
import { generateDemoPhone, BP_SELECT } from './demo-generator.js'
import { withRetry } from './retry.js'

export interface BackfillStats {
  brandsProcessed: number
  consumersLinked: number
  phonesBackfilled: number
  profilesUnified: number
  routinesGenerated: number
}

// Personal (brand-agnostic) profile fields that should read identically for the
// same Consumer no matter which demo brand you're looking at them from.
const CANONICAL_FIELDS = [
  'ageRange', 'skinType', 'skinConcerns', 'monkSkinTone',
  'city', 'country', 'countryCode', 'sleepHours', 'stressLevel', 'waterIntakeMl', 'hairProfile',
] as const

async function ensureRoutinesForEndUser(brandId: string, focusAreas: string[], endUserId: string): Promise<number> {
  const profile = await prisma.userBeautyProfile.findUnique({
    where: { endUserId },
    select: { skinType: true, skinConcerns: true, ageRange: true, monkSkinTone: true },
  })
  const answers: Record<string, unknown> = {
    __area_select: focusAreas,
    SH0: profile?.ageRange ?? '25_34',
    S1: profile?.skinType?.toLowerCase() ?? 'combination',
    S4: profile?.skinConcerns ?? [],
    S5: String(profile?.monkSkinTone ?? 5),
  }

  let session = await prisma.quizSession.findFirst({ where: { endUserId, brandId, completed: true } })
  if (!session) {
    session = await prisma.quizSession.create({
      data: { brandId, endUserId, selectedAreas: focusAreas as any, answers: answers as any, completed: true, completedAt: new Date() },
    })
  }

  let count = 0
  for (const area of focusAreas) {
    try {
      await withRetry(() => generateRoutine(endUserId, brandId, session!.id, area, answers))
      count++
    } catch { /* skip if catalog too sparse for this area, even after retries */ }
  }
  return count
}

// Idempotent — safe to re-run. Closes gaps in existing demo data:
//  - EndUsers with no linked Consumer, or a Consumer missing a phone, get one
//  - Consumers shared across multiple demo brands get uniform profile data
//  - EndUsers with no active Routine get one generated
// Does NOT attempt new fuzzy identity merging across previously-independent
// demo customers — only completes data for consumers already linked (or exact
// email matches), to avoid incorrectly merging distinct synthetic people.
export async function backfillDemoData(): Promise<BackfillStats> {
  const stats: BackfillStats = { brandsProcessed: 0, consumersLinked: 0, phonesBackfilled: 0, profilesUnified: 0, routinesGenerated: 0 }

  const demoBrands = await prisma.brand.findMany({
    where: { isDemo: true },
    select: { id: true, slug: true, focusAreas: true },
  })

  for (const brand of demoBrands) {
    const focusAreas = brand.focusAreas as string[]

    // ── Link/create Consumer for EndUsers missing one ────────────────────
    const endUsers = await prisma.endUser.findMany({
      where: { brandId: brand.id },
      select: {
        id: true, email: true, consumerId: true,
        beautyProfile: { select: { countryCode: true } },
      },
    })

    for (const eu of endUsers) {
      if (eu.consumerId) continue
      let consumer = eu.email ? await prisma.consumer.findFirst({ where: { email: eu.email } }) : null
      if (!consumer) {
        const phone = generateDemoPhone(eu.beautyProfile?.countryCode ?? null, eu.id)
        try {
          consumer = await prisma.consumer.create({ data: { email: eu.email ?? null, phone } })
        } catch {
          try {
            consumer = await prisma.consumer.create({ data: { email: eu.email ?? null } })
          } catch {
            consumer = await prisma.consumer.create({ data: {} })
          }
        }
      }
      await prisma.endUser.update({ where: { id: eu.id }, data: { consumerId: consumer.id } })
      stats.consumersLinked++
    }

    // ── Backfill phone on already-linked Consumers missing one ───────────
    const linkedConsumerIds = [...new Set(
      (await prisma.endUser.findMany({ where: { brandId: brand.id }, select: { consumerId: true } }))
        .map(e => e.consumerId)
        .filter((id): id is string => !!id)
    )]
    const missingPhone = await prisma.consumer.findMany({ where: { id: { in: linkedConsumerIds }, phone: null } })
    for (const c of missingPhone) {
      const sourceEndUser = await prisma.endUser.findFirst({
        where: { consumerId: c.id },
        select: { id: true, beautyProfile: { select: { countryCode: true } } },
      })
      const phone = generateDemoPhone(sourceEndUser?.beautyProfile?.countryCode ?? null, c.id)
      await prisma.consumer.update({ where: { id: c.id }, data: { phone } }).catch(() => {})
      stats.phonesBackfilled++
    }

    // ── Generate missing routines ─────────────────────────────────────────
    const needsRoutine = await prisma.endUser.findMany({
      where: { brandId: brand.id, routines: { none: { activeTo: null } } },
      select: { id: true },
    })
    const BATCH_SIZE = 10
    for (let i = 0; i < needsRoutine.length; i += BATCH_SIZE) {
      const batch = needsRoutine.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(eu => ensureRoutinesForEndUser(brand.id, focusAreas, eu.id))
      )
      for (const r of results) {
        if (r.status === 'fulfilled') stats.routinesGenerated += r.value
      }
    }

    stats.brandsProcessed++
    console.log(`[backfill-demo-data] ${brand.slug}: done`)
  }

  // ── Unify profiles for consumers shared across demo brands ─────────────
  const sharedConsumers = await prisma.consumer.findMany({
    where: { endUsers: { some: { brand: { isDemo: true } } } },
    select: {
      id: true,
      endUsers: {
        where: { brand: { isDemo: true }, beautyProfile: { isNot: null } },
        select: { id: true, beautyProfile: { select: BP_SELECT } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  for (const consumer of sharedConsumers) {
    if (consumer.endUsers.length < 2) continue
    const canonical = consumer.endUsers[0]?.beautyProfile
    if (!canonical) continue

    for (const eu of consumer.endUsers.slice(1)) {
      const bp = eu.beautyProfile
      if (!bp) continue
      const diverges = CANONICAL_FIELDS.some(
        (f) => JSON.stringify(bp[f]) !== JSON.stringify(canonical[f])
      )
      if (!diverges) continue

      await prisma.userBeautyProfile.update({
        where: { endUserId: eu.id },
        data: {
          ageRange: canonical.ageRange,
          skinType: canonical.skinType as any,
          skinConcerns: canonical.skinConcerns as any,
          monkSkinTone: canonical.monkSkinTone,
          city: canonical.city,
          country: canonical.country,
          countryCode: canonical.countryCode,
          sleepHours: canonical.sleepHours,
          stressLevel: canonical.stressLevel,
          waterIntakeMl: canonical.waterIntakeMl,
          ...(canonical.hairProfile ? { hairProfile: canonical.hairProfile as any } : {}),
        },
      })
      stats.profilesUnified++
    }
  }

  return stats
}
