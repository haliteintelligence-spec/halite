import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { suggestLocations } from '../lib/location-resolver.js'
import { fetchClimate } from '../lib/climate.js'
import { ApiError } from '../lib/errors.js'

export async function quizLocationRoutes(server: FastifyInstance) {
  // ── Autocomplete suggestions ───────────────────────────────────────
  // Called on every keystroke (debounced 300ms on client)
  server.get('/quiz/location/suggest', async (request) => {
    const { q } = z.object({ q: z.string().min(2).max(100) }).parse(request.query)
    const suggestions = await suggestLocations(q)
    return { suggestions }
  })

  // ── Validate + pull climate for a confirmed selection ─────────────
  server.post('/quiz/location/validate', async (request, reply) => {
    const schema = z.object({
      city: z.string(),
      country: z.string(),
      countryCode: z.string(),
      lat: z.number(),
      lng: z.number(),
      timezone: z.string(),
      currency: z.string(),
    })

    const location = schema.parse(request.body)

    // Validate coordinates are real
    if (
      location.lat < -90 || location.lat > 90 ||
      location.lng < -180 || location.lng > 180
    ) {
      throw new ApiError(400, 'Invalid coordinates')
    }

    // Fetch climate data for this location
    const { climateTag, snapshot } = await fetchClimate(location.lat, location.lng)

    return reply.send({
      valid: true,
      displayName: `${location.city}, ${location.country}`,
      location,
      climateTag,
      climateSnapshot: snapshot,
    })
  })
}
