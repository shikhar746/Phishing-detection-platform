import type { Request, Response, NextFunction } from "express"
import { isObjectId } from "../lib/db.js"
import { HttpError } from "../lib/httpError.js"
import { verifyAccessToken } from "../lib/tokens.js"
import { usersRepo, type PublicUser } from "../repositories/users.repo.js"

/**
 * The account behind an access token, re-read on every request so that
 * suspending, demoting or deleting an account takes effect immediately —
 * not when the token expires.
 */
async function activeUserFrom(token: string): Promise<PublicUser> {
  const payload = verifyAccessToken(token)
  // INVALID_TOKEN tells the client to refresh and retry. A sub that isn't an
  // ObjectId (e.g. a token from before the MongoDB migration) is just as invalid.
  if (!payload || !isObjectId(payload.sub)) throw new HttpError(401, "INVALID_TOKEN", "Session expired")

  const user = await usersRepo.findById(payload.sub)
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Not logged in")
  if (user.status !== "active") {
    throw new HttpError(403, "ACCOUNT_SUSPENDED", "This account has been suspended. Contact an administrator.")
  }
  return user
}

function signIn(req: Request, user: PublicUser) {
  req.user = user
  req.userId = user.id
}

/** The request must come from a signed-in, active account. */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies?.accessToken
  if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Not logged in")
  signIn(req, await activeUserFrom(token))
  next()
}

/**
 * Signed-in or anonymous. No token means anonymous, but an expired token is
 * still a 401: the user is signed in and should refresh, not silently lose
 * the work (e.g. a scan that would not be saved to their history).
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies?.accessToken
  if (token) signIn(req, await activeUserFrom(token))
  next()
}

/** Admin only. Use after requireAuth, which has already loaded the current account. */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") throw new HttpError(403, "FORBIDDEN", "Admins only")
  next()
}
