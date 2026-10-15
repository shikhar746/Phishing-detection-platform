import { DEFAULT_KEYWORDS, type KeywordRule } from '@phishlens/core'
import { keywordsRepo } from '../repositories/keywords.repo.js'

// The keyword list changes rarely (only when an admin edits it) but is read
// on every scan, so it is cached briefly and dropped on every admin change.

const TTL_MS = 60_000
let cached: { rules: KeywordRule[]; at: number } | null = null

/** Rules the analyzer should use: the admin list, or the built-in list until the table is seeded. */
export async function activeKeywords(now = Date.now()): Promise<KeywordRule[]> {
  if (cached && now - cached.at < TTL_MS) return cached.rules
  const stored = await keywordsRepo.list()
  const rules = stored.length ? stored.map(({ term, category, weight }) => ({ term, category, weight })) : DEFAULT_KEYWORDS
  cached = { rules, at: now }
  return rules
}

export function invalidateKeywords(): void {
  cached = null
}
