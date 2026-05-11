import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'

// ── Shopify OAuth install flow ────────────────────────────────────────────
export async function shopifyRoutes(server: FastifyInstance) {
  // Step 1: Begin OAuth
  server.get('/install', async (request, reply) => {
    const { shop, brandId } = request.query as { shop: string; brandId: string }
    if (!shop || !brandId) throw new ApiError(400, 'Missing shop or brandId')

    const clientId = process.env.SHOPIFY_CLIENT_ID!
    const redirectUri = `${process.env.API_BASE_URL}/shopify/callback`
    const scopes = 'read_products,read_customers,read_orders,write_script_tags'
    const state = Buffer.from(JSON.stringify({ brandId })).toString('base64')

    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
    return reply.redirect(authUrl)
  })

  // Step 2: OAuth callback
  server.get('/callback', async (request, reply) => {
    const { code, shop, state, hmac } = request.query as Record<string, string>

    // Verify HMAC
    const params = Object.entries(request.query as Record<string, string>)
      .filter(([k]) => k !== 'hmac')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    const expected = crypto
      .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
      .update(params)
      .digest('hex')
    if (expected !== hmac) throw new ApiError(400, 'Invalid HMAC')

    const { brandId } = JSON.parse(Buffer.from(state!, 'base64').toString())

    // Exchange code for token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })
    const { access_token } = await tokenRes.json() as { access_token: string }

    await prisma.brand.update({
      where: { id: brandId },
      data: { shopifyShop: shop ?? null, shopifyToken: access_token },
    })

    // Kick off initial catalog sync
    await triggerShopifyProductSync(brandId, shop!, access_token)

    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { slug: true } })
    const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3002'
    return reply.redirect(`${dashboardUrl}/${brand!.slug}/settings/integrations?connected=true`)
  })

  // ── Shopify Webhooks ─────────────────────────────────────────────────
  server.post('/webhooks/products', async (request, reply) => {
    const shopDomain = request.headers['x-shopify-shop-domain'] as string
    const hmac = request.headers['x-shopify-hmac-sha256'] as string

    const rawBody = JSON.stringify(request.body)
    const expected = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('base64')
    if (expected !== hmac) return reply.status(401).send()

    const brand = await prisma.brand.findUnique({ where: { shopifyShop: shopDomain } })
    if (!brand) return reply.status(200).send()

    const product = request.body as ShopifyProduct
    await upsertShopifyProduct(brand.id, product)

    return reply.status(200).send()
  })

  // ── Brand admin: manual Shopify sync ──────────────────────────────
  server.post(
    '/brands/:brandId/shopify/sync',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({ where: { id: brandId } })
      if (!brand?.shopifyShop || !brand.shopifyToken) throw new ApiError(400, 'Shopify not connected')

      triggerShopifyProductSync(brandId, brand.shopifyShop, brand.shopifyToken).catch(console.error)
      return reply.status(202).send({ message: 'Sync started' })
    }
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface ShopifyProduct {
  id: number
  title: string
  body_html?: string
  product_type?: string
  tags?: string
  variants: Array<{ price: string; inventory_quantity: number }>
  images: Array<{ src: string }>
  handle: string
}

async function upsertShopifyProduct(brandId: string, product: ShopifyProduct) {
  const price = parseFloat(product.variants[0]?.price ?? '0')
  const inStock = (product.variants[0]?.inventory_quantity ?? 0) > 0

  await prisma.product.upsert({
    where: { brandId_externalId: { brandId, externalId: String(product.id) } },
    update: {
      name: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '') ?? null,
      price,
      inStock,
      imageUrl: product.images[0]?.src ?? null,
      productUrl: `https://${(await prisma.brand.findUnique({ where: { id: brandId }, select: { shopifyShop: true } }))?.shopifyShop}/products/${product.handle}`,
    },
    create: {
      brandId,
      externalId: String(product.id),
      name: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '') ?? null,
      category: 'OTHER',
      price,
      inStock,
      imageUrl: product.images[0]?.src ?? null,
    },
  })
}

async function triggerShopifyProductSync(brandId: string, shop: string, token: string) {
  let url: string | null = `https://${shop}/admin/api/2024-04/products.json?limit=250`
  let allProducts: ShopifyProduct[] = []

  while (url) {
    const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } })
    const data = await res.json() as { products: ShopifyProduct[] }
    allProducts = allProducts.concat(data.products)

    const link = res.headers.get('Link')
    const next = link?.match(/<([^>]+)>;\s*rel="next"/)
    url = next ? next[1]! : null
  }

  const upload = await prisma.catalogUpload.create({
    data: { brandId, fileName: 'shopify-sync', fileUrl: '', format: 'SHOPIFY_SYNC', status: 'PROCESSING' },
  })

  let processed = 0
  for (const product of allProducts) {
    await upsertShopifyProduct(brandId, product)
    processed++
  }

  await prisma.catalogUpload.update({
    where: { id: upload.id },
    data: { status: 'DONE', rowCount: processed, processedAt: new Date() },
  })
}
