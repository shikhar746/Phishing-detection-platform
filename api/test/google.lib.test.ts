import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyIdToken = vi.fn()
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(function OAuth2Client() {
    return { verifyIdToken }
  }),
}))

const { verifyGoogleIdToken, isGoogleSignInEnabled } = await import('../src/lib/google.js')

function ticket(payload: Record<string, unknown>) {
  return { getPayload: () => payload }
}

const claims = {
  sub: 'google-sub-1',
  email: 'Daniel.Okafor@Example.com',
  email_verified: true,
  name: 'Daniel Okafor',
  picture: 'https://example.com/d.png',
}

beforeEach(() => {
  verifyIdToken.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('verifyGoogleIdToken', () => {
  it('is enabled when GOOGLE_CLIENT_ID is set', () => {
    expect(isGoogleSignInEnabled()).toBe(true)
  })

  it('checks the token against our client id as audience', async () => {
    verifyIdToken.mockResolvedValue(ticket(claims))
    await verifyGoogleIdToken('id-token')
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: 'test-client-id.apps.googleusercontent.com',
    })
  })

  it('returns a normalized profile for a valid token', async () => {
    verifyIdToken.mockResolvedValue(ticket(claims))
    await expect(verifyGoogleIdToken('id-token')).resolves.toEqual({
      googleId: 'google-sub-1',
      email: 'daniel.okafor@example.com',
      name: 'Daniel Okafor',
      imageUrl: 'https://example.com/d.png',
    })
  })

  it('falls back to the email local part when the name is missing', async () => {
    verifyIdToken.mockResolvedValue(ticket({ ...claims, name: undefined, picture: undefined }))
    const profile = await verifyGoogleIdToken('id-token')
    expect(profile?.name).toBe('Daniel.Okafor')
    expect(profile?.imageUrl).toBeNull()
  })

  it('refuses addresses Google has not verified', async () => {
    verifyIdToken.mockResolvedValue(ticket({ ...claims, email_verified: false }))
    await expect(verifyGoogleIdToken('id-token')).resolves.toBeNull()
    verifyIdToken.mockResolvedValue(ticket({ ...claims, email_verified: undefined }))
    await expect(verifyGoogleIdToken('id-token')).resolves.toBeNull()
  })

  it('returns null when Google rejects the token', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'))
    await expect(verifyGoogleIdToken('id-token')).resolves.toBeNull()
  })

  it('returns null for a payload without subject or email', async () => {
    verifyIdToken.mockResolvedValue(ticket({ ...claims, sub: undefined }))
    await expect(verifyGoogleIdToken('id-token')).resolves.toBeNull()
  })
})
