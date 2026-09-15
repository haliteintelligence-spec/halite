import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

/**
 * Serves the embeddable widget bundle.
 *
 * Brands paste a <script src> pointing here into their storefront, so this
 * is the one route whose URL is baked into other people's HTML — it has to
 * stay stable, cacheable, and reachable from any origin.
 *
 * The bundle is copied next to the compiled server by apps/api's build step
 * (see its package.json), so there is no cross-package path resolution at
 * runtime and nothing to install.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const BUNDLE = join(HERE, '..', 'public', 'widget.js')

// A script tag caches by URL, so a long max-age would strand storefronts on
// an old build. An hour is long enough to matter and short enough to ship.
const MAX_AGE = 3600

export async function widgetRoutes(server: FastifyInstance) {
  let cached: { body: Buffer; etag: string } | null = null

  async function load() {
    if (cached) return cached
    const body = await readFile(BUNDLE)
    const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 32)}"`
    cached = { body, etag }
    return cached
  }

  // Warm on boot so the first storefront request is not the one that
  // discovers the file is missing.
  try {
    const warm = await load()
    server.log.info({ bytes: warm.body.length }, 'widget bundle loaded')
  } catch (err) {
    server.log.error({ err, path: BUNDLE }, 'widget bundle missing — /widget.js will 503')
  }

  async function serve(request: FastifyRequest, reply: FastifyReply) {
    let asset: { body: Buffer; etag: string }
    try {
      asset = await load()
    } catch {
      return reply.code(503).send('// Halite widget is not available')
    }

    reply
      .header('Content-Type', 'application/javascript; charset=utf-8')
      .header('Cache-Control', `public, max-age=${MAX_AGE}`)
      // Script tags do not need CORS, but an AI agent or a bundler fetching
      // this does, and the file is public either way.
      .header('Access-Control-Allow-Origin', '*')
      .header('ETag', asset.etag)

    if (request.headers['if-none-match'] === asset.etag) {
      return reply.code(304).send()
    }
    return reply.send(asset.body)
  }

  // The path brands have always been told to use.
  server.get('/widget.js', serve)
  // Alternate spelling, so a snippet copied from the built filename still works.
  server.get('/halite-widget.js', serve)
}
