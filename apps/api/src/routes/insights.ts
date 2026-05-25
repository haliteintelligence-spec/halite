import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireBrandAdmin } from '../lib/auth.js'
import { getAnthropic } from '../lib/model-router.js'

export async function insightsRoutes(server: FastifyInstance) {
  server.post(
    '/:brandId/insights/stream',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const schema = z.object({
        viewName: z.string().min(1).max(200),
        dataContext: z.record(z.unknown()),
      })

      const { viewName, dataContext } = schema.parse(request.body)
      const anthropic = getAnthropic()

      const userPrompt = `Analyse this dashboard view and generate a focused insight report for the brand manager.

View: ${viewName}

Data:
${JSON.stringify(dataContext, null, 2)}

Structure your response exactly as follows:

## Summary
2–3 sentences summarising what this data shows and what it means for the brand.

## How to Use This Data
- **Marketing**: How to apply this in campaigns, content, or messaging
- **Product Development**: What new products or improvements this data points to
- **Formulation**: Specific ingredient, texture, or formula directions indicated
- **Customer Targeting**: Which segments, cohorts, or personas to focus on
- **Retention**: How to use this insight to keep consumers engaged and compliant

## Actions
1. [First specific, numbered action]
2. [Second specific, numbered action]
3. [Third specific, numbered action]

## Watch Out For
1–2 brief warnings or things to monitor based on this data.`

      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')

      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: `You are an AI intelligence analyst embedded in the Halite Intelligence platform for beauty brands. When given a dashboard view's data, generate a focused, structured insight report. Be specific — cite the actual numbers from the data. Keep the response concise and actionable. Brand managers need clear next steps, not lengthy analysis. Format with markdown headers (##) and bullet points.`,
        messages: [{ role: 'user', content: userPrompt }],
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
        }
      }

      reply.raw.write(`data: [DONE]\n\n`)
      reply.raw.end()
    }
  )
}
