import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { ReputationResult } from '@phishlens/core'

const { default: app } = await import('../src/app.js')
const { allScans } = await import('./helpers.js')
const { keywordsRepo } = await import('../src/repositories/keywords.repo.js')
const { checkReputation } = await import('../src/services/reputation/index.js')
const { signedIn } = await import('./helpers.js')
const { signAccessToken } = await import('../src/lib/tokens.js')
const jwt = (await import('jsonwebtoken')).default

const PHISHING = 'http://secure-paypal-login-free.com'
const SAFE = 'https://github.com/vercel/next.js'
const BANK_EMAIL = 'Your bank account will be suspended. Verify immediately.'

const flagged: ReputationResult[] = [
  { source: 'virustotal', status: 'flagged', summary: '14 / 94 security vendors flagged this URL.' },
  { source: 'safe-browsing', status: 'flagged', summary: 'Listed as SOCIAL_ENGINEERING.' },
]

describe('POST /api/scans/url', () => {
  it('scans anonymously without saving anything', async () => {
    const res = await request(app).post('/api/scans/url').send({ url: PHISHING })
    expect(res.status).toBe(201)
    expect(res.body.scan).toMatchObject({
      type: 'url',
      content: PHISHING,
      riskLevel: 'high',
      riskScore: 72,
      threatStatus: 'Suspicious Website',
      recommendation: 'Avoid Visiting',
    })
    expect(res.body.scan.id).toEqual(expect.any(String))
    expect((await allScans())).toHaveLength(0)
  })

  it('normalizes scheme-less input and asks the reputation services about the normalized URL', async () => {
    const res = await request(app).post('/api/scans/url').send({ url: 'github.com/login' })
    expect(res.body.scan.content).toBe('http://github.com/login')
    expect(checkReputation).toHaveBeenCalledWith('http://github.com/login')
  })

  it('adds reputation results to the score', async () => {
    vi.mocked(checkReputation).mockResolvedValueOnce(flagged)
    const res = await request(app).post('/api/scans/url').send({ url: PHISHING })
    expect(res.body.scan.riskScore).toBe(94)
    expect(res.body.scan.reputation).toEqual(flagged)
    expect(res.body.scan.checks.map((c: { id: string }) => c.id)).toEqual(expect.arrayContaining(['rep-virustotal', 'rep-safe-browsing']))
  })

  it("saves a signed-in user's scan to their history", async () => {
    const { user, cookie } = await signedIn()
    const res = await request(app).post('/api/scans/url').set('Cookie', cookie).send({ url: SAFE })
    expect(res.status).toBe(201)
    expect((await allScans())).toEqual([expect.objectContaining({ id: res.body.scan.id, userId: user.id, riskLevel: 'low' })])
  })

  it.each([
    [{}, /Required/],
    [{ url: '' }, /Enter a URL/],
    [{ url: 'ftp://example.com' }, /Only http/],
    [{ url: 'localhost' }, /full domain/],
  ])('rejects invalid input %j with the same message as the web form', async (body, message) => {
    const res = await request(app).post('/api/scans/url').send(body)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toMatch(message)
    expect(checkReputation).not.toHaveBeenCalled()
  })

  it('answers an expired session with 401 so the client refreshes instead of scanning anonymously', async () => {
    const { user } = await signedIn()
    const expired = jwt.sign({ sub: user.id }, 'test-access-secret', { expiresIn: -10 })
    const res = await request(app).post('/api/scans/url').set('Cookie', `accessToken=${expired}`).send({ url: SAFE })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })

  it('rejects a token whose user id is not a MongoDB id with 401, not a 500', async () => {
    const old = signAccessToken('550e8400-e29b-41d4-a716-446655440000')
    const res = await request(app).post('/api/scans/url').set('Cookie', `accessToken=${old}`).send({ url: SAFE })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
    expect((await request(app).get('/api/scans').set('Cookie', `accessToken=${old}`)).status).toBe(401)
  })

  it('stops suspended and deleted accounts from scanning at once, not when the token expires', async () => {
    const { setUser } = await import('./helpers.js')
    const me = await signedIn()
    await setUser(me.user.id, { status: 'suspended' })
    const suspended = await request(app).post('/api/scans/url').set('Cookie', me.cookie).send({ url: SAFE })
    expect(suspended.status).toBe(403)
    expect(suspended.body.error.code).toBe('ACCOUNT_SUSPENDED')

    const ghost = `accessToken=${signAccessToken('0'.repeat(24))}`
    expect((await request(app).post('/api/scans/url').set('Cookie', ghost).send({ url: SAFE })).status).toBe(401)
    expect((await allScans())).toHaveLength(0)
  })

  it('uses the admin-managed keyword list', async () => {
    await keywordsRepo.add({ term: 'invoice', category: 'url', weight: 30 })
    const res = await request(app).post('/api/scans/url').send({ url: 'https://example.com/invoice' })
    const keywordCheck = res.body.scan.checks.find((c: { id: string }) => c.id === 'keywords')
    expect(keywordCheck.weight).toBe(30)
  })
})

