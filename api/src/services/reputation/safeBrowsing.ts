import type { ReputationResult } from '@phishlens/core'

const ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'
const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION']

interface FindResponse {
  matches?: { threatType: string }[]
}

const unavailable = (summary: string): ReputationResult => ({ source: 'safe-browsing', status: 'unavailable', summary })

/** Checks a URL against Google Safe Browsing's unsafe-site lists (Lookup API v4). */
export async function checkSafeBrowsing(url: string, apiKey: string | undefined, timeoutMs: number): Promise<ReputationResult> {
  if (!apiKey) return unavailable('Google Safe Browsing is not configured on this server.')

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'phishlens', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: THREAT_TYPES,
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (res.status === 429) return unavailable('Safe Browsing quota reached; try again later.')
  if (!res.ok) return unavailable(`Safe Browsing lookup failed (${res.status}).`)

  const types = [...new Set(((await res.json()) as FindResponse).matches?.map((m) => m.threatType) ?? [])]
  return types.length
    ? { source: 'safe-browsing', status: 'flagged', summary: `Listed as ${types.join(', ')}.` }
    : { source: 'safe-browsing', status: 'clean', summary: "Not on Google's unsafe-site lists." }
}
