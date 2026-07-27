import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, CatalogFormat, ProductCategory, SkinConcern, SkinType } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { uploadToS3, getPresignedUrl, getS3Buffer } from '../lib/storage.js'
import { processCatalogUpload } from '../lib/catalog-processor.js'
import { embedBrandProducts } from '../lib/embeddings.js'
import * as XLSX from 'xlsx'

// Client-supplied filenames are untrusted — used raw, they let arbitrary
// characters (including path-like sequences) into an S3 key. Keeps only a
// safe charset and caps length; the timestamp prefix already guarantees
// uniqueness so this only needs to stay human-readable, not unique.
function sanitizeUploadFilename(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100)
  return safe || 'upload'
}

// The extension/declared MIME type are both client-controlled and easily
// spoofed (a renamed executable still claims to be "catalog.csv"). Actually
// attempting to parse the content is what makes this check meaningful: a
// file that doesn't parse as valid JSON/CSV text is rejected regardless of
// what it claims to be.
function assertParsableCatalogFile(buffer: Buffer, format: CatalogFormat) {
  if (buffer.includes(0)) throw new ApiError(400, 'File does not look like a text-based CSV/JSON catalog')
  if (format === 'JSON') {
    try {
      JSON.parse(buffer.toString('utf-8'))
    } catch {
      throw new ApiError(400, 'File is not valid JSON')
    }
  } else {
    const text = buffer.toString('utf-8')
    const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
    if (!firstLine.includes(',')) throw new ApiError(400, 'File does not look like a valid CSV (no comma-delimited header row)')
  }
}

// A cell value starting with =, +, -, or @ is interpreted as a formula by
// Excel/Sheets/LibreOffice when the exported file is opened — a brand name,
// product name, or note containing e.g. `=HYPERLINK(...)` or a DDE payload
// would execute in whoever's spreadsheet app opens this export. Prefixing a
// single quote forces those apps to treat it as literal text.
function neutralizeFormula(value: unknown): unknown {
  if (typeof value === 'string' && /^[=+\-@]/.test(value)) return `'${value}`
  return value
}

function safeJsonToSheet(rows: Record<string, unknown>[]) {
  const sanitized = rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, neutralizeFormula(v)]))
  )
  return XLSX.utils.json_to_sheet(sanitized)
}

