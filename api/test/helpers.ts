import { randomBytes } from 'node:crypto'
import type { Role, ScanResult } from '@phishlens/core'
import { UserModel, type UserDoc } from '../src/models/user.model.js'
import { scansRepo } from '../src/repositories/scans.repo.js'
import { usersRepo } from '../src/repositories/users.repo.js'
import { signAccessToken } from '../src/lib/tokens.js'

/** Creates an account and returns a cookie that authenticates as it. */
export async function signedIn(role: Role = 'user', name = role === 'admin' ? 'Admin Person' : 'Regular Person') {
  const user = await usersRepo.create({ email: `${randomBytes(4).toString('hex')}@example.com`, name, passwordHash: '$2b$10$x' })
  if (role === 'admin') await setUser(user.id, { role })
  return { user: { ...user, role }, cookie: `accessToken=${signAccessToken(user.id)}` }
}

/** The stored user document, credentials included. */
export async function userRow(id: string): Promise<UserDoc | null> {
  return UserModel.findById(id).lean<UserDoc>()
}

export async function setUser(id: string, patch: Partial<Pick<UserDoc, 'role' | 'status' | 'googleId'>>) {
  await UserModel.updateOne({ _id: id }, patch)
}

export async function allScans(): Promise<ScanResult[]> {
  return scansRepo.listRecent()
}
