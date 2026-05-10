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
import { errorHandler } from './lib/errors.js'

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
        /\.myshopify\.com$/,
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
  await server.register(shopifyRoutes, { prefix: '/shopify' })

  server.setErrorHandler(errorHandler)

  server.get('/', async () => ({ name: 'Halite Intelligence API', version: '1.0.0', status: 'ok' }))
  server.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  const port = Number(process.env.PORT ?? 3001)
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`API running on port ${port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
