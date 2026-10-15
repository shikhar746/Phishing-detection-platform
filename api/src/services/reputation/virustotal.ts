import type { ReputationResult } from '@phishlens/core'

const BASE = 'https://www.virustotal.com/api/v3'

interface UrlReport {
  data?: { attributes?: { last_analysis_stats?: Record<string, number> } }
}

/** VirusTotal's URL identifier: unpadded base64url of the URL. */
export const urlId = (url: string) => Buffer.from(url).toString('base64url')

const unavailable = (summary: string): ReputationResult => ({ source: 'virustotal', status: 'unavailable', summary })

/**
 * Looks up VirusTotal's last analysis of a URL. URLs VirusTotal has never
 * seen are submitted for analysis (so a rescan later has a verdict) and
 * reported as unavailable — "not analyzed yet" is not the same as clean.
 */
export async function checkVirusTotal(url: string, apiKey: string | undefined, timeoutMs: number): Promise<ReputationResult> {
  if (!apiKey) return unavailable('VirusTotal is not configured on this server.')
  const headers = { 'x-apikey': apiKey, accept: 'application/json' }

  const res = await fetch(`${BASE}/urls/${urlId(url)}`, { headers, signal: AbortSignal.timeout(timeoutMs) })
  if (res.status === 404) {
    await fetch(`${BASE}/urls`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => undefined)
    return unavailable('Not yet known to VirusTotal; submitted for analysis.')
  }
  if (res.status === 429) return unavailable('VirusTotal rate limit reached; try again shortly.')
  if (!res.ok) return unavailable(`VirusTotal lookup failed (${res.status}).`)

  const stats = ((await res.json()) as UrlReport).data?.attributes?.last_analysis_stats ?? {}
  const total = Object.values(stats).reduce((sum, n) => sum + n, 0)
  const malicious = stats.malicious ?? 0
  const suspicious = stats.suspicious ?? 0
  const flagged = malicious + suspicious
  if (total === 0) return unavailable('VirusTotal has no analysis results for this URL yet.')
  return {
    source: 'virustotal',
    // one malicious verdict, or several "suspicious" ones, is a real signal
    status: malicious >= 1 || suspicious >= 2 ? 'flagged' : 'clean',
    summary: `${flagged} / ${total} security vendors flagged this URL.`,
  }
}
