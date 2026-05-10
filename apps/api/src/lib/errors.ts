import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'

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
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  console.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
}
