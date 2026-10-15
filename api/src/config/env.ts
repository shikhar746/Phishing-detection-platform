import 'dotenv/config'

// if some called for env variables missing thats how we throw an error
const missing: string[] = []

function required(name: string): string {
    const value = process.env[name]
    if (!value) {
        missing.push(name)
        return ''
    }
    return value
}

// optionalNumber: integer env var with a fallback; options.min defaults to 1
function optionalNumber(name: string, fallback: number, options: { min?: number } = {}): number {
    const min = options.min ?? 1
    const value = process.env[name]
    if (value === undefined || value.trim() === '') return fallback
    const n = Number(value)
    if (!Number.isInteger(n) || n < min)
        throw new Error(
            `Environment variable ${name} must be an integer of at least ${min}, got: ${value}`
        )
    return n
}

function optionalStringArray(name: string, fallback: string[]): string[] {
    const v = process.env[name]
    return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback
}

// optionalString(name)
// helper for settings a deployment may simply not use — Google sign-in is off
// unless a client id is configured, so this returns undefined instead of throwing
function optionalString(name: string): string | undefined {
    const v = process.env[name]?.trim()
    return v ? v : undefined
}

const DURATION_UNIT_MS: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
}

// optionalDuration(name, fallback)
// helper for token TTLs, e.g. "15m", "1h", "7d" — returns both the raw
// string (for jsonwebtoken's expiresIn) and the millisecond value (for
// cookie maxAge), so the two never drift apart
function optionalDuration(name: string, fallback: string): { raw: string; ms: number } {
    const raw = process.env[name] ?? fallback
    const match = /^(\d+)(s|m|h|d)$/.exec(raw)
    if (!match)
        throw new Error(`Environment variable ${name} must look like "15m", "1h", or "7d", got: ${raw}`)
    const [, amount, unit] = match as unknown as [string, string, string]
    return { raw, ms: Number(amount) * DURATION_UNIT_MS[unit]! }
}

// trailing slashes on a pasted dashboard value would turn every allowed origin
// into one the browser never sends, so they are stripped here once
function normalizeOrigin(origin: string): string {
    return origin.replace(/\/+$/, '')
}

export const env = {
    // server
    PORT: optionalNumber('PORT', 8080),
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    CORS_ORIGIN: optionalStringArray('CORS_ORIGIN', [
        'http://localhost:5173',
        'http://localhost:3000',
    ]).map(normalizeOrigin),
    // auth 
    JWT_SECRET: required('JWT_SECRET'),
    REFRESH_SECRET: required('REFRESH_SECRET'),
    ACCESS_TOKEN_TTL: optionalDuration('ACCESS_TOKEN_TTL', '15m'),
    REFRESH_TOKEN_TTL: optionalDuration('REFRESH_TOKEN_TTL', '7d'),
    GOOGLE_CLIENT_ID: optionalString('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: optionalString('GOOGLE_CLIENT_SECRET'),

    // database (Supabase Postgres). The service-role key bypasses row-level
    // security, so it must only ever live on the server.
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),

    // threat-intel APIs, used by the scan endpoints
    VIRUSTOTAL_API_KEY: optionalString('VIRUSTOTAL_API_KEY'),
    GOOGLE_SAFE_BROWSING_API_KEY: optionalString('GOOGLE_SAFE_BROWSING_API_KEY'),

    RATE_LIMIT_WINDOW_MINUTES: optionalNumber('RATE_LIMIT_WINDOW_MINUTES', 15),
    RATE_LIMIT_MAX: optionalNumber('RATE_LIMIT_MAX', 10),

    // uploads (multer buffers in memory)
    MAX_FILE_SIZE_BYTES: optionalNumber('MAX_FILE_SIZE_BYTES', 52_428_800),
} as const

if (missing.length > 0) {
    throw new Error(
        `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
        `Set ${missing.length > 1 ? 'them' : 'it'} in the host's environment (Render: Settings > Environment) or in api/.env locally.`
    )
}
