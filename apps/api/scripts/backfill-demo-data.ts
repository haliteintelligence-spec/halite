/**
 * Backfills data-integrity gaps in existing demo brands — missing consumer
 * links/phone numbers, divergent shared-consumer profiles, and missing
 * routines. Idempotent — safe to re-run.
 *
 * Run: pnpm --filter @halite/api backfill:demos
 */

import { prisma } from '@halite/db'
import { backfillDemoData } from '../src/lib/demo-backfill.js'

async function main() {
  console.log('Backfilling demo data…')
  const stats = await backfillDemoData()
  console.log('\nDone:', stats)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
