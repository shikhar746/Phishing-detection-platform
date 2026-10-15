import type { Response } from "express"
import { env } from "../config/env.js"

const base = {
  httpOnly: true,
  // SameSite=None is only accepted by browsers on Secure cookies
  secure: env.NODE_ENV === 'production' || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, { ...base, maxAge: env.ACCESS_TOKEN_TTL.ms })
  res.cookie('refreshToken', refreshToken, {
    ...base,
    path: '/api/auth/refresh',
    maxAge: env.REFRESH_TOKEN_TTL.ms,
  })
}

export function clearAuthCookies(res: Response) {
  // a browser only drops a cookie when the clearing Set-Cookie repeats the
  // attributes it was written with — miss secure/sameSite in production and
  // logout leaves the session cookie alive
  res.clearCookie("accessToken", { ...base, path: "/" })
  res.clearCookie("refreshToken", { ...base, path: "/api/auth/refresh" })
}
