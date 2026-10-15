import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/repositories/users.repo.js', () => import('./fakes/usersRepo.js'))

const { default: app } = await import('../src/app.js')
const { resetUsers, usersRepo } = await import('./fakes/usersRepo.js')
const { signAccessToken } = await import('../src/lib/tokens.js')

let auth: string

beforeEach(async () => {
  resetUsers()
  const me = await usersRepo.create({ email: 'me@example.com', name: 'Me', passwordHash: '$2b$10$secret' })
  await usersRepo.create({ email: 'liam@example.com', name: 'Liam Becker', passwordHash: '$2b$10$other' })
  auth = `accessToken=${signAccessToken(me.id)}`
})

describe('GET /api/users/lookup', () => {
  it('requires a session', async () => {
    const res = await request(app).get('/api/users/lookup?email=liam@example.com')
    expect(res.status).toBe(401)
  })

  it('finds an exact address without exposing secrets', async () => {
    const res = await request(app).get('/api/users/lookup?email=LIAM@example.com').set('Cookie', auth)
    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({ id: expect.any(String), email: 'liam@example.com', name: 'Liam Becker' })
  })

  it('does not match partial addresses', async () => {
    const res = await request(app).get('/api/users/lookup?email=liam@example').set('Cookie', auth)
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown address', async () => {
    const res = await request(app).get('/api/users/lookup?email=nobody@example.com').set('Cookie', auth)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('USER_NOT_FOUND')
  })
})
