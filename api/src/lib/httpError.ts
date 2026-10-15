import type { z } from 'zod'

// Anything thrown as an HttpError becomes the API's error envelope
//   { "error": { "code", "message", "issues"? } }
// in middlewares/errorHandler.ts — the only place that shape is written.
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: z.core.$ZodIssue[],
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** Validates request input against a schema, or throws a 400 with every issue. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issues = result.error.issues
    throw new HttpError(400, 'VALIDATION_ERROR', issues[0]?.message ?? 'Invalid request', issues)
  }
  return result.data
}
