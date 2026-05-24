import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@halite/db'
import { ApiError } from './errors.js'

export type JwtPayload =
  | { role: 'halite_admin'; adminId: string }
  | { role: 'brand_admin'; adminId: string; brandId: string }
  | { role: 'end_user'; userId: string; brandId: string }
  | { role: 'consumer'; consumerId: string }

export async function requireHaliteAdmin(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = (await request.jwtVerify()) as JwtPayload
    if (payload.role !== 'halite_admin') throw new ApiError(403, 'Forbidden')
    request.haliteAdmin = payload
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(401, 'Unauthorized')
  }
}

export async function requireBrandAdmin(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = (await request.jwtVerify()) as JwtPayload
    if (payload.role !== 'brand_admin') throw new ApiError(403, 'Forbidden')
    const brandId = (request.params as Record<string, string>)['brandId']
    if (brandId && payload.brandId !== brandId) throw new ApiError(403, 'Forbidden')

    // For demo brands: block login if access window has expired
    const brand = await prisma.brand.findUnique({
      where: { id: payload.brandId },
      select: { isDemo: true, demoLinkExpiresAt: true },
    })
    if (brand?.isDemo && brand.demoLinkExpiresAt && brand.demoLinkExpiresAt < new Date()) {
      throw new ApiError(401, 'Demo access has expired. Contact your Halite representative to reactivate.')
    }

    request.brandAdmin = payload
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(401, 'Unauthorized')
  }
}

export async function requireEndUser(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = (await request.jwtVerify()) as JwtPayload
    if (payload.role !== 'end_user') throw new ApiError(403, 'Forbidden')
    const brandId = (request.params as Record<string, string>)['brandId']
    if (brandId && payload.brandId !== brandId) throw new ApiError(403, 'Forbidden')
    request.endUser = payload
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(401, 'Unauthorized')
  }
}

export async function requireConsumer(request: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = (await request.jwtVerify()) as JwtPayload
    if (payload.role !== 'consumer') throw new ApiError(403, 'Forbidden')
    request.consumer = payload
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(401, 'Unauthorized')
  }
}

// Fastify type augmentation
declare module 'fastify' {
  interface FastifyRequest {
    haliteAdmin?: Extract<JwtPayload, { role: 'halite_admin' }>
    brandAdmin?: Extract<JwtPayload, { role: 'brand_admin' }>
    endUser?: Extract<JwtPayload, { role: 'end_user' }>
    consumer?: Extract<JwtPayload, { role: 'consumer' }>
  }
}
