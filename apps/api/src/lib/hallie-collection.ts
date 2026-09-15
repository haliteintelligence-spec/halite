import { randomUUID } from 'node:crypto'
import { prisma } from '@halite/db'
import type { BeautyArea, ProductCategory } from '@halite/db'

/**
 * Mirrors what a shopper does on a brand's storefront into their Hallie
 * collection — saves onto the wishlist, purchases onto the shelf.
 *
 * Hallie owns its own tables in the `hallie_testing` schema of the same
 * database (see hallie-provisioning.ts). A shopper's whole collection lives
 * in `hallie_testing_products` — one row per product, with the collection it
 * sits in held on the row: `isWishlist` for the wishlist, `isEmpty` for
 * empties, neither for the shelf. That is the table Hallie's own "add an
 * entry" form writes to, so a Connect save lands exactly where a manual add
 * would and shows up in the app with no further sync.
 *
 * The mappings below were read off the live table rather than assumed —
 * Hallie's category and product-type vocabulary is its own, and does not
 * match Halite's enums (Halite's FRAGRANCE is Hallie's `perfume`,
 * MOISTURIZER is `face_cream`, and so on).
 *
 * A save carries the match score across as a Hallie rating out of 10, so the
 * shopper opens Hallie later and sees how well the thing they saved suits
 * them — not just that they saved it. A purchase does not: they own it now,
 * and the rating on a shelf item is theirs to give once they have used it.
 *
 * Buying something already on the wishlist moves it rather than duplicating
 * it, and records the move the way Hallie's own app would.
 *
 * Hallie also records every collection move in
 * `hallie_testing_product_collection_events` (toCollection 'shelf' |
 * 'wishlist' | 'empty'). A save writes that companion row too, so a
 * Connect-sourced wishlist add reads identically to a manual one in
 * Hallie's own history, points and analytics.
 *
 * Best-effort throughout: a failure here must never fail the brand's event
 * ingestion, and a shopper with no Hallie account simply gets no row.
 */

/** Halite beauty area -> the five categories Hallie actually uses. */
const CATEGORY: Record<BeautyArea, string> = {
  SKINCARE: 'skin_care',
  BODY: 'body_care',
  HAIR: 'hair_care',
  MAKEUP: 'makeup',
  FRAGRANCE: 'perfume',
  // Hallie has no separate vocabulary for these yet, so they fold into the
  // nearest shelf a user would actually browse them under.
  NAILS: 'makeup',
  WELLNESS: 'body_care',
  SUN_CARE: 'skin_care',
  LIP_CARE: 'makeup',
  EYE_CARE: 'skin_care',
}

/** Halite product category -> Hallie's product type, within that category. */
const PRODUCT_TYPE: Partial<Record<ProductCategory, string>> = {
  // skin_care
  CLEANSER: 'cleanser', TONER: 'toner', SERUM: 'serum', MOISTURIZER: 'face_cream',
  EYE_CREAM: 'eye_cream', SPF: 'sunscreen', MASK: 'face_mask', FACIAL_OIL: 'face_oil',
  // body_care
  BODY_WASH: 'body_wash', BODY_MOISTURIZER: 'body_lotion', BODY_OIL: 'body_oil',
  BODY_SPF: 'sunscreen',
  // hair_care
  SHAMPOO: 'shampoo', CONDITIONER: 'conditioner', HAIR_MASK: 'hair_mask',
  SCALP_TREATMENT: 'scalp_oil', LEAVE_IN: 'leave_in_conditioner', HAIR_OIL: 'hair_oil',
  // makeup
  PRIMER: 'primer', FOUNDATION: 'foundation', CONCEALER: 'concealer',
  COLOR_CORRECTOR: 'concealer', BLUSH_BRONZER: 'blush', EYE_MAKEUP: 'eyeshadow',
  LIP_COLOR: 'lip', LIP_BALM: 'lip', LIP_TREATMENT: 'lip', LIP_PLUMPER: 'lip',
  SETTING_SPRAY: 'setting_spray', SETTING_POWDER: 'loose_powder', BROW_SERUM: 'brows',
  // perfume
  EAU_DE_PARFUM: 'edp', EAU_DE_TOILETTE: 'edt',
  BODY_MIST_SCENTED: 'hair_body_mist', HAIR_MIST: 'hair_body_mist',
}

/** Hallie stores brands upper-cased. */
function normalizeBrand(brand: string): string {
  return brand.trim().replace(/\s+/g, ' ').toUpperCase()
}

