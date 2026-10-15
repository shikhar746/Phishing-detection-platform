import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

// The whole app end to end (reputation services stay stubbed: no network in tests).

const { default: app } = await import('../src/app.js')
const { UserModel } = await import('../src/models/user.model.js')


describe('end to end with MongoDB', () => {
  it('registers, scans, keeps history and reports, and serves the admin dashboard', async () => {
    const agent = request.agent(app)
    const reg = await agent.post('/api/auth/register').send({ name: 'Priya Nair', email: 'priya@example.com', password: 'hunter2hunter' })
    expect(reg.status).toBe(201)

    const phishing = await agent.post('/api/scans/url').send({ url: 'http://secure-paypal-login-free.com' })
    expect(phishing.body.scan).toMatchObject({ riskLevel: 'high', riskScore: 72, userId: reg.body.user.id })
    await agent.post('/api/scans/url').send({ url: 'https://github.com' })
    await agent.post('/api/scans/email').send({ content: 'Your bank account will be suspended. Verify immediately.' })

    const history = await agent.get('/api/scans')
    expect(history.body.scans).toHaveLength(3)
    expect((await agent.get('/api/scans/stats')).body.stats).toEqual({ total: 3, safe: 1, medium: 0, suspicious: 2 })

    const reports = (await agent.get('/api/reports')).body.reports
    expect(reports.map((r: { reportType: string }) => r.reportType)).toEqual(['summary', 'scan', 'scan'])

    // promote to admin directly in the database, as `npm run seed -- --admin` does
    await UserModel.updateOne({ email: 'priya@example.com' }, { role: 'admin' })
    const users = (await agent.get('/api/admin/users')).body.users
    expect(users).toEqual([expect.objectContaining({ email: 'priya@example.com', role: 'admin', scans: 3 })])

    const kw = await agent.post('/api/admin/keywords').send({ term: 'invoice', category: 'url', weight: 25 })
    expect(kw.status).toBe(201)
    const rescan = await agent.post('/api/scans/url').send({ url: 'https://example.com/invoice' })
    expect(rescan.body.scan.checks.find((c: { id: string }) => c.id === 'keywords').weight).toBe(25)

    const analytics = (await agent.get('/api/admin/analytics')).body.analytics
    expect(analytics).toMatchObject({ totalUsers: 1, activeUsers: 1, scansToday: 4, threatsDetected: 2, activeKeywords: 1 })
  })

  it('keeps one account per email even under concurrent sign-ups', async () => {
    const body = { name: 'Race', email: 'race@example.com', password: 'hunter2hunter' }
    const results = await Promise.all([1, 2, 3].map(() => request(app).post('/api/auth/register').send(body)))
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409])
    expect(await UserModel.countDocuments({ email: 'race@example.com' })).toBe(1)
  })
})
