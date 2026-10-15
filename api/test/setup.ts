// Runs before every test file: swaps each repository for the in-memory fake
// database and the reputation services for a stub, then resets them per test.
import { beforeEach, vi } from 'vitest'
import type { ReputationResult } from '@phishlens/core'

vi.mock('../src/repositories/users.repo.js', () => import('./fakes/db.js'))
vi.mock('../src/repositories/scans.repo.js', () => import('./fakes/db.js'))
vi.mock('../src/repositories/reports.repo.js', () => import('./fakes/db.js'))
vi.mock('../src/repositories/keywords.repo.js', () => import('./fakes/db.js'))
vi.mock('../src/services/reputation/index.js', () => ({ checkReputation: vi.fn() }))

/** Reputation as an unconfigured server reports it: the rules alone decide. */
export const UNAVAILABLE: ReputationResult[] = [
  { source: 'virustotal', status: 'unavailable', summary: 'VirusTotal is not configured on this server.' },
  { source: 'safe-browsing', status: 'unavailable', summary: 'Google Safe Browsing is not configured on this server.' },
]

beforeEach(async () => {
  const { resetDb } = await import('./fakes/db.js')
  const { invalidateKeywords } = await import('../src/services/keywords.js')
  const { checkReputation } = await import('../src/services/reputation/index.js')
  resetDb()
  invalidateKeywords()
  vi.mocked(checkReputation).mockReset().mockResolvedValue(UNAVAILABLE)
})
