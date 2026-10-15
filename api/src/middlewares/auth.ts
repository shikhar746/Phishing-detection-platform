import type { Request, Response, NextFunction } from "express"
import { HttpError } from "../lib/httpError.js"
import { verifyAccessToken } from "../lib/tokens.js"
import { usersRepo } from "../repositories/users.repo.js"

function userIdFrom(token: string): string {
  const payload = verifyAccessToken(token)
  // INVALID_TOKEN tells the client to refresh and retry
  if (!payload) throw new HttpError(401, "INVALID_TOKEN", "Session expired")
  return payload.sub
}

/** The request must carry a valid access token. */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies?.accessToken
  if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Not logged in")
  req.userId = userIdFrom(token)
  next()
}

/**
 * Signed-in or anonymous. No token means anonymous, but an expired token is
 * still a 401: the user is signed in and should refresh, not silently lose
 * the work (e.g. a scan that would not be saved to their history).
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies?.accessToken
  if (token) req.userId = userIdFrom(token)
  next()
}

/**
 * Admin only. Role and status are re-read from the database rather than
 * trusted from the token, so demoting or suspending an admin takes effect
 * at once. Use after requireAuth.
 */
export const requireAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  const user = req.userId ? await usersRepo.findById(req.userId) : null
  if (!user || user.role !== "admin" || user.status !== "active") {
    throw new HttpError(403, "FORBIDDEN", "Admins only")
  }
  next()
}
