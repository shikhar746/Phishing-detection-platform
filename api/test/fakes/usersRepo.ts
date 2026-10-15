// In-memory stand-in for src/repositories/users.repo.ts. Tests load it with
// vi.mock(...), so the controllers run unchanged without a database.

import type { NewUser, PublicUser, Role, UserWithSecret } from '../../src/repositories/users.repo.js'

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

interface Row extends UserWithSecret {
  image_url: string | null
}

const rows = new Map<string, Row>()
let nextId = 1

const toPublic = ({ id, email, name, role }: Row): PublicUser => ({ id, email, name, role })

export const usersRepo = {
  async findById(id: string) {
    const row = rows.get(id)
    return row ? toPublic(row) : null
  },
  async findByEmail(email: string) {
    const row = [...rows.values()].find((r) => r.email === email)
    return row ? { ...toPublic(row), password_hash: row.password_hash, google_id: row.google_id } : null
  },
  async findByGoogleId(googleId: string) {
    const row = [...rows.values()].find((r) => r.google_id === googleId)
    return row ? toPublic(row) : null
  },
  async create(input: NewUser) {
    if ([...rows.values()].some((r) => r.email === input.email)) throw new DuplicateEmailError()
    const row: Row = {
      id: `user-${nextId++}`,
      email: input.email,
      name: input.name,
      role: 'user',
      password_hash: input.passwordHash ?? null,
      google_id: input.googleId ?? null,
      image_url: input.imageUrl ?? null,
    }
    rows.set(row.id, row)
    return toPublic(row)
  },
  async linkGoogle(id: string, googleId: string, imageUrl: string | null) {
    const row = rows.get(id)
    if (!row) throw new Error(`no user ${id}`)
    row.google_id = googleId
    row.image_url = imageUrl
    return toPublic(row)
  },
}

/** Test helpers (not part of the real repo). */
export function resetUsers() {
  rows.clear()
  nextId = 1
}

export function getRow(id: string) {
  return rows.get(id)
}

export function setRole(id: string, role: Role) {
  const row = rows.get(id)
  if (row) row.role = role
}
