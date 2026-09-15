import type { FastifyRequest } from 'fastify'
import { prisma } from '@halite/db'
import type { BeautyArea } from '@halite/db'
import { ApiError } from './errors.js'

export interface ConnectBrand {
  id: string
  name: string
  slug: string
  focusAreas: BeautyArea[]
  logoUrl: string | null
  primaryColor: string | null
}

/**
 * Resolves the partner brand behind a Connect request.
 *
 * The key travels in `Authorization: Bearer <key>` for server-to-server
 * calls; the browser SDK sends it in the body instead, because a public
 * key in a header reads as a secret to people who copy-paste snippets.
 */
export async function requireBrandKey(request: FastifyRequest): Promise<ConnectBrand> {
  const header = request.headers.authorization
  const fromHeader = header?.startsWith('Bearer ') ? header.slice(7).trim() : null
  const body = request.body as Record<string, unknown> | undefined
  const fromBody = typeof body?.apiKey === 'string' ? body.apiKey : null
  const apiKey = fromHeader || fromBody

  if (!apiKey) throw new ApiError(401, 'Missing API key')

  const brand = await prisma.brand.findUnique({
    where: { apiKey },
    select: {
      id: true, name: true, slug: true, active: true,
      focusAreas: true, logoUrl: true, primaryColor: true,
    },
  })
  if (!brand || !brand.active) throw new ApiError(401, 'Invalid API key')

  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    focusAreas: brand.focusAreas,
    logoUrl: brand.logoUrl,
    primaryColor: brand.primaryColor,
  }
}

/**
 * The categories a brand may ever ask a consumer for.
 *
 * A brand's focus areas are chosen at signup and are the only thing that
 * widens its reach — a brand cannot request a category it does not sell,
 * and cannot widen an existing grant without the consumer re-consenting.
 */
export function requestableCategories(brand: ConnectBrand): BeautyArea[] {
  return brand.focusAreas
}

/** Categories a live grant actually authorizes, intersected with the brand's current areas. */
export function authorizedCategories(
  brand: ConnectBrand,
  granted: BeautyArea[],
): BeautyArea[] {
  const areas = new Set(brand.focusAreas)
  return granted.filter(c => areas.has(c))
}
