import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { googleAuthSchema, loginSchema, registerSchema } from '../src/schemas/auth.schema.js'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/lib/tokens.js'

describe('auth schemas', () => {
  it('normalizes the email on register', () => {
    const parsed = registerSchema.parse({ name: '  Sofia Marquez ', email: ' Sofia@Example.COM ', password: 'abcd1234' })
    expect(parsed).toEqual({ name: 'Sofia Marquez', email: 'sofia@example.com', password: 'abcd1234' })
  })

  it('enforces password rules on register', () => {
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'abcdefgh' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: '12345678' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: `a1${'x'.repeat(71)}` }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'abcd1234' }).success).toBe(true)
  })

  it('only requires a non-empty password on login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })

  it('requires a plausible Google credential', () => {
    expect(googleAuthSchema.safeParse({ credential: 'short' }).success).toBe(false)
    expect(googleAuthSchema.safeParse({ credential: 'a'.repeat(40) }).success).toBe(true)
  })
})

describe('tokens', () => {
  it('round-trips access and refresh tokens', () => {
    expect(verifyAccessToken(signAccessToken('user-1'))?.sub).toBe('user-1')
    expect(verifyRefreshToken(signRefreshToken('user-1'))?.sub).toBe('user-1')
  })

  it('keeps access and refresh tokens from being swapped', () => {
    expect(verifyRefreshToken(signAccessToken('user-1'))).toBeNull()
    expect(verifyAccessToken(signRefreshToken('user-1'))).toBeNull()
  })

  it('rejects expired and foreign-signed tokens', () => {
    const expired = jwt.sign({ sub: 'user-1' }, 'test-access-secret', { expiresIn: -10 })
    expect(verifyAccessToken(expired)).toBeNull()
    const forged = jwt.sign({ sub: 'user-1' }, 'someone-elses-secret')
    expect(verifyAccessToken(forged)).toBeNull()
  })

  it('uses the configured access-token lifetime', () => {
    const decoded = jwt.decode(signAccessToken('user-1')) as { iat: number; exp: number }
    expect(decoded.exp - decoded.iat).toBe(15 * 60)
  })
})