describe('POST /api/scans/email', () => {
  it('analyzes the message without calling the URL reputation services', async () => {
    const res = await request(app).post('/api/scans/email').send({ content: `  ${BANK_EMAIL}  ` })
    expect(res.status).toBe(201)
    expect(res.body.scan).toMatchObject({
      type: 'email',
      content: BANK_EMAIL,
      riskLevel: 'high',
      riskScore: 65,
      threatStatus: 'Possible Phishing Attempt Detected',
    })
    expect(checkReputation).not.toHaveBeenCalled()
  })

  it('requires enough text', async () => {
    const res = await request(app).post('/api/scans/email').send({ content: 'too short' })
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/at least 20 characters/)
  })
})

describe('history, stats and reports', () => {
  async function scanAs(cookie: string, body: { url: string } | { content: string }) {
    const path = 'url' in body ? '/api/scans/url' : '/api/scans/email'
    return (await request(app).post(path).set('Cookie', cookie).send(body)).body.scan
  }

  it('require a session', async () => {
    for (const path of ['/api/scans', '/api/scans/stats', '/api/reports']) {
      expect((await request(app).get(path)).status).toBe(401)
    }
  })

  it('return only the signed-in user’s scans, newest first', async () => {
    const me = await signedIn()
    const other = await signedIn()
    const first = await scanAs(me.cookie, { url: SAFE })
    const second = await scanAs(me.cookie, { url: PHISHING })
    await scanAs(other.cookie, { url: PHISHING })

    const res = await request(app).get('/api/scans').set('Cookie', me.cookie)
    expect(res.body.scans.map((s: { id: string }) => s.id)).toEqual([second.id, first.id])
  })

  it('count scans by risk level and chart today', async () => {
    const me = await signedIn()
    await scanAs(me.cookie, { url: SAFE })
    await scanAs(me.cookie, { url: PHISHING })
    await scanAs(me.cookie, { content: BANK_EMAIL })

    const res = await request(app).get('/api/scans/stats').set('Cookie', me.cookie)
    expect(res.body.stats).toEqual({ total: 3, safe: 1, medium: 0, suspicious: 2 })
    expect(res.body.daily).toHaveLength(14)
    expect(res.body.daily.at(-1)).toMatchObject({ low: 1, medium: 0, high: 2 })
  })

  it('turn flagged scans into reports: one per distinct content, after a summary', async () => {
    const me = await signedIn()
    await scanAs(me.cookie, { url: SAFE })
    await scanAs(me.cookie, { url: PHISHING })
    const again = await scanAs(me.cookie, { url: PHISHING })
    await scanAs(me.cookie, { content: BANK_EMAIL })

    const res = await request(app).get('/api/reports').set('Cookie', me.cookie)
    const reports = res.body.reports
    expect(reports.map((r: { reportType: string }) => r.reportType)).toEqual(['summary', 'scan', 'scan'])
    expect(reports[0].details).toMatch(/^2 distinct threats/)
    const paypal = reports.find((r: { scan?: { content: string } }) => r.scan?.content === PHISHING)
    expect(paypal).toMatchObject({ category: 'brand-impersonation', riskLevel: 'high', scan: { id: again.id } })
  })

  it('show no reports when nothing was flagged', async () => {
    const me = await signedIn()
    await scanAs(me.cookie, { url: SAFE })
    const res = await request(app).get('/api/reports').set('Cookie', me.cookie)
    expect(res.body.reports).toEqual([])
  })
})

