import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // A malformed request is the caller's problem, not ours. Without this a
  // brand integrating against the public API sees 500 for their own typo
  // and reasonably assumes Halite is down.
  if (error instanceof ZodError) {
    const issues = error.issues.map(i => ({
      field: i.path.join('.') || undefined,
      message: i.message,
    }))
    return reply.status(400).send({
      error: issues[0]?.field
        ? `${issues[0].field}: ${issues[0].message}`
        : issues[0]?.message ?? 'Invalid request',
      issues,
    })
  }
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  console.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
}
