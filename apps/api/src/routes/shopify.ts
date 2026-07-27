import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'
import { encryptSecret, tryDecryptSecret } from '../lib/secret-box.js'

// ── Shared HMAC verifier ───────────────────────────────────────────────────
function verifyShopifyHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query
  if (!hmac) return false
  const message = Object.entries(rest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const expected = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
    .update(message)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))
}

// ── OAuth state: binds the callback's brandId to the admin session that ────
// actually requested the install. Shopify's own HMAC only proves "this
// callback really came from Shopify" — it says nothing about whether the
// brandId embedded in `state` was legitimately issued, since the caller
// controls that value at the /install-url step. Signing it here closes that
// gap: /callback rejects any state it didn't itself sign and hand out.
function signOAuthState(brandId: string): string {
  const payload = Buffer.from(JSON.stringify({ brandId, ts: Date.now() })).toString('base64url')
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyOAuthState(state: string): { brandId: string } {
  const [payload, sig] = state.split('.')
  if (!payload || !sig) throw new ApiError(400, 'Invalid state')
  const expectedSig = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new ApiError(400, 'Invalid state signature')
  }
  const { brandId, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { brandId: string; ts: number }
  if (Date.now() - ts > 10 * 60 * 1000) throw new ApiError(400, 'OAuth request expired — please try connecting again')
  return { brandId }
}

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

// ── Shopify OAuth install flow ────────────────────────────────────────────
export async function shopifyRoutes(server: FastifyInstance) {
  // Scoped to this plugin's routes only (Fastify content-type parsers are
  // encapsulated per-context). The webhook HMAC must be checked against the
  // exact bytes Shopify signed — JSON.stringify(request.body) re-serializes
  // the already-parsed object, and key order/number/unicode formatting
  // aren't guaranteed to round-trip identically, which made that check both
  // unreliable and the wrong foundation for a signature verification.
  server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    req.rawBody = body as Buffer
    try {
      done(null, body.length ? JSON.parse(body.toString('utf-8')) : {})
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // Step 1: Begin OAuth. Requires an authenticated brand admin — brandId
  // comes from their verified session, never from client input, so the
  // resulting state can only ever point at the brand the caller actually
  // administers. Returns the URL for the frontend to navigate to, rather
  // than redirecting directly, since this is invoked via authenticated
  // fetch (a plain <a href> can't carry an Authorization header).
  server.post('/install-url', { preHandler: requireBrandAdmin }, async (request) => {
    const { shop } = z.object({ shop: z.string() }).parse(request.body)
    if (!SHOP_DOMAIN_RE.test(shop)) throw new ApiError(400, 'Invalid shop domain')
    const brandId = request.brandAdmin!.brandId

    const clientId = process.env.SHOPIFY_CLIENT_ID!
    const redirectUri = `${process.env.API_BASE_URL}/shopify/callback`
    const scopes = 'read_products,read_customers,read_orders,write_script_tags,write_customers'
    const state = signOAuthState(brandId)

    const url = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    return { url }
  })

  // Step 2: OAuth callback
  server.get('/callback', async (request, reply) => {
    const { code, shop, state, hmac } = request.query as Record<string, string>

    // Verify HMAC
    if (!verifyShopifyHmac(request.query as Record<string, string>)) {
      throw new ApiError(400, 'Invalid HMAC')
    }

    const { brandId } = verifyOAuthState(state!)

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
      // shopifyToken (legacy plaintext) is cleared on every new connection —
      // only shopifyTokenEncrypted is written going forward.
      data: { shopifyShop: shop ?? null, shopifyTokenEncrypted: encryptSecret(access_token), shopifyToken: null },
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

    if (!hmac || !request.rawBody) return reply.status(401).send()
    const expected = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
      .update(request.rawBody)
      .digest('base64')
    const expectedBuf = Buffer.from(expected)
    const hmacBuf = Buffer.from(hmac)
    if (expectedBuf.length !== hmacBuf.length || !crypto.timingSafeEqual(expectedBuf, hmacBuf)) {
      return reply.status(401).send()
    }

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
      const token = tryDecryptSecret(brand?.shopifyTokenEncrypted) ?? brand?.shopifyToken ?? null
      if (!brand?.shopifyShop || !token) throw new ApiError(400, 'Shopify not connected')

      triggerShopifyProductSync(brandId, brand.shopifyShop, token).catch(console.error)
      return reply.status(202).send({ message: 'Sync started' })
    }
  )

  // ── App launch: SSO entry point from Shopify Admin ────────────────
  // Shopify opens this URL when a merchant clicks the app in their Admin.
  // Verifies the HMAC, finds the brand, issues a Halite JWT, and redirects
  // to the brand dashboard via the slug-scoped SSO handoff route.
  server.get('/launch', async (request, reply) => {
    const query = request.query as Record<string, string>
    const { shop, timestamp } = query

    if (!shop) throw new ApiError(400, 'Missing shop param')

    if (!verifyShopifyHmac(query)) throw new ApiError(400, 'Invalid HMAC')

    // Reject stale requests (> 5 minutes old)
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp ?? '0')) > 300) {
      throw new ApiError(400, 'Request expired')
    }

    const brand = await prisma.brand.findUnique({
      where: { shopifyShop: shop },
      select: {
        id: true, slug: true, active: true,
        admins: { select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    })
    if (!brand) throw new ApiError(404, 'No Halite account found for this store')
    if (!brand.active) throw new ApiError(403, 'Brand account is inactive')

    const admin = brand.admins[0]
    if (!admin) throw new ApiError(400, 'No admin account found for this brand')

    const token = server.jwt.sign(
      { role: 'brand_admin', adminId: admin.id, brandId: brand.id },
      { expiresIn: '24h' }
    )

    const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3002'
    return reply.redirect(`${dashboardUrl}/${brand.slug}/sso?token=${encodeURIComponent(token)}`)
  })

  // ── App Proxy: storefront requests from Shopify ────────────────────
  // Shopify forwards requests from `yourstore.myshopify.com/a/halite/*`
  // to this endpoint. Shopify appends shop, path_prefix, logged_in_customer_id,
  // and a proxy signature. Returns widget config for use in theme code.
  server.get('/proxy', async (request, reply) => {
    const query = request.query as Record<string, string>
    const { signature, shop, path_prefix, logged_in_customer_id, ...rest } = query

    if (!signature) throw new ApiError(400, 'Missing proxy signature')
    if (!shop) throw new ApiError(400, 'Missing shop param')

    // Proxy signature: sort all params (excl. signature), concatenate as key=value (no &), HMAC-SHA256
    const message = Object.entries({ shop, path_prefix, logged_in_customer_id, ...rest })
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('')
    const expected = crypto
      .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
      .update(message)
      .digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      throw new ApiError(401, 'Invalid proxy signature')
    }

    const brand = await prisma.brand.findUnique({
      where: { shopifyShop: shop },
      select: { apiKey: true, slug: true, primaryColor: true, active: true },
    })
    if (!brand?.active) throw new ApiError(404, 'Brand not found')

    // Return widget config — theme code uses this to initialise the Halite widget
    reply.header('Content-Type', 'application/json')
    return {
      apiKey: brand.apiKey,
      slug: brand.slug,
      widgetUrl: 'https://cdn.haliteintelligence.com/widget.js',
      accentColor: brand.primaryColor ?? '#450F2A',
      customerId: logged_in_customer_id ?? null,
    }
  })
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
