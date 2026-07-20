import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import { prisma, InvoiceStatus } from '@halite/db'
import { requireHaliteAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'
import { parsePurchaseHistory } from '../lib/purchase-history-processor.js'
import { uploadToS3 } from '../lib/storage.js'
import { provisionDemoEnvironment } from '../lib/demo-generator.js'
import { scrapeTheme } from '../lib/theme-scraper.js'

// CheckInProduct.productId and RoutineStep.productId have no onDelete: Cascade,
// so we must clear them manually before deleting a brand or its products.
// After deletion, orphaned Consumer records (no remaining EndUsers) are also pruned.
async function deleteBrandSafe(brandId: string) {
  const productIds = (await prisma.product.findMany({ where: { brandId }, select: { id: true } })).map(p => p.id)
  await prisma.$transaction(async (tx) => {
    if (productIds.length > 0) {
      await tx.checkInProduct.deleteMany({ where: { productId: { in: productIds } } })
      await tx.routineStep.deleteMany({ where: { productId: { in: productIds } } })
    }
    await tx.brand.delete({ where: { id: brandId } })
    // Remove Consumer records that now have no EndUsers at any brand
    await tx.consumer.deleteMany({ where: { endUsers: { none: {} } } })
  })
}

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
        from: 'Halite Intelligence <info@haliteintelligence.com>',
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

  // ── Demo environments ─────────────────────────────────────────────

  // Create a new demo — multipart: all files optional, AI generates any not provided
  server.post(
    '/admin/demos',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const adminId = (request as any).haliteAdmin!.adminId

      const parts = request.parts()
      let prospectName = ''
      let focusAreas: string[] = []
      let consumerCount = 200
      let productCount = 20
      let historyMonths = 12
      let brandWebsiteUrl = ''
      let catalogBuffer: Buffer | null = null
      let catalogMime = 'text/csv'
      let catalogFilename = 'catalog.csv'
      let purchaseBuffer: Buffer | null = null
      let purchaseMime = 'text/csv'
      let purchaseFilename = 'purchase-history.csv'
      let customerProfileBuffer: Buffer | null = null
      let customerProfileMime = 'text/csv'
      let customerProfileFilename = 'customer-profiles.xlsx'
      let quizBuffer: Buffer | null = null
      let quizMime = 'text/csv'
      let quizFilename = 'quiz-results.xlsx'

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'prospectName') prospectName = String(part.value)
          if (part.fieldname === 'brandWebsiteUrl') brandWebsiteUrl = String(part.value)
          if (part.fieldname === 'focusAreas') {
            try { focusAreas = JSON.parse(String(part.value)) } catch { focusAreas = [String(part.value)] }
          }
          if (part.fieldname === 'consumerCount') consumerCount = Math.min(1000, Math.max(50, parseInt(String(part.value)) || 200))
          if (part.fieldname === 'productCount') productCount = Math.min(100, Math.max(1, parseInt(String(part.value)) || 20))
          if (part.fieldname === 'historyMonths') historyMonths = Math.min(60, Math.max(0, parseInt(String(part.value)) || 12))
        } else {
          const buf = await part.toBuffer()
          if (part.fieldname === 'catalogFile') {
            catalogBuffer = buf
            catalogMime = part.mimetype
            catalogFilename = (part as any).filename ?? 'catalog.csv'
          } else if (part.fieldname === 'purchaseFile') {
            purchaseBuffer = buf
            purchaseMime = part.mimetype
            purchaseFilename = (part as any).filename ?? 'purchase-history.csv'
          } else if (part.fieldname === 'customerProfileFile') {
            customerProfileBuffer = buf
            customerProfileMime = part.mimetype
            customerProfileFilename = (part as any).filename ?? 'customer-profiles.xlsx'
          } else if (part.fieldname === 'quizFile') {
            quizBuffer = buf
            quizMime = part.mimetype
            quizFilename = (part as any).filename ?? 'quiz-results.xlsx'
          }
        }
      }

      if (!prospectName) throw new ApiError(400, 'prospectName is required')

      // focusAreas from the form are analytical labels ('Routine Outcomes' etc.)
      // Brand.focusAreas is a BeautyArea enum — filter to valid values only
      const VALID_BEAUTY_AREAS = ['SKINCARE','BODY','HAIR','MAKEUP','FRAGRANCE','NAILS','WELLNESS','SUN_CARE','LIP_CARE','EYE_CARE']
      const brandFocusAreas = focusAreas.filter(a => VALID_BEAUTY_AREAS.includes(a))
      if (brandFocusAreas.length === 0) brandFocusAreas.push('SKINCARE')

      // Parse purchase history if provided
      let purchaseMatrix
      if (purchaseBuffer) {
        try { purchaseMatrix = await parsePurchaseHistory(purchaseBuffer, purchaseMime) }
        catch { /* non-blocking — proceed without purchase data */ }
      }

      // Create brand stub immediately
      const baseSlug = `${prospectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-demo`
      let slug = baseSlug
      let slugSuffix = 2
      while (await prisma.brand.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${slugSuffix++}`
      }

      const brand = await prisma.brand.create({
        data: {
          name: prospectName,
          slug,
          isDemo: true,
          demoProspectName: prospectName,
          demoCreatedBy: adminId,
          // demoLinkExpiresAt intentionally left null — set after provisioning completes
          // so the demo shows as "generating" until data is ready
          focusAreas: brandFocusAreas as any,
          primaryColor: '#C17A47',
          active: true,
          ...(brandWebsiteUrl ? { brandWebsiteUrl } : {}),
        },
      })

      // Ingest catalog synchronously if provided (fast — just DB writes)
      if (catalogBuffer) {
        const ext = catalogFilename.split('.').pop()?.toLowerCase()
        const catalogFormat: 'XLSX' | 'JSON' | 'CSV' = ext === 'xlsx' || ext === 'xls' ? 'XLSX' : ext === 'json' ? 'JSON' : 'CSV'
        const upload = await prisma.catalogUpload.create({
          data: { brandId: brand.id, fileName: catalogFilename, fileUrl: '', format: catalogFormat, status: 'PROCESSING' },
        })
        await processCatalogUpload(upload.id, brand.id, catalogBuffer, catalogFormat)
      }

      // Persist the original purchase file to S3 and create a USER_UPLOADED record
      if (purchaseBuffer && purchaseMatrix) {
        try {
          const purchaseExt = purchaseFilename.split('.').pop()?.toLowerCase()
          const purchaseFormat = purchaseExt === 'xlsx' || purchaseExt === 'xls' ? 'XLSX' : 'CSV'
          const rowCount = Object.values(purchaseMatrix).reduce((sum, p) => sum + Object.keys(p).length, 0)
          const s3Key = `catalogs/${brand.id}/${Date.now()}-${purchaseFilename}`
          const fileUrl = await uploadToS3(s3Key, purchaseBuffer, purchaseMime)
          await prisma.catalogUpload.create({
            data: {
              brandId: brand.id,
              fileName: purchaseFilename,
              fileUrl,
              format: purchaseFormat as any,
              source: 'USER_UPLOADED',
              status: 'DONE',
              rowCount,
            },
          })
        } catch (err) {
          console.error('Failed to persist purchase history file:', err)
        }
      }

      // Persist customer profile file to S3 if provided
      if (customerProfileBuffer) {
        try {
          const ext = customerProfileFilename.split('.').pop()?.toLowerCase()
          const fmt = ext === 'xlsx' || ext === 'xls' ? 'XLSX' : 'CSV'
          const s3Key = `catalogs/${brand.id}/${Date.now()}-${customerProfileFilename}`
          const fileUrl = await uploadToS3(s3Key, customerProfileBuffer, customerProfileMime)
          await prisma.catalogUpload.create({
            data: { brandId: brand.id, fileName: customerProfileFilename, fileUrl, format: fmt as any, source: 'USER_UPLOADED', status: 'DONE', rowCount: null },
          })
        } catch (err) {
          console.error('Failed to persist customer profile file:', err)
        }
      }

      // Persist quiz results file to S3 if provided
      if (quizBuffer) {
        try {
          const ext = quizFilename.split('.').pop()?.toLowerCase()
          const fmt = ext === 'xlsx' || ext === 'xls' ? 'XLSX' : 'CSV'
          const s3Key = `catalogs/${brand.id}/${Date.now()}-${quizFilename}`
          const fileUrl = await uploadToS3(s3Key, quizBuffer, quizMime)
          await prisma.catalogUpload.create({
            data: { brandId: brand.id, fileName: quizFilename, fileUrl, format: fmt as any, source: 'USER_UPLOADED', status: 'DONE', rowCount: null },
          })
        } catch (err) {
          console.error('Failed to persist quiz results file:', err)
        }
      }

      // Kick off the rest of provisioning async (routines take time)
      ;(async () => {
        try {
          await provisionDemoEnvironment({
            prospectName,
            createdByAdminId: adminId,
            focusAreas: brandFocusAreas,
            consumerCount,
            productCount,
            historyMonths,
            purchaseMatrix,
            hasCatalog: !!catalogBuffer,
            hasCustomerProfiles: !!customerProfileBuffer,
            hasQuizResults: !!quizBuffer,
            existingBrandId: brand.id,
          })
          // Set demoLinkExpiresAt now that provisioning is complete — this is what
          // flips the demo status from "generating" to "active" in the admin UI
          await prisma.brand.update({
            where: { id: brand.id },
            data: { active: true, demoLinkExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
          })
        } catch (err) {
          console.error('Demo provisioning failed:', err)
        }
      })()

      return reply.status(202).send({
        demoId: brand.id,
        slug,
        status: 'generating',
        message: 'Demo environment is being provisioned. Poll GET /admin/demos/:demoId for status.',
      })
    }
  )

  // List all demos
  server.get(
    '/admin/demos',
    { preHandler: requireHaliteAdmin },
    async () => {
      const demos = await prisma.brand.findMany({
        where: { OR: [{ isDemo: true }, { isDemo: false, demoProspectName: { not: null } }] },
        include: {
          _count: { select: { products: true, endUsers: true } },
          admins: { select: { email: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      })

      return {
        demos: demos.map(d => ({
          id: d.id,
          slug: d.slug,
          prospectName: d.demoProspectName,
          converted: !d.isDemo,
          plan: d.plan,
          status: d.isDemo ? demoBrandStatus(d) : ('converted' as const),
          active: d.active,
          loginUrl: `${process.env.DASHBOARD_URL ?? 'https://portal.haliteintelligence.com'}/${d.slug}/login`,
          email: d.admins[0]?.email ?? null,
          password: `demo-${d.slug}`,
          demoLinkExpiresAt: d.demoLinkExpiresAt,
          focusAreas: d.focusAreas,
          productCount: d._count.products,
          consumerCount: d._count.endUsers,
          createdAt: d.createdAt,
        })),
      }
    }
  )

  // Demo detail
  server.get(
    '/admin/demos/:demoId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { demoId } = request.params as { demoId: string }
      const brand = await prisma.brand.findFirst({
        where: { id: demoId, demoProspectName: { not: null } },
        include: {
          admins: { select: { email: true }, take: 1 },
          _count: { select: { products: true, endUsers: true, quizSessions: true } },
        },
      })
      if (!brand) throw new ApiError(404, 'Demo not found')

      const [routineCount, checkInCount, workflowCount] = await Promise.all([
        prisma.routine.count({ where: { endUser: { brandId: brand.id } } }),
        prisma.checkIn.count({ where: { endUser: { brandId: brand.id } } }),
        prisma.agentWorkflow.count({ where: { brandId: brand.id } }),
      ])

      return {
        demo: {
          id: brand.id,
          slug: brand.slug,
          prospectName: brand.demoProspectName,
          converted: !brand.isDemo,
          status: brand.isDemo ? demoBrandStatus(brand) : ('converted' as const),
          active: brand.active,
          loginUrl: `${process.env.DASHBOARD_URL ?? 'https://portal.haliteintelligence.com'}/${brand.slug}/login`,
          email: brand.admins[0]?.email ?? null,
          password: `demo-${brand.slug}`,
          demoLinkExpiresAt: brand.demoLinkExpiresAt,
          focusAreas: brand.focusAreas,
          name: brand.name,
          createdAt: brand.createdAt,
          whiteLabelEnabled: brand.whiteLabelEnabled,
          brandWebsiteUrl: brand.brandWebsiteUrl,
          brandThemeConfig: brand.brandThemeConfig,
          stats: {
            products: brand._count.products,
            consumers: brand._count.endUsers,
            routines: routineCount,
            checkIns: checkInCount,
            workflows: workflowCount,
          },
        },
      }
    }
  )

  // ── Convert demo to paying brand ──────────────────────────────────
  server.post(
    '/admin/demos/:demoId/convert',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { demoId } = request.params as { demoId: string }
      const schema = z.object({
        plan: z.enum(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']),
        name: z.string().min(1).optional(),
        adminEmail: z.string().email(),
        adminName: z.string().min(1),
        adminPhone: z.string().optional(),
        adminPassword: z.string().min(8),
      })
      const data = schema.parse(request.body)

      const demo = await prisma.brand.findFirst({ where: { id: demoId, isDemo: true } })
      if (!demo) throw new ApiError(404, 'Demo not found or already converted')

      // Deactivate the demo (keep all data)
      await prisma.brand.update({ where: { id: demoId }, data: { active: false } })

      // Derive new slug by stripping -demo suffix
      const newBaseSlug = demo.slug.replace(/-demo(-\d+)?$/, '') || demo.slug
      let newSlug = newBaseSlug
      let suffix = 2
      while (await prisma.brand.findUnique({ where: { slug: newSlug } })) {
        newSlug = `${newBaseSlug}-${suffix++}`
      }

      const hashedPassword = await bcrypt.hash(data.adminPassword, 12)

      const brand = await prisma.brand.create({
        data: {
          name: data.name ?? demo.name,
          slug: newSlug,
          plan: data.plan as any,
          focusAreas: demo.focusAreas,
          brandWebsiteUrl: demo.brandWebsiteUrl,
          isDemo: false,
          active: true,
          admins: {
            create: {
              email: data.adminEmail,
              name: data.adminName,
              ...(data.adminPhone ? { phone: data.adminPhone } : {}),
              password: hashedPassword,
              role: 'OWNER',
            },
          },
        },
      })

      return reply.status(201).send({ brandId: brand.id, slug: newSlug })
    }
  )

  // Extend access window (accepts optional days param, 1–30, default 15)
  server.post(
    '/admin/demos/:demoId/access',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { demoId } = request.params as { demoId: string }
      const { days } = z.object({ days: z.number().int().min(1).max(30).default(15) }).parse(request.body ?? {})
      const brand = await prisma.brand.findFirst({ where: { id: demoId, isDemo: true } })
      if (!brand) throw new ApiError(404, 'Demo not found')

      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      await prisma.brand.update({ where: { id: demoId }, data: { demoLinkExpiresAt: newExpiry } })

      return { demoLinkExpiresAt: newExpiry, message: `Access extended by ${days} days` }
    }
  )

  // Impersonate a brand admin (admin enter brand dashboard without login)
  server.post(
    '/admin/brands/:brandId/impersonate',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: { id: true, slug: true, admins: { select: { id: true }, take: 1 } },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      const admin = brand.admins[0]
      if (!admin) throw new ApiError(400, 'Brand has no admins to impersonate')

      const token = server.jwt.sign(
        { role: 'brand_admin', adminId: admin.id, brandId: brand.id },
        { expiresIn: '24h' }
      )

      // Fetch admin details for the event log
      const adminDetails = await prisma.brandAdmin.findUnique({
        where: { id: admin.id },
        select: { email: true, name: true },
      })
      if (adminDetails) {
        const haliteAdminJwt = request.user as { adminId: string }
        const haliteAdmin = await prisma.haliteAdmin.findUnique({
          where: { id: haliteAdminJwt.adminId },
          select: { name: true, email: true },
        })
        prisma.loginEvent.create({
          data: {
            brandId: brand.id,
            adminId: admin.id,
            adminEmail: adminDetails.email,
            adminName: `[Halite: ${haliteAdmin?.name ?? 'Admin'}] → ${adminDetails.name}`,
            ip: (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip ?? null,
            method: 'IMPERSONATE',
          },
        }).catch(() => {})
      }

      return { token, slug: brand.slug }
    }
  )

  // ── Login events (audit log) ────────────────────────────────────
  server.get(
    '/admin/brands/:brandId/login-events',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const events = await prisma.loginEvent.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          adminEmail: true,
          adminName: true,
          ip: true,
          method: true,
          createdAt: true,
        },
      })
      return { events }
    }
  )

  // Get credentials
  server.get(
    '/admin/demos/:demoId/credentials',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { demoId } = request.params as { demoId: string }
      const brand = await prisma.brand.findFirst({
        where: { id: demoId, isDemo: true },
        include: { admins: { select: { email: true }, take: 1 } },
      })
      if (!brand) throw new ApiError(404, 'Demo not found')

      return {
        loginUrl: `${process.env.DASHBOARD_URL ?? 'https://portal.haliteintelligence.com'}/${brand.slug}/login`,
        email: brand.admins[0]?.email ?? `admin@${brand.slug}.halite`,
        password: `demo-${brand.slug}`,
        demoLinkExpiresAt: brand.demoLinkExpiresAt,
        status: demoBrandStatus(brand),
      }
    }
  )

  // Backfill AI-generated catalog upload records for a demo
  server.post(
    '/admin/demos/:demoId/seed-uploads',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { demoId } = request.params as { demoId: string }
      const brand = await prisma.brand.findFirst({ where: { id: demoId, demoProspectName: { not: null } } })
      if (!brand) throw new ApiError(404, 'Demo not found')

      const existing = await prisma.catalogUpload.findMany({
        where: { brandId: demoId, source: 'AI_GENERATED' },
        select: { id: true },
      })
      if (existing.length > 0) return { seeded: false, message: 'AI-generated uploads already exist' }

      const [productCount, consumerCount, checkInCount, routineCount] = await Promise.all([
        prisma.product.count({ where: { brandId: demoId } }),
        prisma.endUser.count({ where: { brandId: demoId } }),
        prisma.checkIn.count({ where: { endUser: { brandId: demoId } } }),
        prisma.routine.count({ where: { endUser: { brandId: demoId }, activeTo: null } }),
      ])

      const purchaseRowCount = Math.round(routineCount * 0.6)

      await prisma.catalogUpload.createMany({
        data: [
          { brandId: demoId, fileName: 'Synthetic Product Catalog.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: productCount },
          { brandId: demoId, fileName: 'Synthetic Customer Profiles.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: consumerCount },
          { brandId: demoId, fileName: 'Synthetic Quiz Results.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: consumerCount },
          { brandId: demoId, fileName: 'Synthetic Check-in History.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: checkInCount },
          { brandId: demoId, fileName: 'Synthetic Purchase History.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: purchaseRowCount, errorLog: { historyMonths: 6 } },
          { brandId: demoId, fileName: 'Synthetic Routine Assignments.xlsx', fileUrl: '', format: 'XLSX', source: 'AI_GENERATED', status: 'DONE', rowCount: routineCount },
        ] as any,
      })

      return { seeded: true, productCount, consumerCount, checkInCount, purchaseRowCount, routineCount }
    }
  )

  // Delete demo (hard delete — cascades all data)
  server.delete(
    '/admin/demos/:demoId',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { demoId } = request.params as { demoId: string }
      const brand = await prisma.brand.findFirst({ where: { id: demoId, demoProspectName: { not: null } } })
      if (!brand) throw new ApiError(404, 'Demo not found')
      await deleteBrandSafe(demoId)
      return reply.status(204).send()
    }
  )

  // Regenerate synthetic data (keeps products, replaces consumers/check-ins)
  server.post(
    '/admin/demos/:demoId/regenerate',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { demoId } = request.params as { demoId: string }
      const body = z.object({ consumerCount: z.number().min(50).max(1000).default(200) }).parse(request.body ?? {})
      const brand = await prisma.brand.findFirst({
        where: { id: demoId, isDemo: true },
        select: { id: true, demoProspectName: true, demoCreatedBy: true, focusAreas: true },
      })
      if (!brand) throw new ApiError(404, 'Demo not found')

      // Delete existing consumers/check-ins but keep products
      await prisma.endUser.deleteMany({ where: { brandId: brand.id } })
      await prisma.agentWorkflow.deleteMany({ where: { brandId: brand.id } })

      ;(async () => {
        try {
          await provisionDemoEnvironment({
            prospectName: brand.demoProspectName ?? 'Demo',
            createdByAdminId: brand.demoCreatedBy ?? '',
            focusAreas: brand.focusAreas as string[],
            consumerCount: body.consumerCount,
            existingBrandId: brand.id,
          })
        } catch (err) { console.error('Regeneration failed:', err) }
      })()

      return reply.status(202).send({ message: 'Regeneration started' })
    }
  )

  // ── List paying brands (non-demo) ─────────────────────────────────
  server.get(
    '/admin/brands',
    { preHandler: requireHaliteAdmin },
    async () => {
      const brands = await prisma.brand.findMany({
        where: { isDemo: false },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          active: true,
          createdAt: true,
          demoProspectName: true,
          _count: { select: { endUsers: true, products: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return { brands }
    }
  )

  // ── Get brand detail ───────────────────────────────────────────────
  server.get(
    '/admin/brands/:brandId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          admins: { select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true } },
          _count: { select: { endUsers: true, products: true } },
        },
      })
      if (!brand) throw new ApiError(404, 'Brand not found')
      const { shopifyToken, shopifyWebhookSecret, ...safe } = brand
      return { brand: safe }
    }
  )

  // ── Delete brand ───────────────────────────────────────────────────
  server.delete(
    '/admin/brands/:brandId',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')
      await deleteBrandSafe(brandId)
      return reply.status(204).send()
    }
  )

  // ── Create brand + first admin ─────────────────────────────────────
  server.post(
    '/admin/brands',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
        plan: z.enum(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']).default('STARTER'),
        focusAreas: z.array(z.string()).default([]),
        brandWebsiteUrl: z.preprocess(v => v === '' ? null : v, z.string().url().optional().nullable()),
        adminEmail: z.string().email(),
        adminName: z.string().min(1),
        adminPhone: z.string().optional(),
        adminPassword: z.string().min(8),
      })
      const data = schema.parse(request.body)

      const existing = await prisma.brand.findUnique({ where: { slug: data.slug } })
      if (existing) throw new ApiError(409, `Slug "${data.slug}" is already taken`)

      const hashedPassword = await bcrypt.hash(data.adminPassword, 12)

      const brand = await prisma.brand.create({
        data: {
          name: data.name,
          slug: data.slug,
          plan: data.plan as any,
          focusAreas: data.focusAreas as any,
          active: true,
          ...(data.brandWebsiteUrl ? { brandWebsiteUrl: data.brandWebsiteUrl } : {}),
          admins: {
            create: {
              email: data.adminEmail,
              name: data.adminName,
              ...(data.adminPhone ? { phone: data.adminPhone } : {}),
              password: hashedPassword,
              role: 'OWNER',
            },
          },
        },
        include: {
          admins: { select: { id: true, email: true, name: true, role: true } },
        },
      })

      return reply.status(201).send({ brand })
    }
  )

  // ── Update brand ───────────────────────────────────────────────────
  server.patch(
    '/admin/brands/:brandId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        plan: z.enum(['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']).optional(),
        active: z.boolean().optional(),
        focusAreas: z.array(z.string()).optional(),
        brandWebsiteUrl: z.preprocess(v => v === '' ? null : v, z.string().url().optional().nullable()),
      })
      const data = schema.parse(request.body)
      const updateData: Record<string, unknown> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.plan !== undefined) updateData.plan = data.plan
      if (data.active !== undefined) updateData.active = data.active
      if (data.focusAreas !== undefined) updateData.focusAreas = data.focusAreas
      if (data.brandWebsiteUrl !== undefined) updateData.brandWebsiteUrl = data.brandWebsiteUrl
      const brand = await prisma.brand.update({ where: { id: brandId }, data: updateData as any })
      return { brand }
    }
  )

  // ── Add brand admin ────────────────────────────────────────────────
  server.post(
    '/admin/brands/:brandId/admins',
    { preHandler: requireHaliteAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        phone: z.string().optional(),
        password: z.string().min(8),
        role: z.enum(['OWNER', 'ADMIN', 'VIEWER']).default('ADMIN'),
      })
      const data = schema.parse(request.body)
      const hashed = await bcrypt.hash(data.password, 12)
      const admin = await prisma.brandAdmin.create({
        data: { brandId, email: data.email, name: data.name, ...(data.phone ? { phone: data.phone } : {}), password: hashed, role: data.role as any },
        select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
      })
      return reply.status(201).send({ admin })
    }
  )

  // ── Reset brand admin password ─────────────────────────────────────
  server.patch(
    '/admin/brands/:brandId/admins/:adminId/password',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId, adminId } = request.params as { brandId: string; adminId: string }
      const { password } = z.object({ password: z.string().min(8) }).parse(request.body)
      const existing = await prisma.brandAdmin.findFirst({ where: { id: adminId, brandId } })
      if (!existing) throw new ApiError(404, 'Admin not found')
      const hashed = await bcrypt.hash(password, 12)
      await prisma.brandAdmin.update({ where: { id: adminId }, data: { password: hashed } })
      return { ok: true }
    }
  )

  // ── White-label: save config ───────────────────────────────────────
  server.patch(
    '/admin/brands/:brandId/white-label',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        whiteLabelEnabled: z.boolean().optional(),
        brandWebsiteUrl: z.string().url().optional().nullable(),
        brandThemeConfig: z.record(z.unknown()).optional().nullable(),
      })
      const data = schema.parse(request.body)
      const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')
      const updated = await prisma.brand.update({
        where: { id: brandId },
        data: {
          ...(data.whiteLabelEnabled !== undefined ? { whiteLabelEnabled: data.whiteLabelEnabled } : {}),
          ...(data.brandWebsiteUrl !== undefined ? { brandWebsiteUrl: data.brandWebsiteUrl } : {}),
          ...(data.brandThemeConfig !== undefined ? { brandThemeConfig: data.brandThemeConfig as any } : {}),
        },
        select: { whiteLabelEnabled: true, brandWebsiteUrl: true, brandThemeConfig: true },
      })
      return { ok: true, ...updated }
    }
  )

  // ── Consumer list for a brand (admin) ────────────────────────────
  server.get(
    '/admin/brands/:brandId/consumers',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(50),
        search: z.string().optional(),
        skinType: z.string().optional(),
        city: z.string().optional(),
      })
      const { page, limit, search, skinType, city } = schema.parse(request.query)

      const where: Record<string, unknown> = { brandId }
      if (search) {
        where['OR'] = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }
      if (skinType) where['beautyProfile'] = { skinType }
      if (city) where['beautyProfile'] = { ...(where['beautyProfile'] as object ?? {}), city: { contains: city, mode: 'insensitive' } }

      const [consumers, total] = await Promise.all([
        prisma.endUser.findMany({
          where: where as any,
          include: {
            beautyProfile: {
              select: {
                skinType: true, ageRange: true, city: true, country: true,
                monkSkinTone: true, skinConcerns: true, hairProfile: true,
              },
            },
            consumer: {
              select: {
                id: true,
                _count: { select: { endUsers: true } },
              },
            },
            _count: { select: { checkIns: true, routines: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.endUser.count({ where: where as any }),
      ])

      return { consumers, total, page, pages: Math.ceil(total / limit) }
    }
  )

  // ── Consumer detail for a brand (admin) ───────────────────────────
  server.get(
    '/admin/brands/:brandId/consumers/:userId',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId, userId } = request.params as { brandId: string; userId: string }

      const endUser = await prisma.endUser.findFirst({
        where: { id: userId, brandId },
        include: {
          beautyProfile: true,
          consumer: {
            select: {
              id: true,
              phone: true,
              birthday: true,
              endUsers: {
                select: {
                  id: true,
                  brandId: true,
                  brand: { select: { name: true, slug: true, demoLinkExpiresAt: true } },
                },
              },
            },
          },
          routines: {
            where: { activeTo: null },
            include: {
              steps: {
                include: { product: { select: { name: true, category: true } } },
                orderBy: { step: 'asc' },
              },
            },
            take: 5,
          },
          checkIns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true, skinRating: true, compliant: true,
              symptoms: true, notes: true, createdAt: true,
            },
          },
        },
      })

      if (!endUser) throw new ApiError(404, 'Consumer not found')

      const quizSession = await prisma.quizSession.findFirst({
        where: { endUserId: userId, brandId, completed: true },
        orderBy: { completedAt: 'desc' },
      })

      return { consumer: endUser, quizSession: quizSession ?? null }
    }
  )

  // ── Brand overlaps (cross-brand consumer sharing, admin) ──────────
  server.get(
    '/admin/brands/:brandId/brand-overlaps',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }

      const linked = await prisma.endUser.findMany({
        where: { brandId, consumerId: { not: null } },
        select: { consumerId: true },
      })
      const consumerIds = [...new Set(linked.map(u => u.consumerId!))]

      if (consumerIds.length === 0) return { overlaps: [], totalLinked: 0 }

      const rows = await prisma.endUser.groupBy({
        by: ['brandId'],
        where: {
          consumerId: { in: consumerIds },
          brandId: { not: brandId },
        },
        _count: { consumerId: true },
        orderBy: { _count: { consumerId: 'desc' } },
      })

      const otherBrandIds = rows.map(r => r.brandId)
      const brands = await prisma.brand.findMany({
        where: { id: { in: otherBrandIds } },
        select: { id: true, name: true, slug: true, demoLinkExpiresAt: true },
      })

      const brandMap = new Map(brands.map(b => [b.id, b]))

      const overlaps = rows.map(r => {
        const b = brandMap.get(r.brandId)
        return {
          brandId: r.brandId,
          brandName: b?.name ?? 'Unknown',
          slug: b?.slug ?? '',
          isDemo: !!b?.demoLinkExpiresAt,
          overlapCount: r._count.consumerId,
          overlapPct: Math.round((r._count.consumerId / consumerIds.length) * 100),
        }
      })

      return { overlaps, totalLinked: consumerIds.length }
    }
  )

  // ── White-label: scrape theme from URL ────────────────────────────
  server.post(
    '/admin/brands/:brandId/scrape-theme',
    { preHandler: requireHaliteAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const { url } = z.object({ url: z.string().url() }).parse(request.body)
      const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
      if (!brand) throw new ApiError(404, 'Brand not found')
      const theme = await scrapeTheme(url)
      return { theme }
    }
  )
}

function demoBrandStatus(brand: { demoLinkExpiresAt: Date | null; _count?: { products: number; endUsers: number } }): string {
  if (!brand.demoLinkExpiresAt) return 'generating'
  if (brand.demoLinkExpiresAt < new Date()) return 'access_expired'
  const daysLeft = Math.ceil((brand.demoLinkExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (daysLeft <= 3) return 'expiring_soon'
  return 'active'
}
