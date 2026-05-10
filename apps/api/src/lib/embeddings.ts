import OpenAI from 'openai'
import { prisma } from '@halite/db'
import type { Product } from '@halite/db'

let _openai: OpenAI | null = null
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

const MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100

function productToText(p: Product): string {
  const parts: string[] = [p.name]
  if (p.description) parts.push(p.description)
  parts.push(`Category: ${p.category}`)
  parts.push(`Beauty area: ${p.beautyArea}`)
  if (p.concerns.length) parts.push(`Concerns: ${p.concerns.join(', ')}`)
  if (p.skinTypes.length) parts.push(`Skin types: ${p.skinTypes.join(', ')}`)
  if (p.keyIngredients.length) parts.push(`Key ingredients: ${p.keyIngredients.join(', ')}`)
  if (p.subcategory) parts.push(`Subcategory: ${p.subcategory}`)
  parts.push(`Price: ${p.currency} ${p.price}`)
  return parts.join('. ')
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({ model: MODEL, input: texts })
  return response.data.map((d) => d.embedding)
}

export async function embedProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
  const [vector] = await embedBatch([productToText(product)])
  await prisma.$executeRaw`
    UPDATE products SET embedding = ${JSON.stringify(vector)}::vector WHERE id = ${productId}
  `
}

export async function embedBrandProducts(brandId: string): Promise<{ embedded: number; skipped: number }> {
  const products = await prisma.product.findMany({
    where: { brandId },
  })

  let embedded = 0
  let skipped = 0

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)
    const unembed = batch.filter((p) => {
      // We can't read the vector field via Prisma (Unsupported type), so embed all
      return true
    })

    if (!unembed.length) {
      skipped += batch.length
      continue
    }

    const texts = unembed.map(productToText)
    const vectors = await embedBatch(texts)

    for (let j = 0; j < unembed.length; j++) {
      await prisma.$executeRaw`
        UPDATE products SET embedding = ${JSON.stringify(vectors[j])}::vector WHERE id = ${unembed[j]!.id}
      `
    }

    embedded += unembed.length
  }

  return { embedded, skipped }
}

export async function findSimilarProducts(
  brandId: string,
  productId: string,
  limit = 5
): Promise<{ id: string; name: string; similarity: number }[]> {
  const rows = await prisma.$queryRaw<{ id: string; name: string; similarity: number }[]>`
    SELECT p.id, p.name,
           1 - (p.embedding <=> ref.embedding) AS similarity
    FROM products p
    CROSS JOIN (SELECT embedding FROM products WHERE id = ${productId}) ref
    WHERE p.brand_id = ${brandId}
      AND p.id != ${productId}
      AND p.embedding IS NOT NULL
      AND ref.embedding IS NOT NULL
    ORDER BY p.embedding <=> ref.embedding
    LIMIT ${limit}
  `
  return rows
}

export async function findProductsForProfile(
  brandId: string,
  profileVector: number[],
  beautyArea?: string,
  limit = 10
): Promise<{ id: string; name: string; similarity: number }[]> {
  const vectorStr = JSON.stringify(profileVector)

  if (beautyArea) {
    return prisma.$queryRaw<{ id: string; name: string; similarity: number }[]>`
      SELECT id, name,
             1 - (embedding <=> ${vectorStr}::vector) AS similarity
      FROM products
      WHERE brand_id = ${brandId}
        AND beauty_area = ${beautyArea}
        AND in_stock = true
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `
  }

  return prisma.$queryRaw<{ id: string; name: string; similarity: number }[]>`
    SELECT id, name,
           1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM products
    WHERE brand_id = ${brandId}
      AND in_stock = true
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `
}
