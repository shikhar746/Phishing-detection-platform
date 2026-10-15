import rateLimit from 'express-rate-limit'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { HttpError } from '../lib/httpError.js'

// rate limiting for the endpoints where guessing is the attack
function limiter(code: string, message: string) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    // Only failures count. Someone signing in correctly ten times in a row is
    // not an attack, and burning their quota would lock out the legitimate
    // case while barely inconveniencing the brute-force one.
    skipSuccessfulRequests: true,
    // the app's error envelope, so the client parses this like any other failure
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new HttpError(429, code, message))
    },
  })
}

/** Sign-in, registration, and Google exchange: the password-guessing surface. */
export const authLimiter = limiter(
  'TOO_MANY_ATTEMPTS',
  'Too many attempts. Wait a few minutes and try again.'
)

/**
 * Public share links. A password-protected link is a bearer credential with a
 * short password behind it, which is exactly the shape brute force likes.
 */
export const publicShareLimiter = limiter(
  'TOO_MANY_ATTEMPTS',
  'Too many attempts for this link. Wait a few minutes and try again.'
)
