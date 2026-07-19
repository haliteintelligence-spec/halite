import { prisma } from '@halite/db'

// Hallie Testing's own Postgres tables live in the same database, under a
// dedicated `hallie_testing` schema (see that repo's prisma/schema.prisma
// datasource url, which appends `?schema=hallie_testing`). This provisions
// a bare, passwordless account there the moment someone engages with any
// Halite brand's quiz or check-in (demo or onboarded — no tier check),
// keyed on the same email their Consumer identity already uses, so the
// account is immediately claimable once they visit Hallie Testing directly
// (see that repo's signUpWithPassword — a passwordless account is "claimed"
// by signing up again with the same email, no merge logic needed on their
// side). Deliberately identity-only: no preference/profile data is copied
// here — that only happens once the person reaches Hallie Testing and
// grants partner_brand_sharing consent themselves (see pullHaliteProfile
// in that repo's src/lib/halite.ts).
export async function provisionHallieTestingAccount(consumer: {
  email: string | null
  phone: string | null
  firstName?: string | null
  lastName?: string | null
}): Promise<void> {
  if (!consumer.email) return
  try {
    const name = [consumer.firstName, consumer.lastName].filter(Boolean).join(' ') || 'Hallie Member'
    await prisma.$executeRaw`
      INSERT INTO hallie_testing.hallie_testing_users (id, email, phone, name, "passwordHash", "createdAt")
      VALUES (gen_random_uuid()::text, ${consumer.email}, ${consumer.phone}, ${name}, NULL, now())
      ON CONFLICT (email) DO NOTHING
    `
  } catch (err) {
    console.warn('[hallie-provisioning] skipped — Hallie Testing schema unreachable:', err)
  }
}
