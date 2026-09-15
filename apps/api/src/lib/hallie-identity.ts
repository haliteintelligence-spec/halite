import { prisma } from '@halite/db'

/**
 * Resolves a Halite consumer to the Hallie account they are.
 *
 * A consumer's identity originates in Hallie — Halite is the commercial
 * layer on top of it, not a second source of people. So the id a partner
 * brand receives should be the Hallie account's id, not one Halite invented:
 * one person, one identifier, the same in both products, and a support
 * question about "hl_cmtds4…" is answerable in the Hallie admin.
 *
 * Matching is by email, which is what provisionHallieTestingAccount keys on
 * when it reserves an account for someone who reached a brand first.
 *
 * Best-effort: a consumer with no Hallie account keeps the random publicId
 * they were given, and gets rewritten the moment the account appears.
 */

export function publicIdForHallieUser(hallieUserId: string): string {
  return `hl_${hallieUserId}`
}

/**
 * Links one consumer to their Hallie account if it can be found, and adopts
 * the Hallie id as the identity brands see. Returns the consumer's publicId
 * either way, so callers can use the result directly.
 */
export async function linkHallieAccount(consumerId: string): Promise<string | null> {
  try {
    const consumer = await prisma.consumer.findUnique({
      where: { id: consumerId },
      select: { id: true, email: true, publicId: true, hallieUserId: true },
    })
    if (!consumer) return null
    if (consumer.hallieUserId) return consumer.publicId
    if (!consumer.email) return consumer.publicId

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM hallie_testing.hallie_testing_users
      WHERE lower(email) = lower(${consumer.email})
      LIMIT 1
    `
    const hallieUserId = rows[0]?.id
    if (!hallieUserId) return consumer.publicId

    // Another consumer may already hold this account — two Halite records for
    // one person. Leave both alone rather than stealing the id; the duplicate
    // is a data problem to resolve, not something to paper over here.
    const taken = await prisma.consumer.findFirst({
      where: { hallieUserId, NOT: { id: consumer.id } },
      select: { id: true },
    })
    if (taken) {
      console.warn(`[hallie-identity] ${hallieUserId} already linked to consumer ${taken.id}; leaving ${consumer.id} unlinked`)
      return consumer.publicId
    }

    const updated = await prisma.consumer.update({
      where: { id: consumer.id },
      data: { hallieUserId, publicId: publicIdForHallieUser(hallieUserId) },
      select: { publicId: true },
    })
    return updated.publicId
  } catch (err) {
    console.warn('[hallie-identity] link skipped:', err)
    return null
  }
}

/** Backfills every consumer whose Hallie account can be resolved. */
export async function backfillHallieIdentities(): Promise<{
  scanned: number; linked: number; conflicts: number; unmatched: number
}> {
  const consumers = await prisma.consumer.findMany({
    where: { hallieUserId: null, email: { not: null } },
    select: { id: true },
  })

  let linked = 0
  let conflicts = 0
  let unmatched = 0

  for (const c of consumers) {
    const before = await prisma.consumer.findUnique({
      where: { id: c.id }, select: { hallieUserId: true },
    })
    await linkHallieAccount(c.id)
    const after = await prisma.consumer.findUnique({
      where: { id: c.id }, select: { hallieUserId: true },
    })
    if (!before?.hallieUserId && after?.hallieUserId) linked++
    else unmatched++
  }

  return { scanned: consumers.length, linked, conflicts, unmatched }
}
