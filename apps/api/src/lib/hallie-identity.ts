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
 * Matching is by email first — that is what provisionHallieTestingAccount
 * keys on when it reserves an account for someone who reached a brand first
 * — then by phone, since a shopper may connect with either and 113 of 129
 * Hallie accounts carry a number.
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
      select: { id: true, email: true, phone: true, publicId: true, hallieUserId: true },
    })
    if (!consumer) return null
    if (consumer.hallieUserId) return consumer.publicId
    if (!consumer.email && !consumer.phone) return consumer.publicId

    let hallieUserId: string | undefined

    if (consumer.email) {
      const byEmail = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM hallie_testing.hallie_testing_users
        WHERE lower(email) = lower(${consumer.email})
        LIMIT 1
      `
      hallieUserId = byEmail[0]?.id
    }

    // Phone numbers are stored however the person typed them, so compare on
    // digits. A suffix match handles +234… against 0… for the same line, but
    // only when exactly one account matches — an ambiguous match is not an
    // identity, and linking the wrong person is worse than not linking.
    if (!hallieUserId && consumer.phone) {
      const digits = consumer.phone.replace(/\D/g, '')
      if (digits.length >= 9) {
        const tail = digits.slice(-9)
        const byPhone = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM hallie_testing.hallie_testing_users
          WHERE phone IS NOT NULL
            AND right(regexp_replace(phone, '\D', '', 'g'), 9) = ${tail}
          LIMIT 2
        `
        if (byPhone.length === 1) hallieUserId = byPhone[0]!.id
        else if (byPhone.length > 1) {
          console.warn(`[hallie-identity] phone ending ${tail} matches more than one Hallie account; not linking`)
        }
      }
    }

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
    where: {
      hallieUserId: null,
      OR: [{ email: { not: null } }, { phone: { not: null } }],
    },
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
