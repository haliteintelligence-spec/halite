/**
 * Seeds Halite Connect activity for an existing brand.
 *
 *   pnpm --filter @halite/api seed:connect <brand-slug> [grants]
 *
 * Demos created from now on get this automatically (see demo-generator);
 * this script is for brands that existed before Connect.
 */
import { prisma } from '@halite/db'
import { seedConnectActivity } from '../src/lib/connect-seed.js'

const slug = process.argv[2]
const grants = process.argv[3] ? Number(process.argv[3]) : undefined

if (!slug) {
  console.error('usage: seed-connect <brand-slug> [grants]')
  process.exit(1)
}

const brand = await prisma.brand.findUnique({
  where: { slug },
  select: { id: true, name: true, focusAreas: true },
})

if (!brand) {
  console.error(`No brand with slug "${slug}"`)
  process.exit(1)
}

console.log(`Seeding Connect for ${brand.name} (${brand.focusAreas.join(', ')})…`)
const result = await seedConnectActivity({
  brandId: brand.id,
  ...(grants ? { grants } : {}),
})

console.log(`  grants created : ${result.grants} (${result.revoked} later revoked)`)
console.log(`  already had    : ${result.skipped}`)
console.log(`  prompts shown  : ${result.prompts} (${result.declines} declined)`)
console.log(`  recommendations: ${result.recommendations}`)
console.log(`  events         : ${result.events}`)

await prisma.$disconnect()
