import type { Request, Response, NextFunction } from "express"
import { HttpError } from "../lib/httpError.js"
import { verifyAccessToken } from "../lib/tokens.js"

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies?.accessToken
  if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Not logged in")

  const payload = verifyAccessToken(token)
  if (!payload) throw new HttpError(401, "INVALID_TOKEN", "Session expired")

  req.userId = payload.sub
  next()
}
