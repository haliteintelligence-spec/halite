import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('halite2026', 12)

  await prisma.haliteAdmin.upsert({
    where: { email: 'admin@haliteintelligence.com' },
    update: { password },
    create: {
      email: 'admin@haliteintelligence.com',
      password,
      name: 'Halite Admin',
    },
  })

  const demoBrand = await prisma.brand.upsert({
    where: { slug: 'demo' },
    update: {
      focusAreas: ['SKINCARE', 'HAIR', 'BODY'] as any,
    },
    create: {
      name: 'Demo Brand',
      slug: 'demo',
      focusAreas: ['SKINCARE', 'HAIR', 'BODY'] as any,
    },
  })

  await prisma.brandAdmin.upsert({
    where: { email: 'admin@haliteintelligence.com' },
    update: { password },
    create: {
      brandId: demoBrand.id,
      email: 'admin@haliteintelligence.com',
      password,
      name: 'Halite Admin',
      role: 'OWNER',
    },
  })

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
