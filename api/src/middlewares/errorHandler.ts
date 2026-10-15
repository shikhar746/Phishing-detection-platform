import type { Request, Response, NextFunction } from 'express'
import { HttpError } from '../lib/httpError.js'

function send(res: Response, err: HttpError) {
  const { code, message, issues } = err
  return res.status(err.status).json({ error: issues ? { code, message, issues } : { code, message } })
}

// express.json() (body-parser) rejects bad requests with http-errors that
// carry a 4xx `status` and a `type`, e.g. malformed JSON (400), a body over
// the size limit (413) or an unsupported charset (415).
const BODY_ERRORS: Record<string, [code: string, message: string]> = {
  'entity.parse.failed': ['INVALID_JSON', 'Request body is not valid JSON'],
  'entity.too.large': ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
}

function clientError(err: unknown): HttpError | null {
  if (typeof err !== 'object' || err === null) return null
  const { status, type, expose, message } = err as { status?: unknown; type?: unknown; expose?: unknown; message?: unknown }
  if (typeof status !== 'number' || status < 400 || status >= 500 || expose !== true) return null
  const [code, text] = BODY_ERRORS[String(type)] ?? ['BAD_REQUEST', typeof message === 'string' ? message : 'Bad request']
  return new HttpError(status, code, text)
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) return send(res, err)

  const client = clientError(err)
  if (client) return send(res, client)

  console.error('unhandled error', err)
  return send(res, new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong'))
}
