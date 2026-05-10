import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { ApiError } from '../lib/errors.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function authRoutes(server: FastifyInstance) {
  // Halite admin login
  server.post('/halite-admin/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)

    const admin = await prisma.haliteAdmin.findUnique({ where: { email } })
    if (!admin) throw new ApiError(401, 'Invalid credentials')

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) throw new ApiError(401, 'Invalid credentials')

    const token = server.jwt.sign({ role: 'halite_admin', adminId: admin.id })
    return reply.send({ token, admin: { id: admin.id, email: admin.email, name: admin.name } })
  })

  // Brand admin login
  server.post('/brand-admin/login', async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body)

    const admin = await prisma.brandAdmin.findUnique({
      where: { email },
      include: { brand: { select: { id: true, slug: true, name: true, active: true } } },
    })
    if (!admin) throw new ApiError(401, 'Invalid credentials')
    if (!admin.brand.active) throw new ApiError(403, 'Brand account is inactive')

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) throw new ApiError(401, 'Invalid credentials')

    const token = server.jwt.sign({
      role: 'brand_admin',
      adminId: admin.id,
      brandId: admin.brandId,
    })
    return reply.send({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      brand: admin.brand,
    })
  })

  // Issue an end-user token via brand API key (used by embedded widget / Shopify storefront)
  server.post('/end-user/token', async (request, reply) => {
    const schema = z.object({
      apiKey: z.string(),
      externalId: z.string().optional(),
      email: z.string().email().optional(),
    })
    const { apiKey, externalId, email } = schema.parse(request.body)

    const brand = await prisma.brand.findUnique({ where: { apiKey } })
    if (!brand || !brand.active) throw new ApiError(401, 'Invalid API key')

    // Upsert end user
    const endUser = await prisma.endUser.upsert({
      where: {
        brandId_externalId: {
          brandId: brand.id,
          externalId: externalId ?? `anon-${Date.now()}`,
        },
      },
      update: { email: email ?? undefined },
      create: {
        brandId: brand.id,
        externalId: externalId ?? `anon-${Date.now()}`,
        email,
      },
    })

    const token = server.jwt.sign(
      { role: 'end_user', userId: endUser.id, brandId: brand.id },
      { expiresIn: '30d' }
    )
    return reply.send({ token, userId: endUser.id })
  })
}
