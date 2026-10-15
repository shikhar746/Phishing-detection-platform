import { randomUUID } from 'node:crypto'
import type { Role } from '@phishlens/core'
import { setUser, usersRepo } from './fakes/db.js'
import { signAccessToken } from '../src/lib/tokens.js'

/** Creates an account in the fake database and returns a cookie that authenticates as it. */
export async function signedIn(role: Role = 'user', name = role === 'admin' ? 'Admin Person' : 'Regular Person') {
  const user = await usersRepo.create({ email: `${randomUUID().slice(0, 8)}@example.com`, name, passwordHash: '$2b$10$x' })
  if (role === 'admin') setUser(user.id, { role })
  return { user: { ...user, role }, cookie: `accessToken=${signAccessToken(user.id)}` }
}
