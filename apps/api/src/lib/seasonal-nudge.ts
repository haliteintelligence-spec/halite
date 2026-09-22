import { prisma } from '@halite/db'
import type { BeautyArea } from '@halite/db'
import { readSeasonal } from './seasonal.js'

/**
 * Telling a shopper their season has turned.
 *
 * This is outbound messaging to a consumer, which is a different thing from
 * ranking a page they chose to visit. Three rules hold it down:
 *
 *  1. It only fires for someone whose own logs show the turn. A prior is
 *     enough to reorder a grid; it is not enough to put a message in
 *     somebody's inbox.
 *  2. Once a quarter, at most, per person. A seasonal nudge that arrives
 *     monthly is not seasonal.
 *  3. It goes nowhere unless SEASONAL_NUDGES_ENABLED is set. The queue
 *     builds either way, so the copy and the cadence can be reviewed
 *     against real candidates before anything is sent.
 */

/** Below this the turn is a guess, and a guess is not worth an email. */
const MIN_CONFIDENCE = 0.55

/** One per person per quarter. */
const COOLDOWN_DAYS = 90

export interface SeasonalNudge {
  consumerId: string
  publicId: string
  email: string | null
  direction: 'HEAVIER' | 'LIGHTER'
  season: string | null
  headline: string
  body: string
  /** What they are moving toward, for whatever picks the products. */
  favour: string[]
  confidence: number
}

function copyFor(direction: 'HEAVIER' | 'LIGHTER', season: string | null): { headline: string; body: string } {
  if (direction === 'HEAVIER') {
    return {
      headline: season ? `Your ${season.toLowerCase()} routine is already changing` : 'Your routine is already changing',
      body:
        'You have been reaching for richer textures over the last few weeks. That usually means ' +
        'the lighter things in your routine have stopped being enough — worth a look at what you ' +
        'have before it gets colder.',
    }
  }
  return {
    headline: season ? `Lightening up for ${season.toLowerCase()}` : 'You have been lightening up',
    body:
      'Your last few weeks lean lighter than the months before them. If anything in your routine ' +
      'is starting to feel like too much, this is usually why.',
  }
}

/**
 * Everyone whose season has genuinely turned and who has not been told
 * recently. Building the list has no side effects.
 */
export async function findSeasonalNudges(limit = 200): Promise<SeasonalNudge[]> {
  const cooldown = new Date(Date.now() - COOLDOWN_DAYS * 864e5)

  const consumers = await prisma.consumer.findMany({
    where: {
      hallieUserId: { not: null },
      // Someone with no connected brand has not asked to hear from us.
      consentGrants: { some: { status: 'ACTIVE' } },
      seasonalNudges: { none: { sentAt: { gte: cooldown } } },
    },
    select: {
      id: true, publicId: true, email: true,
      consentGrants: { where: { status: 'ACTIVE' }, select: { categories: true } },
    },
    take: limit,
  })

  const out: SeasonalNudge[] = []
  for (const c of consumers) {
    const areas = [...new Set(c.consentGrants.flatMap(g => g.categories))] as BeautyArea[]
    if (areas.length === 0) continue

    const read = await readSeasonal({ consumerId: c.id, areas })
    // The person's own logs, or nothing. A prior reorders a page; it does
    // not get to tell someone about their own skin.
    if (!read.sources.personal) continue
    if (!read.in_transition) continue
    if (read.confidence < MIN_CONFIDENCE) continue
    if (read.direction !== 'HEAVIER' && read.direction !== 'LIGHTER') continue

    out.push({
      consumerId: c.id,
      publicId: c.publicId,
      email: c.email,
      direction: read.direction,
      season: read.season,
      ...copyFor(read.direction, read.season),
      favour: read.favour.slice(0, 6).map(f => f.attribute),
      confidence: read.confidence,
    })
  }
  return out
}

/** Marks a nudge as sent, which is also what starts the cooldown. */
export async function recordNudgeSent(nudge: SeasonalNudge): Promise<void> {
  await prisma.seasonalNudge.create({
    data: {
      consumerId: nudge.consumerId,
      direction: nudge.direction,
      season: nudge.season,
      favour: nudge.favour,
      confidence: nudge.confidence,
    },
  })
}

/**
 * Builds the queue, and sends only when switched on.
 *
 * Returns the candidates either way, so the cadence and the copy can be
 * reviewed against real people before a single message goes out.
 */
export async function runSeasonalNudges(opts: { limit?: number } = {}): Promise<{
  candidates: SeasonalNudge[]
  sent: number
  enabled: boolean
}> {
  const candidates = await findSeasonalNudges(opts.limit ?? 200)
  const enabled = process.env.SEASONAL_NUDGES_ENABLED === 'true'
  if (!enabled) return { candidates, sent: 0, enabled }

  let sent = 0
  for (const n of candidates) {
    if (!n.email) continue
    // Delivery is deliberately not implemented here. Wire this to whatever
    // sends the rest of Hallie's mail, so unsubscribes and suppression are
    // handled in one place rather than two.
    await recordNudgeSent(n)
    sent++
  }
  return { candidates, sent, enabled }
}
