import { parse } from 'csv-parse/sync'
import { prisma, CatalogFormat, ProductCategory, SkinConcern, SkinType } from '@halite/db'

interface RawProductRow {
  name: string
  description?: string
  category: string
  concerns?: string
  skin_types?: string
  fitzpatrick_types?: string
  ingredients?: string
  key_ingredients?: string
  price: string
  currency?: string
  image_url?: string
  product_url?: string
  external_id?: string
  in_stock?: string
}

function normalizeCategory(raw: string): ProductCategory {
  const map: Record<string, ProductCategory> = {
    cleanser: 'CLEANSER',
    toner: 'TONER',
    serum: 'SERUM',
    moisturizer: 'MOISTURIZER',
    'eye cream': 'EYE_CREAM',
    spf: 'SPF',
    sunscreen: 'SPF',
    mask: 'MASK',
    exfoliant: 'EXFOLIANT',
    exfoliator: 'EXFOLIANT',
    oil: 'FACIAL_OIL',
    'facial oil': 'FACIAL_OIL',
    mist: 'MIST',
    'spot treatment': 'SPOT_TREATMENT',
    balm: 'BALM',
    supplement: 'SUPPLEMENT',
  }
  return map[raw.toLowerCase().trim()] ?? 'OTHER'
}

function splitTags<T>(raw: string | undefined, valid: T[]): T[] {
  if (!raw) return []
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, '_') as T)
    .filter((s) => valid.includes(s))
}

const VALID_CONCERNS = Object.values(SkinConcern) as string[]
const VALID_SKIN_TYPES = Object.values(SkinType) as string[]

export async function processCatalogUpload(
  uploadId: string,
  brandId: string,
  buffer: Buffer,
  format: CatalogFormat
) {
  let rows: RawProductRow[]

  if (format === 'CSV') {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as RawProductRow[]
  } else if (format === 'JSON') {
    rows = JSON.parse(buffer.toString('utf-8')) as RawProductRow[]
  } else {
    throw new Error(`Unsupported format: ${format}`)
  }

  let processed = 0
  const errors: { row: number; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    try {
      const price = parseFloat(row.price)
      if (!row.name || isNaN(price)) throw new Error('Missing required field: name or price')

      const fitzTypes = (row.fitzpatrick_types ?? '')
        .split(/[,;|]/)
        .map((s) => parseInt(s.trim()))
        .filter((n) => n >= 1 && n <= 6)

      await prisma.product.upsert({
        where: {
          brandId_externalId: {
            brandId,
            externalId: row.external_id ?? row.name,
          },
        },
        update: {
          name: row.name,
          description: row.description,
          category: normalizeCategory(row.category),
          concerns: splitTags(row.concerns, VALID_CONCERNS) as SkinConcern[],
          skinTypes: splitTags(row.skin_types, VALID_SKIN_TYPES) as SkinType[],
          fitzpatrickTypes: fitzTypes,
          ingredients: row.ingredients?.split(',').map((s) => s.trim()) ?? [],
          keyIngredients: row.key_ingredients?.split(',').map((s) => s.trim()) ?? [],
          price,
          currency: row.currency ?? 'USD',
          imageUrl: row.image_url,
          productUrl: row.product_url,
          inStock: row.in_stock !== 'false' && row.in_stock !== '0',
        },
        create: {
          brandId,
          externalId: row.external_id ?? row.name,
          name: row.name,
          description: row.description,
          category: normalizeCategory(row.category),
          concerns: splitTags(row.concerns, VALID_CONCERNS) as SkinConcern[],
          skinTypes: splitTags(row.skin_types, VALID_SKIN_TYPES) as SkinType[],
          fitzpatrickTypes: fitzTypes,
          ingredients: row.ingredients?.split(',').map((s) => s.trim()) ?? [],
          keyIngredients: row.key_ingredients?.split(',').map((s) => s.trim()) ?? [],
          price,
          currency: row.currency ?? 'USD',
          imageUrl: row.image_url,
          productUrl: row.product_url,
          inStock: row.in_stock !== 'false' && row.in_stock !== '0',
        },
      })
      processed++
    } catch (err) {
      errors.push({ row: i + 2, error: String(err) })
    }
  }

  await prisma.catalogUpload.update({
    where: { id: uploadId },
    data: {
      status: errors.length > 0 && processed === 0 ? 'FAILED' : 'DONE',
      rowCount: processed,
      errorLog: errors.length > 0 ? { errors } : undefined,
      processedAt: new Date(),
    },
  })
}
