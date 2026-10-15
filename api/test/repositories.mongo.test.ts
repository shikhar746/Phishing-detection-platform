import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_KEYWORDS, type ScanResult } from '@phishlens/core'
import { useRealMongo } from './mongo.js'

// test/setup.ts swaps the repositories for fakes; these tests want the real ones.
vi.unmock('../src/repositories/users.repo.js')
vi.unmock('../src/repositories/scans.repo.js')
vi.unmock('../src/repositories/reports.repo.js')
vi.unmock('../src/repositories/keywords.repo.js')

const { usersRepo, DuplicateEmailError } = await import('../src/repositories/users.repo.js')
const { scansRepo } = await import('../src/repositories/scans.repo.js')
const { reportsRepo } = await import('../src/repositories/reports.repo.js')
const { keywordsRepo, DuplicateKeywordError } = await import('../src/repositories/keywords.repo.js')

useRealMongo()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function unsaved(riskLevel: ScanResult['riskLevel'], content = `https://example.com/${riskLevel}`) {
  return {
    type: 'url' as const,
    content,
    riskLevel,
    riskScore: { low: 5, medium: 40, high: 80 }[riskLevel],
    threatStatus: 'status',
    recommendation: 'recommendation',
    checks: [{ id: 'https', label: 'HTTPS', detail: 'd', severity: 'fail' as const, weight: 20 }],
    reputation: [{ source: 'virustotal' as const, status: 'clean' as const, summary: 's' }],
  }
}
const report = { category: 'brand-impersonation' as const, title: 'Brand impersonation: example.com', details: 'details' }

describe('usersRepo', () => {
  it('creates and finds accounts, normalizing email', async () => {
    const created = await usersRepo.create({ email: 'Priya@Example.com', name: 'Priya', passwordHash: 'hash' })
    expect(created).toEqual({ id: expect.stringMatching(/^[a-f\d]{24}$/), email: 'priya@example.com', name: 'Priya', role: 'user', status: 'active' })
    expect(await usersRepo.findById(created.id)).toEqual(created)
    expect(await usersRepo.findByEmail('PRIYA@example.com')).toMatchObject({ id: created.id, passwordHash: 'hash', googleId: null })
  })

  it('enforces one account per email', async () => {
    await usersRepo.create({ email: 'a@example.com', name: 'A' })
    await expect(usersRepo.create({ email: 'a@example.com', name: 'B' })).rejects.toBeInstanceOf(DuplicateEmailError)
  })

  it('allows many accounts without Google but each Google id only once', async () => {
    await usersRepo.create({ email: 'one@example.com', name: 'One' })
    await usersRepo.create({ email: 'two@example.com', name: 'Two' })
    await usersRepo.create({ email: 'g1@example.com', name: 'G', googleId: 'sub-1' })
    await expect(usersRepo.create({ email: 'g2@example.com', name: 'G', googleId: 'sub-1' })).rejects.toThrow()
    expect(await usersRepo.findByGoogleId('sub-1')).toMatchObject({ email: 'g1@example.com' })
  })

  it('treats malformed or unknown ids as not found', async () => {
    expect(await usersRepo.findById('user-1')).toBeNull()
    expect(await usersRepo.findById('0'.repeat(24))).toBeNull()
    expect(await usersRepo.update('nope', { role: 'admin' })).toBeNull()
  })

  it('links Google, updates role and status, and counts accounts', async () => {
    const u = await usersRepo.create({ email: 'u@example.com', name: 'U', passwordHash: 'h' })
    await usersRepo.linkGoogle(u.id, 'sub-9', 'https://example.com/p.png')
    expect(await usersRepo.findByEmail('u@example.com')).toMatchObject({ googleId: 'sub-9', passwordHash: 'h' })

    const updated = await usersRepo.update(u.id, { role: 'admin', status: undefined })
    expect(updated).toMatchObject({ role: 'admin', status: 'active', scans: 0 })
    await usersRepo.update(u.id, { status: 'suspended' })
    expect(await usersRepo.counts()).toEqual({ total: 1, active: 0 })
  })

  it('lists users newest first with scan counts and last activity', async () => {
    const older = await usersRepo.create({ email: 'old@example.com', name: 'Old' })
    await sleep(5)
    const newer = await usersRepo.create({ email: 'new@example.com', name: 'New' })
    await scansRepo.record(older.id, unsaved('low'), null)
    const scan = await scansRepo.record(older.id, unsaved('high'), report)

    const list = await usersRepo.listOverview()
    expect(list.map((u) => u.id)).toEqual([newer.id, older.id])
    expect(list[1]).toMatchObject({ scans: 2, lastActive: scan.createdAt })
    expect(list[0]).toMatchObject({ scans: 0 })
  })
})

