import { Types } from 'mongoose'
import type { AdminUser, Role } from '@phishlens/core'
import { isObjectId } from '../lib/db.js'
import { ScanModel } from '../models/scan.model.js'
import { UserModel, type UserDoc } from '../models/user.model.js'

// All reads and writes of users go through here, so controllers stay free of
// query details and tests can swap this module for an in-memory fake.
// Not-found returns null; any other database error throws and reaches the
// error handler as a 500.

export type UserStatus = AdminUser['status']

/** The account as the API returns it; never includes credentials. */
export interface PublicUser {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
}

export interface UserWithSecret extends PublicUser {
  passwordHash: string | null
  googleId: string | null
}

export interface NewUser {
  email: string
  name: string
  passwordHash?: string
  googleId?: string
  imageUrl?: string | null
}

// undefined fields are left unchanged
export type UserPatch = { role?: Role | undefined; status?: UserStatus | undefined }

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

const DUPLICATE_KEY = 11000

const toPublic = (d: UserDoc): PublicUser => ({
  id: d._id.toString(),
  email: d.email,
  name: d.name,
  role: d.role as Role,
  status: d.status as UserStatus,
})

const toSecret = (d: UserDoc): UserWithSecret => ({
  ...toPublic(d),
  passwordHash: d.passwordHash ?? null,
  googleId: d.googleId ?? null,
})

/** Scan count and latest scan time per user id (all users, or just `userIds`). */
async function activityByUser(userIds?: string[]): Promise<Map<string, { scans: number; last: Date }>> {
  const match = userIds ? [{ $match: { userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } } }] : []
  const rows: { _id: Types.ObjectId; scans: number; last: Date }[] = await ScanModel.aggregate([
    ...match,
    { $group: { _id: '$userId', scans: { $sum: 1 }, last: { $max: '$createdAt' } } },
  ])
  return new Map(rows.map((r) => [r._id.toString(), { scans: r.scans, last: r.last }]))
}

function toAdminUser(d: UserDoc, activity?: { scans: number; last: Date }): AdminUser {
  return {
    ...toPublic(d),
    scans: activity?.scans ?? 0,
    lastActive: (activity?.last ?? d.createdAt).toISOString(),
    createdAt: d.createdAt.toISOString(),
  }
}

export const usersRepo = {
  async findById(id: string): Promise<PublicUser | null> {
    // ids come from tokens; an old or forged one is simply not found
    if (!isObjectId(id)) return null
    const doc = await UserModel.findById(id).lean<UserDoc>()
    return doc ? toPublic(doc) : null
  },

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean<UserDoc>()
    return doc ? toSecret(doc) : null
  },

  async findByGoogleId(googleId: string): Promise<PublicUser | null> {
    const doc = await UserModel.findOne({ googleId }).lean<UserDoc>()
    return doc ? toPublic(doc) : null
  },

  async create(input: NewUser): Promise<PublicUser> {
    try {
      const doc = await UserModel.create({
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash ?? null,
        googleId: input.googleId ?? null,
        imageUrl: input.imageUrl ?? null,
      })
      return toPublic(doc.toObject() as UserDoc)
    } catch (err) {
      if ((err as { code?: number }).code === DUPLICATE_KEY) throw new DuplicateEmailError()
      throw err
    }
  },

  async linkGoogle(id: string, googleId: string, imageUrl: string | null): Promise<PublicUser> {
    const doc = await UserModel.findByIdAndUpdate(id, { googleId, imageUrl }, { new: true }).lean<UserDoc>()
    if (!doc) throw new Error(`user ${id} disappeared while linking Google`)
    return toPublic(doc)
  },

  /** Every account with its scan count and last activity, newest first. */
  async listOverview(): Promise<AdminUser[]> {
    const [docs, activity] = await Promise.all([UserModel.find().sort({ createdAt: -1 }).lean<UserDoc[]>(), activityByUser()])
    return docs.map((d) => toAdminUser(d, activity.get(d._id.toString())))
  },

  async update(id: string, patch: UserPatch): Promise<AdminUser | null> {
    if (!isObjectId(id)) return null
    const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
    const doc = await UserModel.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).lean<UserDoc>()
    if (!doc) return null
    return toAdminUser(doc, (await activityByUser([id])).get(id))
  },

  async counts(): Promise<{ total: number; active: number }> {
    const [total, active] = await Promise.all([UserModel.countDocuments(), UserModel.countDocuments({ status: 'active' })])
    return { total, active }
  },
}
