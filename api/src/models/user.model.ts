import { model, Schema, type InferSchemaType, type Types } from 'mongoose'
import { ROLES, USER_STATUSES } from '@phishlens/core'

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    // null for accounts that only sign in with Google
    passwordHash: { type: String, default: null },
    // Google's stable "sub" claim; unique when present
    googleId: { type: String, default: null },
    imageUrl: { type: String, default: null },
    role: { type: String, enum: ROLES, default: 'user', required: true },
    status: { type: String, enum: USER_STATUSES, default: 'active', required: true },
    // Activity counters for the admin user list, kept up to date when a scan
    // is saved, so listing users never has to scan the scans collection.
    scanCount: { type: Number, default: 0, min: 0 },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'users' },
)

// unique only among accounts that have a Google id
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } })

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId; createdAt: Date }
export const UserModel = model('User', userSchema)
