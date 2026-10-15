// In-memory stand-in for every module in src/repositories. Tests load it with
// vi.mock(...) in place of each repository, so controllers, services and
// middleware run unchanged without Supabase.

import { randomBytes } from 'node:crypto'
import type { AdminUser, KeywordRule, RiskLevel, ScanReport, ScanResult, SuspiciousKeyword } from '@phishlens/core'
import type { NewUser, PublicUser, UserPatch, UserWithSecret } from '../../src/repositories/users.repo.js'
import type { LevelCounts, ReportFields, UnsavedScan } from '../../src/repositories/scans.repo.js'

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

export class DuplicateKeywordError extends Error {
  constructor() {
    super('That keyword is already on the list')
    this.name = 'DuplicateKeywordError'
  }
}

interface UserRow extends UserWithSecret {
  image_url: string | null
  created_at: string
}

interface ReportRow extends ReportFields {
  id: string
  userId: string
  scanId: string
  riskLevel: RiskLevel
  createdAt: string
}

const users = new Map<string, UserRow>()
let scans: ScanResult[] = [] // newest first
let reports: ReportRow[] = [] // newest first
let keywords: SuspiciousKeyword[] = []
let clock = Date.now()
/** Strictly increasing timestamps, so "newest first" is deterministic. */
const tick = () => new Date((clock += 1000)).toISOString()

const toPublic = ({ id, email, name, role, status }: UserRow): PublicUser => ({ id, email, name, role, status })

function overview(row: UserRow): AdminUser {
  const own = scans.filter((s) => s.userId === row.id)
  return {
    ...toPublic(row),
    scans: own.length,
    lastActive: own[0]?.createdAt ?? row.created_at,
    createdAt: row.created_at,
  }
}

export const usersRepo = {
  async findById(id: string) {
    const row = users.get(id)
    return row ? toPublic(row) : null
  },
  async findByEmail(email: string) {
    const row = [...users.values()].find((r) => r.email === email)
    return row ? { ...toPublic(row), passwordHash: row.passwordHash, googleId: row.googleId } : null
  },
  async findByGoogleId(googleId: string) {
    const row = [...users.values()].find((r) => r.googleId === googleId)
    return row ? toPublic(row) : null
  },
  async create(input: NewUser) {
    if ([...users.values()].some((r) => r.email === input.email)) throw new DuplicateEmailError()
    const row: UserRow = {
      id: randomBytes(12).toString('hex'),
      email: input.email,
      name: input.name,
      role: 'user',
      status: 'active',
      passwordHash: input.passwordHash ?? null,
      googleId: input.googleId ?? null,
      image_url: input.imageUrl ?? null,
      created_at: tick(),
    }
    users.set(row.id, row)
    return toPublic(row)
  },
  async linkGoogle(id: string, googleId: string, imageUrl: string | null) {
    const row = users.get(id)
    if (!row) throw new Error(`no user ${id}`)
    row.googleId = googleId
    row.image_url = imageUrl
    return toPublic(row)
  },
  async listOverview() {
    return [...users.values()].reverse().map(overview)
  },
  async update(id: string, patch: UserPatch) {
    const row = users.get(id)
    if (!row) return null
    if (patch.role) row.role = patch.role
    if (patch.status) row.status = patch.status
    return overview(row)
  },
  async counts() {
    const all = [...users.values()]
    return { total: all.length, active: all.filter((u) => u.status === 'active').length }
  },
}

export const scansRepo = {
  async record(userId: string, scan: UnsavedScan, report: ReportFields | null) {
    const saved: ScanResult = { ...scan, id: randomBytes(12).toString('hex'), createdAt: tick(), userId }
    scans.unshift(saved)
    if (report) reports.unshift({ ...report, id: randomBytes(12).toString('hex'), userId, scanId: saved.id, riskLevel: saved.riskLevel, createdAt: saved.createdAt })
    return saved
  },
  async listByUser(userId: string) {
    return scans.filter((s) => s.userId === userId)
  },
  async listRecent(limit = 500) {
    return scans.slice(0, limit)
  },
  async levelCounts(userId?: string): Promise<LevelCounts> {
    const scoped = scans.filter((s) => !userId || s.userId === userId)
    const of = (level: RiskLevel) => scoped.filter((s) => s.riskLevel === level).length
    return { total: scoped.length, low: of('low'), medium: of('medium'), high: of('high') }
  },
  async levelsSince(since: Date, userId?: string) {
    return scans
      .filter((s) => (!userId || s.userId === userId) && s.createdAt >= since.toISOString())
      .map(({ riskLevel, createdAt }) => ({ riskLevel, createdAt }))
  },
  async countSince(since: Date) {
    return scans.filter((s) => s.createdAt >= since.toISOString()).length
  },
}

export const reportsRepo = {
  async listByUser(userId: string): Promise<ScanReport[]> {
    return reports
      .filter((r) => r.userId === userId)
      .map((r) => ({
        id: r.id,
        reportType: 'scan' as const,
        category: r.category,
        riskLevel: r.riskLevel,
        title: r.title,
        details: r.details,
        createdAt: r.createdAt,
        scan: scans.find((s) => s.id === r.scanId)!,
      }))
  },
}

export const keywordsRepo = {
  async list() {
    return [...keywords]
  },
  async add(rule: KeywordRule) {
    if (keywords.some((k) => k.term === rule.term && k.category === rule.category)) throw new DuplicateKeywordError()
    const keyword: SuspiciousKeyword = { ...rule, id: randomBytes(12).toString('hex'), createdAt: tick() }
    keywords.unshift(keyword)
    return keyword
  },
  async remove(id: string) {
    const before = keywords.length
    keywords = keywords.filter((k) => k.id !== id)
    return keywords.length < before
  },
  async seed(rules: KeywordRule[]) {
    let added = 0
    for (const rule of rules) {
      if (!keywords.some((k) => k.term === rule.term && k.category === rule.category)) {
        await keywordsRepo.add(rule)
        added++
      }
    }
    return added
  },
}

/** Test helpers (not part of the real repositories). */
export function resetDb() {
  users.clear()
  scans = []
  reports = []
  keywords = []
  clock = Date.now()
}

export function getUserRow(id: string) {
  return users.get(id)
}

export function setUser(id: string, patch: Partial<Pick<UserRow, 'role' | 'status' | 'googleId'>>) {
  const row = users.get(id)
  if (row) Object.assign(row, patch)
}

export function allScans() {
  return [...scans]
}
