import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { ApiError } from '../lib/errors.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const strongPasswordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

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

    // Fire-and-forget login event
    prisma.loginEvent.create({
      data: {
        brandId: admin.brandId,
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        ip: (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip ?? null,
        method: 'LOGIN',
      },
    }).catch(() => {})

    return reply.send({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      brand: admin.brand,
    })
  })

  // Brand admin registration (self-service account creation)
  server.post('/brand-admin/register', async (request, reply) => {
    const schema = z.object({
      slug: z.string().min(1),
      email: z.string().email(),
      name: z.string().min(1).max(100),
      password: strongPasswordSchema,
    })
    const data = schema.parse(request.body)

    const brand = await prisma.brand.findUnique({
      where: { slug: data.slug },
      select: { id: true, slug: true, name: true, active: true, _count: { select: { admins: true } } },
    })
    if (!brand) throw new ApiError(404, 'Brand not found')
    if (!brand.active) throw new ApiError(403, 'Brand account is inactive')

    const existing = await prisma.brandAdmin.findFirst({
      where: { brandId: brand.id, email: data.email },
    })
    if (existing) throw new ApiError(409, 'An account with this email already exists for this brand')

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const role = brand._count.admins === 0 ? 'OWNER' : 'MEMBER'

    const admin = await prisma.brandAdmin.create({
      data: { brandId: brand.id, email: data.email, name: data.name, password: hashedPassword, role: role as any },
      select: { id: true, email: true, name: true, role: true },
    })

    const token = server.jwt.sign({
      role: 'brand_admin',
      adminId: admin.id,
      brandId: brand.id,
    })

    prisma.loginEvent.create({
      data: {
        brandId: brand.id,
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        ip: (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip ?? null,
        method: 'REGISTER',
      },
    }).catch(() => {})

    return reply.status(201).send({
      token,
      admin,
      brand: { id: brand.id, slug: brand.slug, name: brand.name },
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

    const brand = await prisma.brand.findUnique({
      where: { apiKey },
      select: { id: true, active: true, isDemo: true, shopifyShop: true },
    })
    if (!brand || !brand.active) throw new ApiError(401, 'Invalid API key')

    // Upsert end user
    const endUser = await prisma.endUser.upsert({
      where: {
        brandId_externalId: {
          brandId: brand.id,
          externalId: externalId ?? `anon-${Date.now()}`,
        },
      },
      update: { email: email ?? null },
      create: {
        brandId: brand.id,
        externalId: externalId ?? `anon-${Date.now()}`,
        email: email ?? null,
      },
    })

    const token = server.jwt.sign(
      { role: 'end_user', userId: endUser.id, brandId: brand.id },
      { expiresIn: '30d' }
    )
    return reply.send({
      token,
      userId: endUser.id,
      isDemo: brand.isDemo,
      shopifyShop: brand.shopifyShop ?? null,
    })
  })
}