/**
 * Hallie stores names title-cased with punctuation flattened to spaces —
 * "BETA-GLUCAN POWER MOISTURE SERUM" becomes "Beta Glucan Power Moisture Serum".
 */
function normalizeName(name: string): string {
  return name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export type HallieCollection = 'shelf' | 'wishlist'

export async function mirrorToHallieCollection(args: {
  email: string | null
  brandName: string
  productName: string
  beautyArea: BeautyArea
  category: ProductCategory
  price: number | null
  currency: string | null
  imageUrl: string | null
  collection: HallieCollection
  /** Hallie rates out of 10. Only set for a wishlist save. */
  rating?: number | null
}): Promise<void> {
  if (!args.email) return

  try {
    const users = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM hallie_testing.hallie_testing_users WHERE lower(email) = lower(${args.email}) LIMIT 1
    `
    const userId = users[0]?.id
    if (!userId) return

    const hallieCategory = CATEGORY[args.beautyArea] ?? 'skin_care'
    const hallieType = PRODUCT_TYPE[args.category] ?? 'other'
    const normalizedBrand = normalizeBrand(args.brandName)
    const normalizedName = normalizeName(args.productName)
    const toShelf = args.collection === 'shelf'

    // Already in their collection?
    const existing = await prisma.$queryRaw<Array<{ id: string; isWishlist: boolean; isEmpty: boolean }>>`
      SELECT id, "isWishlist", "isEmpty"
      FROM hallie_testing.hallie_testing_products
      WHERE "userId" = ${userId}
        AND "normalizedBrand" = ${normalizedBrand}
        AND "normalizedName" = ${normalizedName}
        AND "removedAt" IS NULL
      LIMIT 1
    `
    const row = existing[0]

    if (row) {
      const from = row.isEmpty ? 'empty' : row.isWishlist ? 'wishlist' : 'shelf'
      const to = toShelf ? 'shelf' : 'wishlist'
      if (from === to) return

      // Only ever promote wishlist → shelf. A save on something they already
      // own should not quietly take it off their shelf.
      if (!toShelf) return

      await prisma.$executeRaw`
        UPDATE hallie_testing.hallie_testing_products
        SET "isWishlist" = false, "isEmpty" = false,
            "initialLevel" = COALESCE("initialLevel", 100),
            price = COALESCE(${args.price}, price)
        WHERE id = ${row.id}
      `
      await prisma.$executeRaw`
        INSERT INTO hallie_testing.hallie_testing_product_collection_events
          (id, "productId", "userId", "fromCollection", "toCollection", reason, "createdAt")
        VALUES (${randomUUID()}, ${row.id}, ${userId}, ${from},
                ${to}, ${from === 'empty' ? 'repurchased' : 'user'}, now())
      `
      return
    }

    const productId = randomUUID()
    const inserted = await prisma.$executeRaw`
      INSERT INTO hallie_testing.hallie_testing_products (
        id, "userId", brand, name, "normalizedBrand", "normalizedName",
        categories, "productTypes", "isWishlist", "isEmpty", "initialLevel",
        price, currency, "photoUrl", rating, "createdAt"
      )
      SELECT
        ${productId}, ${userId}, ${args.brandName}, ${args.productName},
        ${normalizedBrand}, ${normalizedName},
        ${JSON.stringify([hallieCategory])}, ${JSON.stringify({ [hallieCategory]: hallieType })},
        ${!toShelf}, false, ${toShelf ? 100 : null},
        ${args.price}, ${args.currency ?? 'USD'}, ${args.imageUrl},
        ${toShelf ? null : (args.rating ?? null)}, now()
      WHERE NOT EXISTS (
        SELECT 1 FROM hallie_testing.hallie_testing_products
        WHERE "userId" = ${userId}
          AND "normalizedBrand" = ${normalizedBrand}
          AND "normalizedName" = ${normalizedName}
          AND "removedAt" IS NULL
      )
    `

    if (inserted === 1) {
      await prisma.$executeRaw`
        INSERT INTO hallie_testing.hallie_testing_product_collection_events
          (id, "productId", "userId", "fromCollection", "toCollection", reason, "createdAt")
        VALUES (${randomUUID()}, ${productId}, ${userId}, NULL,
                ${toShelf ? 'shelf' : 'wishlist'}, 'added', now())
      `
    }
  } catch (err) {
    console.warn('[hallie-collection] mirror skipped:', err)
  }
}
