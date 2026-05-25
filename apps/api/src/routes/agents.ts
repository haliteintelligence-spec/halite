import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@halite/db'
import { requireBrandAdmin } from '../lib/auth.js'
import { ApiError } from '../lib/errors.js'
import { runAgentWorkflow } from '../lib/agent-runner.js'

const WorkflowTypeEnum = z.enum([
  'ROUTINE_OUTCOME', 'CHURN_PREDICTION', 'PRODUCT_INTELLIGENCE',
  'CONVERSION', 'EXECUTIVE_INTELLIGENCE', 'CUSTOM',
])

export async function agentRoutes(server: FastifyInstance) {
  // ── List workflows ────────────────────────────────────────────────
  server.get(
    '/:brandId/agents/workflows',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const workflows = await prisma.agentWorkflow.findMany({
        where: { brandId, isActive: true },
        include: {
          _count: { select: { runs: true } },
          runs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, createdAt: true },
          },
        },
        orderBy: [{ isPrebuilt: 'desc' }, { createdAt: 'asc' }],
      })
      return { workflows }
    }
  )

  // ── Get single workflow ───────────────────────────────────────────
  server.get(
    '/:brandId/agents/workflows/:workflowId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, workflowId } = request.params as { brandId: string; workflowId: string }
      const workflow = await prisma.agentWorkflow.findFirst({
        where: { id: workflowId, brandId },
        include: {
          runs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, status: true, tokenCount: true, createdAt: true,
              output: true },
          },
        },
      })
      if (!workflow) throw new ApiError(404, 'Workflow not found')
      return { workflow }
    }
  )

  // ── Create custom workflow ────────────────────────────────────────
  server.post(
    '/:brandId/agents/workflows',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId } = request.params as { brandId: string }

      const outputFormatEnum = z.enum(['insight_cards', 'risk_alerts', 'product_recommendations', 'executive_briefing', 'narrative_report'])

      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        trigger: z.enum(['manual', 'scheduled_daily', 'scheduled_weekly', 'on_checkin', 'on_new_consumer']),
        triggerOptions: z.object({
          day: z.string().optional(),
          hour: z.string().optional(),
        }).optional(),
        dataSources: z.array(z.enum(['consumers', 'products', 'checkIns', 'routines'])).min(1),
        objectivePrompt: z.string().min(20).max(4000),
        outputFormats: z.array(outputFormatEnum).min(1),
      })

      const data = schema.parse(request.body)

      const workflow = await prisma.agentWorkflow.create({
        data: {
          brandId,
          name: data.name,
          description: data.description ?? null,
          type: 'CUSTOM',
          isPrebuilt: false,
          config: {
            trigger: data.trigger,
            triggerOptions: data.triggerOptions ?? {},
            dataSources: data.dataSources,
            objectivePrompt: data.objectivePrompt,
            outputSchema: { types: data.outputFormats },
            filters: {},
          },
        },
      })

      return reply.status(201).send({ workflow })
    }
  )

  // ── Update workflow ───────────────────────────────────────────────
  server.patch(
    '/:brandId/agents/workflows/:workflowId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, workflowId } = request.params as { brandId: string; workflowId: string }

      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        isActive: z.boolean().optional(),
        trigger: z.string().optional(),
        dataSources: z.array(z.string()).optional(),
        objectivePrompt: z.string().min(20).max(4000).optional(),
        outputFormat: z.string().optional(),
      })

      const data = schema.parse(request.body)

      const existing = await prisma.agentWorkflow.findFirst({ where: { id: workflowId, brandId } })
      if (!existing) throw new ApiError(404, 'Workflow not found')
      if (existing.isPrebuilt) throw new ApiError(403, 'Pre-built workflows cannot be modified')

      const currentConfig = existing.config as Record<string, unknown>
      const updatedConfig = {
        ...currentConfig,
        ...(data.trigger !== undefined ? { trigger: data.trigger } : {}),
        ...(data.dataSources !== undefined ? { dataSources: data.dataSources } : {}),
        ...(data.objectivePrompt !== undefined ? { objectivePrompt: data.objectivePrompt } : {}),
        ...(data.outputFormat !== undefined ? { outputSchema: { type: data.outputFormat } } : {}),
      }

      const workflow = await prisma.agentWorkflow.update({
        where: { id: workflowId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          config: updatedConfig,
        },
      })

      return { workflow }
    }
  )

  // ── Run workflow ──────────────────────────────────────────────────
  server.post(
    '/:brandId/agents/workflows/:workflowId/run',
    { preHandler: requireBrandAdmin },
    async (request, reply) => {
      const { brandId, workflowId } = request.params as { brandId: string; workflowId: string }

      const workflow = await prisma.agentWorkflow.findFirst({
        where: { id: workflowId, brandId, isActive: true },
      })
      if (!workflow) throw new ApiError(404, 'Workflow not found or inactive')

      // Fire async — run creates its own RUNNING record
      runAgentWorkflow(workflow, brandId).catch(console.error)

      return reply.status(202).send({ status: 'RUNNING' })
    }
  )

  // ── Get run status + output ───────────────────────────────────────
  server.get(
    '/:brandId/agents/runs/:runId',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId, runId } = request.params as { brandId: string; runId: string }

      const run = await prisma.agentRun.findFirst({
        where: {
          id: runId,
          workflow: { brandId },
        },
        include: {
          workflow: { select: { name: true, type: true } },
        },
      })
      if (!run) throw new ApiError(404, 'Run not found')
      return { run }
    }
  )

  // ── List recent runs for a brand ──────────────────────────────────
  server.get(
    '/:brandId/agents/runs',
    { preHandler: requireBrandAdmin },
    async (request) => {
      const { brandId } = request.params as { brandId: string }
      const runs = await prisma.agentRun.findMany({
        where: { workflow: { brandId } },
        include: { workflow: { select: { name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return { runs }
    }
  )
}
