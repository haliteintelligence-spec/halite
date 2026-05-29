import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { authRoutes } from './routes/auth.js'
import { brandRoutes } from './routes/brands.js'
import { catalogRoutes } from './routes/catalog.js'
import { quizRoutes } from './routes/quiz.js'
import { quizLocationRoutes } from './routes/quiz-location.js'
import { endUserRoutes } from './routes/end-users.js'
import { shopifyRoutes } from './routes/shopify.js'
import { analyticsRoutes } from './routes/analytics.js'
import { adminRoutes } from './routes/admin.js'
import { crystalRoutes, adminCrystalRoutes } from './routes/crystal.js'
import { consumerRoutes } from './routes/consumers.js'
import { agentRoutes } from './routes/agents.js'
import { insightsRoutes } from './routes/insights.js'
import { errorHandler } from './lib/errors.js'
import { prisma } from '@halite/db'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
})

async function bootstrap() {
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow Shopify storefronts, brand subdomains, and dashboard
      const allowed = [
        /\.haliteintelligence\.com$/,
        /^https?:\/\/haliteintelligence\.com$/,
        /\.myshopify\.com$/,
        /\.up\.railway\.app$/,
        /^http:\/\/localhost/,
      ]
      if (!origin || allowed.some((r) => r.test(origin))) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed'), false)
      }
    },
    credentials: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '7d' },
  })

  await server.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  })

  await server.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB catalog uploads
  })

  // Routes
  await server.register(authRoutes, { prefix: '/auth' })
  await server.register(brandRoutes, { prefix: '/brands' })
  await server.register(catalogRoutes, { prefix: '/brands' })
  await server.register(quizRoutes, { prefix: '/brands' })
  await server.register(quizLocationRoutes)
  await server.register(endUserRoutes, { prefix: '/brands' })
  await server.register(analyticsRoutes, { prefix: '/brands' })
  await server.register(shopifyRoutes, { prefix: '/shopify' })
  await server.register(adminRoutes)
  await server.register(crystalRoutes, { prefix: '/brands' })
  await server.register(adminCrystalRoutes)
  await server.register(consumerRoutes)
  await server.register(agentRoutes, { prefix: '/brands' })
  await server.register(insightsRoutes, { prefix: '/brands' })

  server.setErrorHandler(errorHandler)

  server.get('/', async () => ({ name: 'Halite Intelligence API', version: '1.0.0', status: 'ok' }))
  server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Backfill BrandType for rows created before the enum column existed
  await prisma.$executeRawUnsafe(
    `UPDATE brands SET type = 'DEMO' WHERE is_demo = true AND type = 'ONBOARDED'`
  )

  const port = Number(process.env.PORT ?? 3001)
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`API running on port ${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
