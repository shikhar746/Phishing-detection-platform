import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/repositories/users.repo.js', () => import('./fakes/usersRepo.js'))

const { default: app } = await import('../src/app.js')
const { resetUsers, getRow } = await import('./fakes/usersRepo.js')
const { signAccessToken, signRefreshToken } = await import('../src/lib/tokens.js')

const valid = { name: 'Priya Nair', email: 'Priya@Example.com', password: 'hunter2hunter' }

function cookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'] as unknown as string[] | string | undefined
  return raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]
}

function cookieNamed(res: request.Response, name: string) {
  return cookies(res).find((c) => c.startsWith(`${name}=`))
}

beforeEach(() => {
  resetUsers()
})

describe('app wiring', () => {
  it('answers the health check', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns the JSON error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('allows the web origin with credentials', async () => {
    const res = await request(app).options('/api/auth/login').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('answers malformed JSON with a 400, not a 500', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })

  it('hides unexpected failures behind a generic 500', async () => {
    const { usersRepo } = await import('./fakes/usersRepo.js')
    const spy = vi.spyOn(usersRepo, 'findByEmail').mockRejectedValueOnce(new Error('connection reset'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'x' })
    expect(res.status).toBe(500)
    expect(res.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Something went wrong' })
    spy.mockRestore()
    log.mockRestore()
  })

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })
})

describe('POST /api/auth/register', () => {
  it('creates the account, normalizes the email and starts a session', async () => {
    const res = await request(app).post('/api/auth/register').send(valid)
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'priya@example.com', name: 'Priya Nair', role: 'user' })
    expect(res.body.user).not.toHaveProperty('password_hash')

    const access = cookieNamed(res, 'accessToken')
    const refresh = cookieNamed(res, 'refreshToken')
    expect(access).toMatch(/HttpOnly/i)
    expect(refresh).toMatch(/Path=\/api\/auth\/refresh/)
  })

  it('stores a bcrypt hash, never the password', async () => {
    const res = await request(app).post('/api/auth/register').send(valid)
    const row = getRow(res.body.user.id)!
    expect(row.password_hash).not.toBe(valid.password)
    expect(row.password_hash).toMatch(/^\$2[aby]\$/)
  })

  it.each([
    [{ ...valid, email: 'not-an-email' }, 'email'],
    [{ ...valid, password: 'short1' }, 'password'],
    [{ ...valid, password: 'lettersonly' }, 'password'],
    [{ ...valid, name: 'A' }, 'name'],
  ])('rejects invalid input (%o)', async (body, field) => {
    const res = await request(app).post('/api/auth/register').send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.issues[0].path).toEqual([field])
    expect(cookies(res)).toHaveLength(0)
  })

  it('returns 409 for an address that is already registered', async () => {
    await request(app).post('/api/auth/register').send(valid)
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'priya@example.com' })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_IN_USE')
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(valid)
  })

  it('signs in with the right password (email is case-insensitive)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'PRIYA@example.com', password: valid.password })
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('priya@example.com')
    expect(cookieNamed(res, 'accessToken')).toBeDefined()
  })

  it('rejects a wrong password with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'wrong-pass-1' })
    expect(res.status).toBe(401)
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
  })

  it('gives an unknown email the same response as a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever1' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('rejects password login for a Google-only account', async () => {
    const { usersRepo } = await import('./fakes/usersRepo.js')
    await usersRepo.create({ email: 'g@example.com', name: 'G', googleId: 'google-sub-1' })
    const res = await request(app).post('/api/auth/login').send({ email: 'g@example.com', password: 'anything1' })
    expect(res.status).toBe(401)
  })

  it('validates the body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: valid.email })
    expect(res.status).toBe(400)
  })
})

describe('session endpoints', () => {
  it('GET /me returns 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('GET /me returns 401 for a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'accessToken=not.a.jwt')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })

  it('GET /me returns the signed-in user', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/register').send(valid)
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('priya@example.com')
  })

  it('GET /me returns 401 when the user no longer exists', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `accessToken=${signAccessToken('deleted-user')}`)
    expect(res.status).toBe(401)
  })

  it('POST /refresh rotates the tokens', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/register').send(valid)
    const res = await agent.post('/api/auth/refresh')
    expect(res.status).toBe(200)
    expect(cookieNamed(res, 'accessToken')).toBeDefined()
    expect(cookieNamed(res, 'refreshToken')).toBeDefined()
  })

  it('POST /refresh rejects a missing or invalid refresh token', async () => {
    expect((await request(app).post('/api/auth/refresh')).body.error.code).toBe('NO_REFRESH_TOKEN')
    const bad = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${signAccessToken('user-1')}`)
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('POST /refresh rejects a token for a deleted user', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${signRefreshToken('ghost')}`)
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('POST /logout clears both cookies with matching paths', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(cookieNamed(res, 'accessToken')).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect(cookieNamed(res, 'refreshToken')).toMatch(/Path=\/api\/auth\/refresh/)
  })
})