export async function catalogRoutes(server: FastifyInstance) {
  // ── Upload catalog file (CSV or JSON) ─────────────────────────────
  server.post(
    '/:brandId/catalog/upload',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }

      const data = await request.file()
      if (!data) throw new ApiError(400, 'No file provided')

      const ext = data.filename.split('.').pop()?.toLowerCase()
      const format: CatalogFormat =
        ext === 'csv' ? 'CSV' : ext === 'json' ? 'JSON' : (() => { throw new ApiError(400, 'Unsupported format. Use CSV or JSON') })()

      const buffer = await data.toBuffer()
      assertParsableCatalogFile(buffer, format)
      const key = `catalogs/${brandId}/${Date.now()}-${sanitizeUploadFilename(data.filename)}`
      const fileUrl = await uploadToS3(key, buffer, data.mimetype)

      const upload = await prisma.catalogUpload.create({
        data: { brandId, fileName: data.filename, fileUrl, format, status: 'PROCESSING' },
      })

      // Process async — don't block the response
      processCatalogUpload(upload.id, brandId, buffer, format)
        .then(() => {
          if (process.env.OPENAI_API_KEY) {
            return embedBrandProducts(brandId)
          }
          return
        })
        .catch((err) => {
          console.error(`Catalog processing failed for upload ${upload.id}:`, err)
          prisma.catalogUpload.update({
            where: { id: upload.id },
            data: { status: 'FAILED', errorLog: { message: String(err) } },
          })
        })

      return reply.status(202).send({ uploadId: upload.id, status: 'PROCESSING' })
    }
  )

  // ── Poll upload status ────────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads/:uploadId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, uploadId } = request.params as { brandId: string; uploadId: string }
      const upload = await prisma.catalogUpload.findFirst({
        where: { id: uploadId, brandId },
      })
      if (!upload) throw new ApiError(404, 'Upload not found')
      return { upload }
    }
  )

  // ── List uploads ──────────────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const uploads = await prisma.catalogUpload.findMany({
        where: { brandId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      return { uploads }
    }
  )

  // ── Download upload file ──────────────────────────────────────────
  server.get(
    '/:brandId/catalog/uploads/:uploadId/download',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, uploadId } = request.params as { brandId: string; uploadId: string }
      const upload = await prisma.catalogUpload.findFirst({ where: { id: uploadId, brandId } })
      if (!upload) throw new ApiError(404, 'Upload not found')

      if (upload.source === 'USER_UPLOADED' && upload.fileUrl) {
        const key = new URL(upload.fileUrl).pathname.slice(1)
        const url = await getPresignedUrl(key, 300)
        return reply.redirect(url)
      }

      // AI-generated: build XLSX on the fly based on file name
      let wb: XLSX.WorkBook
      const name = upload.fileName.toLowerCase()

      // Deterministic demo data helpers (no DB storage needed)
      function deterministicPhone(id: string): string {
        let h = 5381
        for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
        const n = (h % 9000000000) + 1000000000
        const s = String(n)
        return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6, 10)}`
      }

      function ageFromRange(ageRange: string | null, id: string): number {
        const ranges: Record<string, [number, number]> = {
          under_18: [14, 17], '18_24': [18, 24], '25_34': [25, 34],
          '35_44': [35, 44], '45_54': [45, 54], '55_64': [55, 64], '65_plus': [65, 75],
        }
        const [min, max] = ranges[ageRange ?? '25_34'] ?? [25, 34]
        let h = 5381
        for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
        return min + (h % (max - min + 1))
      }

      function birthdayFromAge(age: number, id: string): string {
        let h = 5381
        for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) ^ id.charCodeAt(i)) >>> 0
        const year = new Date().getFullYear() - age
        const month = (h % 12) + 1
        const day = ((h >> 4) % 28) + 1
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }

      if (name.includes('purchase')) {
        const historyMonths: number = (upload.errorLog as any)?.historyMonths ?? 6
        const lookbackDays = Math.max(historyMonths * 30, 30)
        const users = await prisma.endUser.findMany({
          where: { brandId },
          include: {
            routines: {
              where: { activeTo: null },
              include: { steps: { include: { product: { select: { id: true, name: true, category: true, price: true, currency: true } } } } },
              take: 1,
            },
          },
          take: 1000,
        })
        const rows: Array<Record<string, unknown>> = []
        for (const u of users) {
          const routine = u.routines[0]
          if (!routine) continue
          const seen = new Set<string>()
          for (const step of routine.steps) {
            if (seen.has(step.productId)) continue
            seen.add(step.productId)
            const daysAgo = Math.floor(Math.random() * lookbackDays)
            const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
            rows.push({
              orderId: `ORD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
              customerId: u.id,
              customerName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
              customerEmail: u.email ?? '',
              productName: step.product.name,
              category: step.product.category,
              quantity: Math.floor(Math.random() * 2) + 1,
              unitPrice: step.product.price?.toFixed(2) ?? '',
              currency: step.product.currency,
              orderDate: orderDate.toISOString().slice(0, 10),
            })
          }
        }
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Purchase History')
      } else if (name.includes('customer') || name.includes('consumer')) {
        const users = await prisma.endUser.findMany({
          where: { brandId },
          include: { beautyProfile: true },
          take: 1000,
        })
        const rows = users.map(u => {
          const age = ageFromRange(u.beautyProfile?.ageRange ?? null, u.id)
          return {
            customerId: u.id,
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            email: u.email ?? '',
            phone: deterministicPhone(u.id),
            age,
            birthday: birthdayFromAge(age, u.id),
            city: u.beautyProfile?.city ?? '',
            country: u.beautyProfile?.country ?? 'United States',
            skinType: u.beautyProfile?.skinType ?? '',
            skinTone: u.beautyProfile?.monkSkinTone ?? '',
            skinConcerns: (u.beautyProfile?.skinConcerns ?? []).join(', '),
            ageRange: u.beautyProfile?.ageRange ?? '',
            climate: u.beautyProfile?.climateTag ?? '',
            joinedAt: u.createdAt.toISOString().slice(0, 10),
          }
        })
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Customer Profiles')
      } else if (name.includes('quiz')) {
        const sessions = await prisma.quizSession.findMany({
          where: { brandId, completed: true },
          include: { endUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
          take: 1000,
          orderBy: { completedAt: 'desc' },
        })
        const skinTypeLabel: Record<string, string> = {
          oily_all: 'Oily', oily_tzone: 'Oily T-zone', normal: 'Normal', dry: 'Dry', very_dry: 'Very Dry',
          DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combination', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
          combination: 'Combination', sensitive: 'Sensitive',
        }
        const ageRangeLabel: Record<string, string> = {
          under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
          '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
        }
        const rows = sessions.map(s => {
          const a = s.answers as Record<string, unknown>
          const concerns = Array.isArray(a['S4']) ? (a['S4'] as string[]).join(', ') : String(a['S4'] ?? '')
          const hairConcerns = Array.isArray(a['H2']) ? (a['H2'] as string[]).join(', ') : String(a['H2'] ?? '')
          const areas = Array.isArray(s.selectedAreas) ? s.selectedAreas.join(', ') : ''
          return {
            customerId: s.endUserId ?? '',
            customerName: s.endUser ? `${s.endUser.firstName ?? ''} ${s.endUser.lastName ?? ''}`.trim() : '',
            customerEmail: s.endUser?.email ?? '',
            quizAreas: areas,
            completedAt: s.completedAt?.toISOString().slice(0, 10) ?? '',
            ageRange: ageRangeLabel[String(a['SH0'] ?? '')] ?? String(a['SH0'] ?? ''),
            skinType: skinTypeLabel[String(a['S1'] ?? '')] ?? String(a['S1'] ?? ''),
            skinConcerns: concerns,
            monkSkinTone: String(a['S5'] ?? ''),
            breakoutFrequency: String(a['S2'] ?? ''),
            sensitivity: String(a['S3'] ?? ''),
            hairType: String(a['H1'] ?? ''),
            hairConcerns,
            scalpType: String(a['H3'] ?? ''),
            hairPorosity: String(a['H4'] ?? ''),
            routinePreference: String(a['SH1'] ?? ''),
            waterIntake: String(a['SH2'] ?? ''),
            sleepHours: String(a['SH3'] ?? ''),
            stressLevel: String(a['SH4'] ?? ''),
          }
        })
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Quiz Results')
      } else if (name.includes('routine')) {
        const routines = await prisma.routine.findMany({
          where: { endUser: { brandId }, activeTo: null },
          include: {
            endUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            steps: {
              include: { product: { select: { name: true, category: true } } },
              orderBy: { step: 'asc' },
            },
          },
          take: 1000,
        })
        const rows = routines.map(r => {
          const amProducts = r.steps.filter(s => s.timeOfDay === 'AM' || s.timeOfDay === 'BOTH').map(s => s.product.name).join(', ')
          const pmProducts = r.steps.filter(s => s.timeOfDay === 'PM' || s.timeOfDay === 'BOTH').map(s => s.product.name).join(', ')
          const allProducts = r.steps.map(s => `${s.product.name} (${s.timeOfDay})`).join('; ')
          return {
            customerId: r.endUserId,
            customerName: `${r.endUser.firstName ?? ''} ${r.endUser.lastName ?? ''}`.trim(),
            customerEmail: r.endUser.email ?? '',
            focusArea: r.focusArea,
            amProducts: amProducts || '—',
            pmProducts: pmProducts || '—',
            allProducts,
            assignedAt: r.createdAt.toISOString().slice(0, 10),
          }
        })
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Routine Assignments')
      } else if (name.includes('check')) {
        const checkIns = await prisma.checkIn.findMany({
          where: { endUser: { brandId } },
          include: { endUser: { select: { firstName: true, lastName: true } } },
          take: 2000,
          orderBy: { createdAt: 'desc' },
        })
        const rows = checkIns.map(c => ({
          consumerId: c.endUserId,
          name: `${c.endUser.firstName ?? ''} ${c.endUser.lastName ?? ''}`.trim(),
          skinRating: c.skinRating ?? '',
          compliant: c.compliant ? 'Yes' : 'No',
          symptoms: (c.symptoms ?? []).join(', '),
          notes: c.notes ?? '',
          date: c.createdAt.toISOString().slice(0, 10),
        }))
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Check-ins')
      } else {
        const products = await prisma.product.findMany({ where: { brandId }, take: 500 })
        const rows = products.map(p => ({
          name: p.name,
          category: p.category,
          price: p.price ?? '',
          currency: p.currency,
          description: p.description ?? '',
          keyIngredients: p.keyIngredients.join(', '),
          concerns: p.concerns.join(', '),
          inStock: p.inStock,
          productUrl: p.productUrl ?? '',
        }))
        wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, safeJsonToSheet(rows), 'Products')
      }

      const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${upload.fileName}"`)
      return reply.send(buf)
    }
  )

  // ── Preview upload (returns JSON rows for in-browser table) ──────
  server.get(
    '/:brandId/catalog/uploads/:uploadId/preview',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, uploadId } = request.params as { brandId: string; uploadId: string }
      const upload = await prisma.catalogUpload.findFirst({ where: { id: uploadId, brandId } })
      if (!upload) throw new ApiError(404, 'Upload not found')

      const PREVIEW_LIMIT = 200
      let rows: Record<string, unknown>[] = []
      let total = 0

      if (upload.source === 'USER_UPLOADED' && upload.fileUrl) {
        const key = new URL(upload.fileUrl).pathname.slice(1)
        const buf = await getS3Buffer(key)
        const wb = XLSX.read(buf, { type: 'buffer' })
        const sheetName = wb.SheetNames[0] ?? ''
        const sheet = wb.Sheets[sheetName]
        const allRows = sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet) : []
        total = allRows.length
        rows = allRows.slice(0, PREVIEW_LIMIT)
      } else {
        // AI-generated — build rows on the fly (same logic as download)
        const name = upload.fileName.toLowerCase()

        function deterministicPhone(id: string): string {
          let h = 5381
          for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
          const n = (h % 9000000000) + 1000000000
          const s = String(n)
          return `(${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6, 10)}`
        }
        function ageFromRange(ageRange: string | null, id: string): number {
          const ranges: Record<string, [number, number]> = {
            under_18: [14, 17], '18_24': [18, 24], '25_34': [25, 34],
            '35_44': [35, 44], '45_54': [45, 54], '55_64': [55, 64], '65_plus': [65, 75],
          }
          const [min, max] = ranges[ageRange ?? '25_34'] ?? [25, 34]
          let h = 5381
          for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) ^ id.charCodeAt(i)) >>> 0
          return min + (h % (max - min + 1))
        }
        function birthdayFromAge(age: number, id: string): string {
          let h = 5381
          for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) ^ id.charCodeAt(i)) >>> 0
          const year = new Date().getFullYear() - age
          const month = (h % 12) + 1
          const day = ((h >> 4) % 28) + 1
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }

        if (name.includes('purchase')) {
          const historyMonths: number = (upload.errorLog as any)?.historyMonths ?? 6
          const lookbackDays = Math.max(historyMonths * 30, 30)
          const users = await prisma.endUser.findMany({
            where: { brandId },
            include: {
              routines: {
                where: { activeTo: null },
                include: { steps: { include: { product: { select: { id: true, name: true, category: true, price: true, currency: true } } } } },
                take: 1,
              },
            },
            take: 1000,
          })
          for (const u of users) {
            const routine = u.routines[0]
            if (!routine) continue
            const seen = new Set<string>()
            for (const step of routine.steps) {
              if (seen.has(step.productId)) continue
              seen.add(step.productId)
              const daysAgo = Math.floor(Math.random() * lookbackDays)
              const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
              rows.push({
                orderId: `ORD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
                customerId: u.id,
                customerName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
                customerEmail: u.email ?? '',
                productName: step.product.name,
                category: step.product.category,
                quantity: Math.floor(Math.random() * 2) + 1,
                unitPrice: step.product.price?.toFixed(2) ?? '',
                currency: step.product.currency,
                orderDate: orderDate.toISOString().slice(0, 10),
              })
            }
          }
        } else if (name.includes('customer') || name.includes('consumer')) {
          const users = await prisma.endUser.findMany({
            where: { brandId },
            include: { beautyProfile: true },
            take: 1000,
          })
          rows = users.map(u => {
            const age = ageFromRange(u.beautyProfile?.ageRange ?? null, u.id)
            return {
              customerId: u.id,
              firstName: u.firstName ?? '',
              lastName: u.lastName ?? '',
              name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
              email: u.email ?? '',
              phone: deterministicPhone(u.id),
              age,
              birthday: birthdayFromAge(age, u.id),
              city: u.beautyProfile?.city ?? '',
              country: u.beautyProfile?.country ?? 'United States',
              skinType: u.beautyProfile?.skinType ?? '',
              skinTone: u.beautyProfile?.monkSkinTone ?? '',
              skinConcerns: (u.beautyProfile?.skinConcerns ?? []).join(', '),
              ageRange: u.beautyProfile?.ageRange ?? '',
              climate: u.beautyProfile?.climateTag ?? '',
              joinedAt: u.createdAt.toISOString().slice(0, 10),
            }
          })
        } else if (name.includes('quiz')) {
          const sessions = await prisma.quizSession.findMany({
            where: { brandId, completed: true },
            include: { endUser: { select: { id: true, firstName: true, lastName: true, email: true } } },
            take: 1000,
            orderBy: { completedAt: 'desc' },
          })
          const skinTypeLabel: Record<string, string> = {
            oily_all: 'Oily', oily_tzone: 'Oily T-zone', normal: 'Normal', dry: 'Dry', very_dry: 'Very Dry',
            DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combination', NORMAL: 'Normal', SENSITIVE: 'Sensitive',
            combination: 'Combination', sensitive: 'Sensitive',
          }
          const ageRangeLabel: Record<string, string> = {
            under_18: 'Under 18', '18_24': '18–24', '25_34': '25–34',
            '35_44': '35–44', '45_54': '45–54', '55_64': '55–64', '65_plus': '65+',
          }
          rows = sessions.map(s => {
            const a = s.answers as Record<string, unknown>
            return {
              customerId: s.endUserId ?? '',
              customerName: s.endUser ? `${s.endUser.firstName ?? ''} ${s.endUser.lastName ?? ''}`.trim() : '',
              customerEmail: s.endUser?.email ?? '',
              quizAreas: Array.isArray(s.selectedAreas) ? s.selectedAreas.join(', ') : '',
              completedAt: s.completedAt?.toISOString().slice(0, 10) ?? '',
              ageRange: ageRangeLabel[String(a['SH0'] ?? '')] ?? String(a['SH0'] ?? ''),
              skinType: skinTypeLabel[String(a['S1'] ?? '')] ?? String(a['S1'] ?? ''),
              skinConcerns: Array.isArray(a['S4']) ? (a['S4'] as string[]).join(', ') : String(a['S4'] ?? ''),
              monkSkinTone: String(a['S5'] ?? ''),
              breakoutFrequency: String(a['S2'] ?? ''),
              sensitivity: String(a['S3'] ?? ''),
              hairType: String(a['H1'] ?? ''),
              hairConcerns: Array.isArray(a['H2']) ? (a['H2'] as string[]).join(', ') : String(a['H2'] ?? ''),
              scalpType: String(a['H3'] ?? ''),
              hairPorosity: String(a['H4'] ?? ''),
              routinePreference: String(a['SH1'] ?? ''),
              waterIntake: String(a['SH2'] ?? ''),
              sleepHours: String(a['SH3'] ?? ''),
              stressLevel: String(a['SH4'] ?? ''),
            }
          })
        } else if (name.includes('routine')) {
          const routines = await prisma.routine.findMany({
            where: { endUser: { brandId }, activeTo: null },
            include: {
              endUser: { select: { id: true, firstName: true, lastName: true, email: true } },
              steps: {
                include: { product: { select: { name: true, category: true } } },
                orderBy: { step: 'asc' },
              },
            },
            take: 1000,
          })
          rows = routines.map(r => ({
            customerId: r.endUserId,
            customerName: `${r.endUser.firstName ?? ''} ${r.endUser.lastName ?? ''}`.trim(),
            customerEmail: r.endUser.email ?? '',
            focusArea: r.focusArea,
            amProducts: r.steps.filter(s => s.timeOfDay === 'AM' || s.timeOfDay === 'BOTH').map(s => s.product.name).join(', ') || '—',
            pmProducts: r.steps.filter(s => s.timeOfDay === 'PM' || s.timeOfDay === 'BOTH').map(s => s.product.name).join(', ') || '—',
            allProducts: r.steps.map(s => `${s.product.name} (${s.timeOfDay})`).join('; '),
            assignedAt: r.createdAt.toISOString().slice(0, 10),
          }))
        } else if (name.includes('check')) {
          const checkIns = await prisma.checkIn.findMany({
            where: { endUser: { brandId } },
            include: { endUser: { select: { firstName: true, lastName: true } } },
            take: 2000,
            orderBy: { createdAt: 'desc' },
          })
          rows = checkIns.map(c => ({
            consumerId: c.endUserId,
            name: `${c.endUser.firstName ?? ''} ${c.endUser.lastName ?? ''}`.trim(),
            skinRating: c.skinRating ?? '',
            compliant: c.compliant ? 'Yes' : 'No',
            symptoms: (c.symptoms ?? []).join(', '),
            notes: c.notes ?? '',
            date: c.createdAt.toISOString().slice(0, 10),
          }))
        } else {
          const products = await prisma.product.findMany({ where: { brandId }, take: 500 })
          rows = products.map(p => ({
            name: p.name,
            category: p.category,
            price: p.price ?? '',
            currency: p.currency,
            description: p.description ?? '',
            keyIngredients: p.keyIngredients.join(', '),
            concerns: p.concerns.join(', '),
            inStock: p.inStock,
            productUrl: p.productUrl ?? '',
          }))
        }

        total = rows.length
        rows = rows.slice(0, PREVIEW_LIMIT)
      }

      const firstRow = rows[0]
      const columns = firstRow ? Object.keys(firstRow) : []
      return { columns, rows, total }
    }
  )

  // ── List products ─────────────────────────────────────────────────
  server.get(
    '/:brandId/products',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        category: z.string().optional(),
        inStock: z.coerce.boolean().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(100).default(50),
      })
      const { category, inStock, page, limit } = schema.parse(request.query)

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: {
            brandId,
            ...(category ? { category: category as any } : {}),
            ...(inStock !== undefined ? { inStock } : {}),
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where: { brandId } }),
      ])

      return { products, total, page, pages: Math.ceil(total / limit) }
    }
  )

  // ── Create product manually ───────────────────────────────────────
  server.post(
    '/:brandId/products',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.nativeEnum(ProductCategory),
        concerns: z.array(z.nativeEnum(SkinConcern)).default([]),
        skinTypes: z.array(z.nativeEnum(SkinType)).default([]),
        monkSkinTones: z.array(z.number().int().min(1).max(10)).default([]),
        ingredients: z.array(z.string()).default([]),
        keyIngredients: z.array(z.string()).default([]),
        price: z.number().min(0),
        currency: z.string().default('USD'),
        imageUrl: z.string().url().optional(),
        productUrl: z.string().url().optional(),
        externalId: z.string().optional(),
        inStock: z.boolean().default(true),
      })
      const d = schema.parse(request.body)
      const product = await prisma.product.create({
        data: {
          brandId,
          name: d.name,
          description: d.description ?? null,
          category: d.category,
          concerns: d.concerns,
          skinTypes: d.skinTypes,
          monkSkinTones: d.monkSkinTones,
          ingredients: d.ingredients,
          keyIngredients: d.keyIngredients,
          price: d.price,
          currency: d.currency,
          imageUrl: d.imageUrl ?? null,
          productUrl: d.productUrl ?? null,
          externalId: d.externalId ?? null,
          inStock: d.inStock,
        },
      })
      return reply.status(201).send({ product })
    }
  )

  // ── Get product detail with usage stats ──────────────────────────
  server.get(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }

      const product = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!product) throw new ApiError(404, 'Product not found')

      const [checkInProducts, routineCount] = await Promise.all([
        prisma.checkInProduct.findMany({
          where: { productId },
          include: {
            checkIn: {
              select: {
                skinRating: true,
                endUser: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        }),
        prisma.routineStep.count({ where: { productId } }),
      ])

      const used = checkInProducts.filter(cp => cp.used).length
      const positive = checkInProducts.filter(cp => cp.reaction === 'POSITIVE').length
      const neutral = checkInProducts.filter(cp => cp.reaction === 'NEUTRAL').length
      const negative = checkInProducts.filter(cp => cp.reaction === 'NEGATIVE').length

      const consumerMap = new Map<string, { id: string; firstName: string | null; lastName: string | null; email: string | null; checkIns: number; totalRating: number }>()
      for (const cp of checkInProducts) {
        const u = cp.checkIn.endUser
        const existing = consumerMap.get(u.id)
        if (existing) { existing.checkIns++; existing.totalRating += cp.checkIn.skinRating }
        else { consumerMap.set(u.id, { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, checkIns: 1, totalRating: cp.checkIn.skinRating }) }
      }
      const topConsumers = Array.from(consumerMap.values())
        .sort((a, b) => b.checkIns - a.checkIns)
        .slice(0, 10)
        .map(c => ({ ...c, avgRating: Math.round((c.totalRating / c.checkIns) * 10) / 10 }))

      return {
        product,
        stats: {
          routineCount,
          checkInTotal: checkInProducts.length,
          checkInUsed: used,
          usageRate: checkInProducts.length > 0 ? Math.round((used / checkInProducts.length) * 100) : null,
          reactions: { positive, neutral, negative },
        },
        topConsumers,
      }
    }
  )

  // ── Update product ────────────────────────────────────────────────
  server.patch(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z.nativeEnum(ProductCategory).optional(),
        concerns: z.array(z.nativeEnum(SkinConcern)).optional(),
        skinTypes: z.array(z.nativeEnum(SkinType)).optional(),
        fitzpatrickTypes: z.array(z.number().int().min(1).max(6)).optional(),
        ingredients: z.array(z.string()).optional(),
        keyIngredients: z.array(z.string()).optional(),
        price: z.number().min(0).optional(),
        currency: z.string().optional(),
        imageUrl: z.string().url().nullable().optional(),
        productUrl: z.string().url().nullable().optional(),
        inStock: z.boolean().optional(),
      })
      const parsed = schema.parse(request.body)
      const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined))
      const existing = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!existing) throw new ApiError(404, 'Product not found')
      const product = await prisma.product.update({ where: { id: productId }, data })
      return { product }
    }
  )

  // ── Delete product ────────────────────────────────────────────────
  server.delete(
    '/:brandId/products/:productId',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, productId } = request.params as { brandId: string; productId: string }
      const existing = await prisma.product.findFirst({ where: { id: productId, brandId } })
      if (!existing) throw new ApiError(404, 'Product not found')
      // CheckInProduct and RoutineStep reference Product without cascade — clear them first
      await prisma.$transaction([
        prisma.checkInProduct.deleteMany({ where: { productId } }),
        prisma.routineStep.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
      ])
      return reply.status(204).send()
    }
  )

  // ── Get presigned URL for direct browser upload ───────────────────
  server.post(
    '/:brandId/catalog/presign',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }
      const { filename } = z.object({ filename: z.string() }).parse(request.body)
      const key = `catalogs/${brandId}/${Date.now()}-${sanitizeUploadFilename(filename)}`
      const url = await getPresignedUrl(key)
      return reply.send({ url, key })
    }
  )
}