describe('scansRepo and reportsRepo', () => {
  it('stores a scan and maps it back to the shared shape', async () => {
    const u = await usersRepo.create({ email: 's@example.com', name: 'S' })
    const saved = await scansRepo.record(u.id, unsaved('medium'), null)
    expect(saved).toEqual({ ...unsaved('medium'), id: expect.stringMatching(/^[a-f\d]{24}$/), createdAt: expect.any(String), userId: u.id })
    expect(await scansRepo.listByUser(u.id)).toEqual([saved])
  })

  it('keeps each user’s history separate and newest first', async () => {
    const a = await usersRepo.create({ email: 'a@example.com', name: 'A' })
    const b = await usersRepo.create({ email: 'b@example.com', name: 'B' })
    const first = await scansRepo.record(a.id, unsaved('low'), null)
    await sleep(5)
    const second = await scansRepo.record(a.id, unsaved('high'), report)
    await scansRepo.record(b.id, unsaved('high'), report)

    expect((await scansRepo.listByUser(a.id)).map((s) => s.id)).toEqual([second.id, first.id])
    expect((await scansRepo.listRecent(2)).length).toBe(2)
    expect(await scansRepo.levelCounts(a.id)).toEqual({ total: 2, low: 1, medium: 0, high: 1 })
    expect(await scansRepo.levelCounts()).toEqual({ total: 3, low: 1, medium: 0, high: 2 })
  })

  it('finds scans by time for charts and "today" counts', async () => {
    const u = await usersRepo.create({ email: 't@example.com', name: 'T' })
    const before = new Date()
    await scansRepo.record(u.id, unsaved('high'), report)
    expect(await scansRepo.levelsSince(before, u.id)).toEqual([{ riskLevel: 'high', createdAt: expect.any(String) }])
    expect(await scansRepo.countSince(before)).toBe(1)
    expect(await scansRepo.countSince(new Date(Date.now() + 60_000))).toBe(0)
  })

  it('returns only flagged scans as reports, carrying their scan', async () => {
    const u = await usersRepo.create({ email: 'r@example.com', name: 'R' })
    await scansRepo.record(u.id, unsaved('low'), null)
    const flagged = await scansRepo.record(u.id, unsaved('high'), report)

    const reports = await reportsRepo.listByUser(u.id)
    expect(reports).toEqual([
      {
        id: `rpt_${flagged.id}`,
        reportType: 'scan',
        category: 'brand-impersonation',
        riskLevel: 'high',
        title: report.title,
        details: report.details,
        createdAt: flagged.createdAt,
        scan: flagged,
      },
    ])
  })

  it('rejects documents that break the schema', async () => {
    const u = await usersRepo.create({ email: 'v@example.com', name: 'V' })
    await expect(scansRepo.record(u.id, { ...unsaved('low'), riskScore: 140 }, null)).rejects.toThrow()
  })
})

describe('keywordsRepo', () => {
  it('adds, lists newest first, rejects duplicates and removes', async () => {
    const first = await keywordsRepo.add({ term: 'invoice', category: 'url', weight: 20 })
    await sleep(5)
    const second = await keywordsRepo.add({ term: 'invoice', category: 'scam', weight: 10 })
    await expect(keywordsRepo.add({ term: 'invoice', category: 'url', weight: 5 })).rejects.toBeInstanceOf(DuplicateKeywordError)

    expect((await keywordsRepo.list()).map((k) => k.id)).toEqual([second.id, first.id])
    expect(await keywordsRepo.remove(first.id)).toBe(true)
    expect(await keywordsRepo.remove(first.id)).toBe(false)
    expect(await keywordsRepo.remove('not-an-id')).toBe(false)
  })

  it('seeds the defaults once and keeps admin edits', async () => {
    expect(await keywordsRepo.seed(DEFAULT_KEYWORDS)).toBe(DEFAULT_KEYWORDS.length)
    expect(await keywordsRepo.seed(DEFAULT_KEYWORDS)).toBe(0)
    expect(await keywordsRepo.list()).toHaveLength(DEFAULT_KEYWORDS.length)
  })
})
