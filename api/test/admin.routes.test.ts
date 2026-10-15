import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

const { default: app } = await import('../src/app.js')
const { keywordsRepo, setUser } = await import('./fakes/db.js')
const { signedIn } = await import('./helpers.js')

async function scan(cookie: string, url: string) {
  return request(app).post('/api/scans/url').set('Cookie', cookie).send({ url })
}

describe('admin access', () => {
  it('requires a session, then the admin role', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401)
    const member = await signedIn('user')
    const res = await request(app).get('/api/admin/users').set('Cookie', member.cookie)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('re-checks the role on every request, so demotion takes effect at once', async () => {
    const admin = await signedIn('admin')
    expect((await request(app).get('/api/admin/users').set('Cookie', admin.cookie)).status).toBe(200)
    setUser(admin.user.id, { role: 'user' })
    expect((await request(app).get('/api/admin/users').set('Cookie', admin.cookie)).status).toBe(403)
  })

  it('locks out suspended admins', async () => {
    const admin = await signedIn('admin')
    setUser(admin.user.id, { status: 'suspended' })
    expect((await request(app).get('/api/admin/logs').set('Cookie', admin.cookie)).status).toBe(403)
  })
})

describe('GET /api/admin/analytics', () => {
  it('summarizes users, scans and keywords across the platform', async () => {
    const admin = await signedIn('admin')
    const member = await signedIn('user')
    setUser(member.user.id, { status: 'suspended' })
    await scan(admin.cookie, 'https://github.com')
    await scan(admin.cookie, 'http://secure-paypal-login-free.com')
    await keywordsRepo.add({ term: 'invoice', category: 'url', weight: 20 })

    const res = await request(app).get('/api/admin/analytics').set('Cookie', admin.cookie)
    expect(res.status).toBe(200)
    expect(res.body.analytics).toEqual({
      totalUsers: 2,
      activeUsers: 1,
      scansToday: 2,
      threatsDetected: 1,
      detectionRate: 50,
      activeKeywords: 1,
    })
    expect(res.body.daily.at(-1)).toMatchObject({ low: 1, high: 1 })
  })
})

describe('user management', () => {
  it('lists users with their scan counts', async () => {
    const admin = await signedIn('admin')
    await scan(admin.cookie, 'https://github.com')
    const res = await request(app).get('/api/admin/users').set('Cookie', admin.cookie)
    expect(res.body.users).toEqual([
      expect.objectContaining({ id: admin.user.id, role: 'admin', status: 'active', scans: 1, lastActive: expect.any(String) }),
    ])
  })

  it('changes another user’s role and status', async () => {
    const admin = await signedIn('admin')
    const member = await signedIn('user')
    const res = await request(app)
      .patch(`/api/admin/users/${member.user.id}`)
      .set('Cookie', admin.cookie)
      .send({ role: 'admin', status: 'suspended' })
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ id: member.user.id, role: 'admin', status: 'suspended' })
  })

  it('refuses to let admins change themselves', async () => {
    const admin = await signedIn('admin')
    const res = await request(app).patch(`/api/admin/users/${admin.user.id}`).set('Cookie', admin.cookie).send({ role: 'user' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CANNOT_CHANGE_SELF')
  })

  it.each([
    [{}, 'VALIDATION_ERROR'],
    [{ role: 'owner' }, 'VALIDATION_ERROR'],
    [{ role: 'user', name: 'x' }, 'VALIDATION_ERROR'],
  ])('validates the patch %j', async (body, code) => {
    const admin = await signedIn('admin')
    const member = await signedIn('user')
    const res = await request(app).patch(`/api/admin/users/${member.user.id}`).set('Cookie', admin.cookie).send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe(code)
  })

  it('answers unknown and malformed ids', async () => {
    const admin = await signedIn('admin')
    const missing = await request(app).patch(`/api/admin/users/${randomUUID()}`).set('Cookie', admin.cookie).send({ role: 'user' })
    expect(missing.status).toBe(404)
    const malformed = await request(app).patch('/api/admin/users/not-a-uuid').set('Cookie', admin.cookie).send({ role: 'user' })
    expect(malformed.status).toBe(400)
  })
})

describe('detection logs', () => {
  it('show every user’s scans, newest first', async () => {
    const admin = await signedIn('admin')
    const member = await signedIn('user')
    const a = (await scan(member.cookie, 'https://github.com')).body.scan
    const b = (await scan(admin.cookie, 'http://secure-paypal-login-free.com')).body.scan
    const res = await request(app).get('/api/admin/logs').set('Cookie', admin.cookie)
    expect(res.body.scans.map((s: { id: string }) => s.id)).toEqual([b.id, a.id])
    expect(res.body.scans[1].userId).toBe(member.user.id)
  })
})

describe('keyword management', () => {
  it('adds a normalized keyword and uses it in the very next scan', async () => {
    const admin = await signedIn('admin')
    const before = (await scan(admin.cookie, 'https://example.com/invoice')).body.scan
    expect(before.checks.find((c: { id: string }) => c.id === 'keywords').weight).toBe(0)

    const res = await request(app).post('/api/admin/keywords').set('Cookie', admin.cookie).send({ term: '  Invoice ', category: 'url', weight: 25 })
    expect(res.status).toBe(201)
    expect(res.body.keyword).toMatchObject({ term: 'invoice', category: 'url', weight: 25 })

    const after = (await scan(admin.cookie, 'https://example.com/invoice')).body.scan
    expect(after.checks.find((c: { id: string }) => c.id === 'keywords').weight).toBe(25)
  })

  it('rejects duplicates and invalid keywords', async () => {
    const admin = await signedIn('admin')
    const body = { term: 'invoice', category: 'url', weight: 25 }
    await request(app).post('/api/admin/keywords').set('Cookie', admin.cookie).send(body)
    const dup = await request(app).post('/api/admin/keywords').set('Cookie', admin.cookie).send(body)
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('KEYWORD_EXISTS')
    for (const bad of [{ ...body, term: 'ab' }, { ...body, category: 'other' }, { ...body, weight: 0 }, { ...body, weight: 2.5 }]) {
      expect((await request(app).post('/api/admin/keywords').set('Cookie', admin.cookie).send(bad)).status).toBe(400)
    }
  })

  it('removes keywords and reports unknown ones', async () => {
    const admin = await signedIn('admin')
    const { keyword } = (await request(app).post('/api/admin/keywords').set('Cookie', admin.cookie).send({ term: 'invoice', category: 'url', weight: 25 })).body
    expect((await request(app).delete(`/api/admin/keywords/${keyword.id}`).set('Cookie', admin.cookie)).status).toBe(204)
    expect((await request(app).get('/api/admin/keywords').set('Cookie', admin.cookie)).body.keywords).toEqual([])
    expect((await request(app).delete(`/api/admin/keywords/${keyword.id}`).set('Cookie', admin.cookie)).status).toBe(404)
  })
})
