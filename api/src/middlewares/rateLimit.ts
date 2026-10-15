import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { HttpError } from '../lib/httpError.js'

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000

function limiter(code: string, message: string, options: Partial<Options>) {
  return rateLimit({
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    // the app's error envelope, so the client parses this like any other failure
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new HttpError(429, code, message))
    },
    ...options,
  })
}

/**
 * Sign-in, registration, and Google exchange: the password-guessing surface.
 * Only failures count — someone signing in correctly ten times in a row is
 * not an attack, and burning their quota would lock out the legitimate case.
 */
export const authLimiter = limiter('TOO_MANY_ATTEMPTS', 'Too many attempts. Wait a few minutes and try again.', {
  limit: env.RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
})

/**
 * Scans call VirusTotal and Safe Browsing, whose free tiers are small, so
 * every scan counts. Signed-in users get their own bucket; anonymous scans
 * share one per IP.
 */
export const scanLimiter = limiter('TOO_MANY_SCANS', 'You have reached the scan limit. Try again in a few minutes.', {
  limit: env.SCAN_RATE_LIMIT_MAX,
  keyGenerator: (req: Request) => (req.userId ? `user:${req.userId}` : `ip:${ipKeyGenerator(req.ip ?? '')}`),
})
