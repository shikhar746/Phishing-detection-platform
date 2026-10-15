import request from 'supertest'
import { describe, expect, it } from 'vitest'

// env.ts reads the limit when the app is first imported in this file
process.env.SCAN_RATE_LIMIT_MAX = '3'
const { default: app } = await import('../src/app.js')
const { signedIn } = await import('./helpers.js')

const SAFE = { url: 'https://github.com' }

describe('scan rate limit', () => {
  it('gives each signed-in user their own bucket', async () => {
    const me = await signedIn()
    const other = await signedIn()
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/scans/url').set('Cookie', me.cookie).send(SAFE)).status).toBe(201)
    }
    const blocked = await request(app).post('/api/scans/url').set('Cookie', me.cookie).send(SAFE)
    expect(blocked.status).toBe(429)
    expect(blocked.body.error).toMatchObject({ code: 'TOO_MANY_SCANS' })
    expect((await request(app).post('/api/scans/url').set('Cookie', other.cookie).send(SAFE)).status).toBe(201)
  })

  it('ignores X-Forwarded-For when no proxy is configured, so clients cannot dodge the limit', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/scans/url').set('X-Forwarded-For', `10.0.0.${i}`).send(SAFE)
    }
    const res = await request(app).post('/api/scans/url').set('X-Forwarded-For', '10.0.0.99').send(SAFE)
    expect(res.status).toBe(429)
  })
})
