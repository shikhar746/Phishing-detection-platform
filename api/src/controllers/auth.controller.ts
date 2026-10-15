import type { Request, Response } from "express";
import bcrypt from "bcryptjs"
import { registerSchema, loginSchema, googleAuthSchema } from "../schemas/auth.schema.js"
import { usersRepo, DuplicateEmailError, type PublicUser } from "../repositories/users.repo.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens.js";
import { setAuthCookies, clearAuthCookies } from "../lib/cookies.js";
import { verifyGoogleIdToken, isGoogleSignInEnabled } from "../lib/google.js";
import { HttpError, parse } from "../lib/httpError.js";

// Failures are thrown as HttpError and rendered by the error handler, so each
// controller reads as its happy path.

const notLoggedIn = () => new HttpError(401, "UNAUTHENTICATED", "Not logged in")

/** Suspended accounts can't start or keep a session. */
function assertActive<U extends Pick<PublicUser, "status">>(user: U): U {
    if (user.status !== "active") {
        throw new HttpError(403, "ACCOUNT_SUSPENDED", "This account has been suspended. Contact an administrator.")
    }
    return user
}

const publicFields = ({ id, email, name, role, status }: PublicUser): PublicUser => ({ id, email, name, role, status })

function startSession(res: Response, user: PublicUser) {
    setAuthCookies(res, signAccessToken(user.id), signRefreshToken(user.id))
}

export const registerController = async (req: Request, res: Response) => {
    const data = parse(registerSchema, req.body)
    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await usersRepo.create({ email: data.email, name: data.name, passwordHash }).catch((err) => {
        throw err instanceof DuplicateEmailError
            ? new HttpError(409, "EMAIL_ALREADY_IN_USE", "Email already registered")
            : err
    })

    startSession(res, user)
    res.status(201).json({ user })
}

export const loginController = async (req: Request, res: Response) => {
    const data = parse(loginSchema, req.body)
    const user = await usersRepo.findByEmail(data.email)

    // an account created through Google has no password_hash — there is nothing
    // to compare against, and bcrypt throws on a null hash
    const ok = user?.password_hash ? await bcrypt.compare(data.password, user.password_hash) : false
    if (!user || !ok) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password")

    // checked after the password, so suspension isn't revealed to guessers
    const publicUser = publicFields(assertActive(user))
    startSession(res, publicUser)
    res.status(200).json({ user: publicUser })
}

export const googleAuthController = async (req: Request, res: Response) => {
    if (!isGoogleSignInEnabled()) {
        throw new HttpError(501, "GOOGLE_SIGNIN_DISABLED", "Google sign-in is not configured on this server")
    }
    const { credential } = parse(googleAuthSchema, req.body)

    const profile = await verifyGoogleIdToken(credential)
    if (!profile) throw new HttpError(401, "INVALID_GOOGLE_TOKEN", "Could not verify Google sign-in")

    // 1. returning Google user — matched on the stable "sub", not the email,
    //    because a Google address can be reassigned but the sub never is
    const byGoogleId = await usersRepo.findByGoogleId(profile.googleId)
    if (byGoogleId) {
        startSession(res, assertActive(byGoogleId))
        return res.status(200).json({ user: byGoogleId })
    }

    // 2. same address already registered with a password — link the two so the
    //    user keeps their existing scan history instead of getting a second
    //    account. Safe because we only get here for a Google-verified address.
    const byEmail = await usersRepo.findByEmail(profile.email)
    if (byEmail) {
        // Already linked to a different Google identity: the address now
        // belongs to someone else (e.g. a reassigned Gmail). Overwriting the
        // link would hand them this account.
        if (byEmail.google_id && byEmail.google_id !== profile.googleId) {
            throw new HttpError(409, "GOOGLE_ACCOUNT_MISMATCH", "This email is linked to a different Google account. Sign in with your password instead.")
        }
        assertActive(byEmail)
        const linked = await usersRepo.linkGoogle(byEmail.id, profile.googleId, profile.imageUrl)
        startSession(res, linked)
        return res.status(200).json({ user: linked })
    }

    // 3. brand new account — no password_hash, Google is the only way in
    const created = await usersRepo.create({
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        imageUrl: profile.imageUrl,
    })
    startSession(res, created)
    return res.status(201).json({ user: created })
}

export const meController = async (req: Request, res: Response) => {
    const user = req.userId ? await usersRepo.findById(req.userId) : null
    if (!user) throw notLoggedIn()
    res.status(200).json({ user: assertActive(user) })
}

export const refreshController = async (req: Request, res: Response) => {
    const refreshToken: string | undefined = req.cookies?.refreshToken
    if (!refreshToken) throw new HttpError(401, "NO_REFRESH_TOKEN", "No refresh token provided")

    const payload = verifyRefreshToken(refreshToken)
    if (!payload) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Session expired")

    const user = await usersRepo.findById(payload.sub)
    if (!user) throw notLoggedIn()

    // rotate both tokens on every refresh
    startSession(res, assertActive(user))
    res.status(200).json({ user })
}

export const logoutController = async (_req: Request, res: Response) => {
    clearAuthCookies(res)
    res.status(200).json({ success: true })
}
