import type { ReputationResult } from '@phishlens/core'
import { env } from '../../config/env.js'
import { checkSafeBrowsing } from './safeBrowsing.js'
import { checkVirusTotal } from './virustotal.js'

const TIMEOUT_MS = 6000

/**
 * Both reputation services, queried in parallel. A service that times out
 * or errors becomes an "unavailable" result instead of failing the scan —
 * the rule-based checks still produce a verdict on their own.
 */
export async function checkReputation(url: string): Promise<ReputationResult[]> {
  const guard = (source: ReputationResult['source'], run: () => Promise<ReputationResult>) =>
    run().catch((err: unknown): ReputationResult => {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
      return { source, status: 'unavailable', summary: timedOut ? 'The service did not respond in time.' : 'The service could not be reached.' }
    })

  return Promise.all([
    guard('virustotal', () => checkVirusTotal(url, env.VIRUSTOTAL_API_KEY, TIMEOUT_MS)),
    guard('safe-browsing', () => checkSafeBrowsing(url, env.GOOGLE_SAFE_BROWSING_API_KEY, TIMEOUT_MS)),
  ])
}
