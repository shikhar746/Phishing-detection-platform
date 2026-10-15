import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkSafeBrowsing } from '../src/services/reputation/safeBrowsing.js'
import { checkVirusTotal, urlId } from '../src/services/reputation/virustotal.js'

const URL = 'http://secure-paypal-login-free.com'
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => {
  fetchMock.mockReset()
})

describe('VirusTotal', () => {
  const report = (stats: Record<string, number>) => json(200, { data: { attributes: { last_analysis_stats: stats } } })

  it('looks the URL up by its unpadded base64url id with the API key', async () => {
    fetchMock.mockResolvedValue(report({ harmless: 70, undetected: 24 }))
    await checkVirusTotal(URL, 'vt-key', 1000)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`https://www.virustotal.com/api/v3/urls/${urlId(URL)}`)
    expect(urlId(URL)).not.toMatch(/[=+/]/)
    expect((init!.headers as Record<string, string>)['x-apikey']).toBe('vt-key')
  })

  it('flags a URL any engine calls malicious', async () => {
    fetchMock.mockResolvedValue(report({ malicious: 12, suspicious: 2, harmless: 60, undetected: 20 }))
    await expect(checkVirusTotal(URL, 'k', 1000)).resolves.toEqual({
      source: 'virustotal',
      status: 'flagged',
      summary: '14 / 94 security vendors flagged this URL.',
    })
  })

  it('treats a single "suspicious" verdict as clean, two as flagged', async () => {
    fetchMock.mockResolvedValueOnce(report({ suspicious: 1, harmless: 90 }))
    expect((await checkVirusTotal(URL, 'k', 1000)).status).toBe('clean')
    fetchMock.mockResolvedValueOnce(report({ suspicious: 2, harmless: 90 }))
    expect((await checkVirusTotal(URL, 'k', 1000)).status).toBe('flagged')
  })

  it('submits unknown URLs for analysis and reports them as unavailable, not clean', async () => {
    fetchMock.mockResolvedValueOnce(json(404)).mockResolvedValueOnce(json(200))
    const result = await checkVirusTotal(URL, 'k', 1000)
    expect(result.status).toBe('unavailable')
    const [submitUrl, submit] = fetchMock.mock.calls[1]!
    expect(submitUrl).toBe('https://www.virustotal.com/api/v3/urls')
    expect(String(submit!.body)).toBe(new URLSearchParams({ url: URL }).toString())
  })

  it('degrades on rate limits, errors and missing keys', async () => {
    fetchMock.mockResolvedValueOnce(json(429))
    expect((await checkVirusTotal(URL, 'k', 1000)).summary).toMatch(/rate limit/)
    fetchMock.mockResolvedValueOnce(json(500))
    expect((await checkVirusTotal(URL, 'k', 1000)).status).toBe('unavailable')
    expect((await checkVirusTotal(URL, undefined, 1000)).summary).toMatch(/not configured/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('Google Safe Browsing', () => {
  it('sends a v4 threatMatches lookup with the key in the query string', async () => {
    fetchMock.mockResolvedValue(json(200, {}))
    await checkSafeBrowsing(URL, 'sb key', 1000)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://safebrowsing.googleapis.com/v4/threatMatches:find?key=sb%20key')
    const body = JSON.parse(String(init!.body))
    expect(body.threatInfo.threatEntries).toEqual([{ url: URL }])
    expect(body.threatInfo.threatTypes).toContain('SOCIAL_ENGINEERING')
  })

  it('reports listed threat types once each', async () => {
    fetchMock.mockResolvedValue(json(200, { matches: [{ threatType: 'SOCIAL_ENGINEERING' }, { threatType: 'SOCIAL_ENGINEERING' }, { threatType: 'MALWARE' }] }))
    await expect(checkSafeBrowsing(URL, 'k', 1000)).resolves.toEqual({
      source: 'safe-browsing',
      status: 'flagged',
      summary: 'Listed as SOCIAL_ENGINEERING, MALWARE.',
    })
  })

  it('treats an empty response as clean', async () => {
    fetchMock.mockResolvedValue(json(200, {}))
    expect((await checkSafeBrowsing(URL, 'k', 1000)).status).toBe('clean')
  })

  it('degrades on errors and missing keys', async () => {
    fetchMock.mockResolvedValueOnce(json(403))
    expect((await checkSafeBrowsing(URL, 'k', 1000)).status).toBe('unavailable')
    expect((await checkSafeBrowsing(URL, undefined, 1000)).summary).toMatch(/not configured/)
  })
})

describe('checkReputation', () => {
  it('queries both services and turns a timeout into "unavailable" without failing the other', async () => {
    // env.ts is first loaded by this import, so the keys take effect
    process.env.VIRUSTOTAL_API_KEY = 'vt-key'
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'sb-key'
    const { checkReputation } = await vi.importActual<typeof import('../src/services/reputation/index.js')>('../src/services/reputation/index.js')

    fetchMock.mockImplementation(async (input) =>
      String(input).includes('virustotal')
        ? Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))
        : json(200, { matches: [{ threatType: 'MALWARE' }] }),
    )
    const results = await checkReputation(URL)
    expect(results).toEqual([
      { source: 'virustotal', status: 'unavailable', summary: 'The service did not respond in time.' },
      { source: 'safe-browsing', status: 'flagged', summary: 'Listed as MALWARE.' },
    ])
    for (const [, init] of fetchMock.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal)
  })
})
