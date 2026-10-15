import { Types } from 'mongoose'
import { analyzeEmail, analyzeUrl, normalizeUrl, type ScanResult } from '@phishlens/core'
import { scansRepo, type UnsavedScan } from '../repositories/scans.repo.js'
import { activeKeywords } from './keywords.js'
import { checkReputation } from './reputation/index.js'

// Runs a scan end to end: rules + reputation, then persistence. Signed-in
// users' scans are saved; anonymous scans are returned but not stored.

async function save(scan: UnsavedScan, userId: string | undefined): Promise<ScanResult> {
  if (!userId) return { ...scan, id: new Types.ObjectId().toString(), createdAt: new Date().toISOString() }
  return scansRepo.record(userId, scan)
}

export async function scanUrl(input: string, userId?: string): Promise<ScanResult> {
  const url = normalizeUrl(input)
  // independent lookups: keyword list (DB/cache) and both reputation services
  const [keywords, reputation] = await Promise.all([activeKeywords(), checkReputation(url)])
  return save({ type: 'url', content: url, ...analyzeUrl(url, keywords, reputation) }, userId)
}

export async function scanEmail(input: string, userId?: string): Promise<ScanResult> {
  const content = input.trim()
  return save({ type: 'email', content, ...analyzeEmail(content, await activeKeywords()) }, userId)
}
