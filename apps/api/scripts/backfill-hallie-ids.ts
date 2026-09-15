/**
 * Adopts Hallie account ids as the consumer identity partner brands see.
 *
 *   pnpm --filter @halite/api backfill:hallie-ids
 *
 * Safe to re-run: it only touches consumers that are not already linked.
 */
import { prisma } from '@halite/db'
import { backfillHallieIdentities } from '../src/lib/hallie-identity.js'

console.log('Linking Halite consumers to their Hallie accounts…')
const r = await backfillHallieIdentities()
console.log(`  scanned  : ${r.scanned}`)
console.log(`  linked   : ${r.linked}`)
console.log(`  unmatched: ${r.unmatched} (no Hallie account for that email)`)
await prisma.$disconnect()
