import { randomUUID } from 'node:crypto'
import { prisma } from '@halite/db'
import type { HallieCategory } from './hallie-quiz.js'

/**
 * Writes preference-quiz answers into Hallie as the shopper's own profile.
 *
 * One row per category in hallie_testing_preference_responses, keyed on the
 * Hallie user — the same table and shape Hallie's own quiz writes, so a
 * profile started on a brand's storefront is indistinguishable from one
 * started in the app, and the shopper sees it when they open Hallie.
 *
 * Answers are stored as a JSON string, because that is how the column is
 * typed there (text, not jsonb).
 */
export async function writeHallieProfile(args: {
  email: string
  responses: Array<{ category: HallieCategory; answers: Record<string, string[]> }>
}): Promise<{ written: number }> {
  try {
    const users = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM hallie_testing.hallie_testing_users WHERE lower(email) = lower(${args.email}) LIMIT 1
    `
    const userId = users[0]?.id
    if (!userId) return { written: 0 }

    let written = 0
    for (const r of args.responses) {
      const payload = JSON.stringify(r.answers)
      // A returning shopper retaking the quiz updates their answers rather
      // than accumulating a second row for the same category.
      const updated = await prisma.$executeRaw`
        UPDATE hallie_testing.hallie_testing_preference_responses
        SET answers = ${payload}, "updatedAt" = now()
        WHERE "userId" = ${userId} AND category = ${r.category}
      `
      if (updated === 0) {
        await prisma.$executeRaw`
          INSERT INTO hallie_testing.hallie_testing_preference_responses
            (id, "userId", category, answers, "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${userId}, ${r.category}, ${payload}, now(), now())
        `
      }
      written++
    }
    return { written }
  } catch (err) {
    console.warn('[hallie-profile] write skipped:', err)
    return { written: 0 }
  }
}
