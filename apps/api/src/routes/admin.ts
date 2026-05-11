import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Resend } from 'resend'
import { prisma, InvoiceStatus } from '@halite/db'
import { requireHaliteAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'

export async function adminRoutes(server: FastifyInstance) {
  // ── Platform-wide stats ───────────────────────────────────────────
  server.get(
    '/admin/stats',
    { preHandler: requireHaliteAdmin },
    async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [brands, users, checkIns, routines] = await Promise.all([
        prisma.brand.count({ where: { active: true } }),
        prisma.endUser.count(),
        prisma.checkIn.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.routine.count(),
      ])

      return { brands, users, checkIns, routines }
    }
  )

  // ── Brand summary for admin ───────────────────────────────────────
  server.get(
    '/admin/brands/:brandId/summary',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const [brand, checkIns30d] = await Promise.all([
        prisma.brand.findUnique({
          where: { id: brandId },
          include: {
            admins: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
            _count: { select: { endUsers: true, products: true, quizSessions: true } },
          },
        }),
        prisma.checkIn.count({
          where: { endUser: { brandId }, createdAt: { gte: thirtyDaysAgo } },
        }),
      ])

      if (!brand) throw new ApiError(404, 'Brand not found')
      const { shopifyToken, shopifyWebhookSecret, apiKey, ...safe } = brand
      return { brand: { ...safe, checkIns30d } }
    }
  )

  // ── Simplified analytics for admin view ───────────────────────────
  server.get(
    '/admin/brands/:brandId/analytics',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const [skinTypes, topProducts, totalCheckIns] = await Promise.all([
        prisma.userBeautyProfile.groupBy({
          by: ['skinType'],
          where: { endUser: { brandId }, skinType: { not: null } },
          _count: { skinType: true },
          orderBy: { _count: { skinType: 'desc' } },
        }),
        prisma.product.findMany({
          where: { brandId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, category: true, price: true, inStock: true },
        }),
        prisma.checkIn.count({ where: { endUser: { brandId } } }),
      ])

      return { skinTypes, topProducts, totalCheckIns }
    }
  )

  // ── Invoices: list ────────────────────────────────────────────────
  server.get(
    '/admin/brands/:brandId/invoices',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const invoices = await prisma.invoice.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
      })
      return { invoices }
    }
  )

  // ── Invoices: create ──────────────────────────────────────────────
  server.post(
    '/admin/brands/:brandId/invoices',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        amount: z.number().positive(),
        currency: z.string().default('USD'),
        status: z.nativeEnum(InvoiceStatus).default('DRAFT'),
        period: z.string().min(1),
        dueDate: z.string().datetime(),
        notes: z.string().optional(),
      })
      const data = schema.parse(request.body)
      const invoice = await prisma.invoice.create({
        data: {
          brandId,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          period: data.period,
          dueDate: new Date(data.dueDate),
          notes: data.notes ?? null,
        },
      })
      return reply.status(201).send({ invoice })
    }
  )

  // ── Invoices: update ──────────────────────────────────────────────
  server.patch(
    '/admin/brands/:brandId/invoices/:invoiceId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId, invoiceId } = request.params as { brandId: string; invoiceId: string }
      const schema = z.object({
        status: z.nativeEnum(InvoiceStatus).optional(),
        notes: z.string().nullable().optional(),
        dueDate: z.string().datetime().optional(),
      })
      const parsed = schema.parse(request.body)

      const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, brandId } })
      if (!existing) throw new ApiError(404, 'Invoice not found')

      const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(parsed.status !== undefined ? { status: parsed.status } : {}),
          ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
          ...(parsed.dueDate !== undefined ? { dueDate: new Date(parsed.dueDate) } : {}),
        },
      })
      return { invoice }
    }
  )

  // ── Invoices: delete ──────────────────────────────────────────────
  server.delete(
    '/admin/brands/:brandId/invoices/:invoiceId',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { brandId, invoiceId } = request.params as { brandId: string; invoiceId: string }
      const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, brandId } })
      if (!existing) throw new ApiError(404, 'Invoice not found')
      await prisma.invoice.delete({ where: { id: invoiceId } })
      return reply.status(204).send()
    }
  )

  // ── Email notification to brand owners ───────────────────────────
  server.post(
    '/admin/brands/:brandId/notify',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        subject: z.string().min(1),
        body: z.string().min(1),
      })
      const { subject, body } = schema.parse(request.body)

      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: { admins: { where: { role: 'OWNER' }, select: { email: true, name: true } } },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      if (!brand.admins.length) throw new ApiError(400, 'Brand has no owner admins')
      if (!process.env.RESEND_API_KEY) throw new ApiError(503, 'Email service not configured')

      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Halite Intelligence <onboarding@resend.dev>',
        to: brand.admins.map(a => a.email),
        subject,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#9c8878;margin-bottom:8px;">Halite Intelligence</p>
            <h2 style="font-size:22px;color:#1c1410;margin:0 0 24px;">${subject}</h2>
            <div style="font-size:14px;color:#6b4f3a;line-height:1.6;white-space:pre-wrap;">${body}</div>
            <hr style="border:none;border-top:1px solid #e8ddd3;margin:32px 0;"/>
            <p style="font-size:12px;color:#9c8878;">Sent by Halite Intelligence to ${brand.name}.</p>
          </div>`,
      })

      return { sent: true, recipients: brand.admins.length }
    }
  )
}
