// Runs in every test file: connects the real repositories to the shared test
// MongoDB (one database per file, so files can run in parallel), stubs the
// reputation services (no network in tests), and starts each test empty.
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach, inject, vi } from 'vitest'
import type { ReputationResult } from '@phishlens/core'

vi.mock('../src/services/reputation/index.js', () => ({ checkReputation: vi.fn() }))

/** Reputation as an unconfigured server reports it: the rules alone decide. */
export const UNAVAILABLE: ReputationResult[] = [
  { source: 'virustotal', status: 'unavailable', summary: 'VirusTotal is not configured on this server.' },
  { source: 'safe-browsing', status: 'unavailable', summary: 'Google Safe Browsing is not configured on this server.' },
]

beforeAll(async () => {
  const { connectDb } = await import('../src/lib/db.js')
  await connectDb(inject('mongoUri'), `test_${randomBytes(6).toString('hex')}`)
})

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
  const { invalidateKeywords } = await import('../src/services/keywords.js')
  const { checkReputation } = await import('../src/services/reputation/index.js')
  invalidateKeywords()
  vi.mocked(checkReputation).mockReset().mockResolvedValue(UNAVAILABLE)
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
