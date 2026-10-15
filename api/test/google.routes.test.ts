import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GoogleProfile } from '../src/lib/google.js'

vi.mock('../src/lib/google.js', () => ({
  isGoogleSignInEnabled: vi.fn(() => true),
  verifyGoogleIdToken: vi.fn(),
}))

const { default: app } = await import('../src/app.js')
const google = await import('../src/lib/google.js')
const { getUserRow: getRow, usersRepo } = await import('./fakes/db.js')

const credential = 'header.payload.signature-from-google-identity-services'
const profile: GoogleProfile = {
  googleId: 'google-sub-123',
  email: 'ananya@example.com',
  name: 'Ananya Iyer',
  imageUrl: 'https://example.com/a.png',
}

beforeEach(() => {
  vi.mocked(google.isGoogleSignInEnabled).mockReturnValue(true)
  vi.mocked(google.verifyGoogleIdToken).mockReset()
})

describe('POST /api/auth/google', () => {
  it('returns 501 when Google sign-in is not configured', async () => {
    vi.mocked(google.isGoogleSignInEnabled).mockReturnValue(false)
    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(501)
    expect(res.body.error.code).toBe('GOOGLE_SIGNIN_DISABLED')
  })

  it('validates the body', async () => {
    const res = await request(app).post('/api/auth/google').send({})
    expect(res.status).toBe(400)
    expect(google.verifyGoogleIdToken).not.toHaveBeenCalled()
  })

  it('rejects a credential Google does not verify', async () => {
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(null)
    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN')
  })

  it('creates a new account for a first-time Google user', async () => {
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)
    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: profile.email, name: profile.name, role: 'user' })
    expect(google.verifyGoogleIdToken).toHaveBeenCalledWith(credential)

    const row = getRow(res.body.user.id)!
    expect(row.google_id).toBe(profile.googleId)
    expect(row.password_hash).toBeNull()
    expect(String(res.headers['set-cookie'])).toMatch(/accessToken=/)
  })

  it('signs a returning Google user into the same account', async () => {
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)
    const first = await request(app).post('/api/auth/google').send({ credential })
    const second = await request(app).post('/api/auth/google').send({ credential })
    expect(second.status).toBe(200)
    expect(second.body.user.id).toBe(first.body.user.id)
  })

  it('matches returning users on Google id even if their email changed', async () => {
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)
    const first = await request(app).post('/api/auth/google').send({ credential })
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue({ ...profile, email: 'new-address@example.com' })
    const second = await request(app).post('/api/auth/google').send({ credential })
    expect(second.body.user.id).toBe(first.body.user.id)
  })

  it('refuses to re-link an account already tied to a different Google identity', async () => {
    const existing = await usersRepo.create({ email: profile.email, name: 'Ananya', googleId: 'original-google-sub' })
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue({ ...profile, googleId: 'someone-elses-sub' })

    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('GOOGLE_ACCOUNT_MISMATCH')
    expect(getRow(existing.id)!.google_id).toBe('original-google-sub')
    expect(String(res.headers['set-cookie'] ?? '')).not.toMatch(/accessToken=/)
  })

  it('refuses suspended accounts', async () => {
    const { setUser } = await import('./fakes/db.js')
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)
    const first = await request(app).post('/api/auth/google').send({ credential })
    setUser(first.body.user.id, { status: 'suspended' })
    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('links Google to an existing password account with the same email', async () => {
    const existing = await usersRepo.create({ email: profile.email, name: 'Ananya', passwordHash: '$2b$10$hash' })
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)

    const res = await request(app).post('/api/auth/google').send({ credential })
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(existing.id)
    expect(getRow(existing.id)!.google_id).toBe(profile.googleId)
    // the password still works afterwards
    expect(getRow(existing.id)!.password_hash).toBe('$2b$10$hash')
  })

  it('lets the new Google session call /me', async () => {
    vi.mocked(google.verifyGoogleIdToken).mockResolvedValue(profile)
    const agent = request.agent(app)
    await agent.post('/api/auth/google').send({ credential })
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe(profile.email)
  })
})
