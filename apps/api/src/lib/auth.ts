import type { FastifyRequest, FastifyReply } from 'fastify'
import { ApiError } from './errors.js'

export type JwtPayload =
  | { role: 'halite_admin'; adminId: string }
  | { role: 'brand_admin'; adminId: string; brandId: string }
  | { role: 'end_user'; userId: string; brandId: string }

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
    // Ensure the admin belongs to the brand in the URL param
    const brandId = (request.params as Record<string, string>)['brandId']
    if (brandId && payload.brandId !== brandId) throw new ApiError(403, 'Forbidden')
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

// Fastify type augmentation
declare module 'fastify' {
  interface FastifyRequest {
    haliteAdmin?: Extract<JwtPayload, { role: 'halite_admin' }>
    brandAdmin?: Extract<JwtPayload, { role: 'brand_admin' }>
    endUser?: Extract<JwtPayload, { role: 'end_user' }>
  }
}
