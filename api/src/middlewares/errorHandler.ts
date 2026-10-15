import { MulterError } from 'multer'
import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env.js'
import { HttpError } from '../lib/httpError.js'

function send(res: Response, err: HttpError) {
  const { code, message, issues } = err
  return res.status(err.status).json({ error: issues ? { code, message, issues } : { code, message } })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) return send(res, err)

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return send(res, new HttpError(413, 'FILE_TOO_LARGE', `File exceeds the ${env.MAX_FILE_SIZE_BYTES} byte limit`))
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return send(res, new HttpError(400, 'UNEXPECTED_FIELD', "Use the field name 'file'"))
    }
    return send(res, new HttpError(400, 'UPLOAD_ERROR', err.message))
  }

  // express.json() rejects malformed bodies with a 400-status SyntaxError
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    return send(res, new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON'))
  }

  console.error('unhandled error', err)
  return send(res, new HttpError(500, 'INTERNAL_ERROR', 'Something went wrong'))
}
