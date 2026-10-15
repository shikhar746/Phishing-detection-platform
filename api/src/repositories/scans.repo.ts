import { Types } from 'mongoose'
import type { RiskLevel, ScanResult } from '@phishlens/core'
import { ScanModel, type ScanDoc } from '../models/scan.model.js'
import { UserModel } from '../models/user.model.js'

// Reads and writes of scans, mapped to the shared ScanResult shape.

export type UnsavedScan = Omit<ScanResult, 'id' | 'createdAt' | 'userId'>
export type LevelCounts = Record<RiskLevel, number> & { total: number }

const HISTORY_LIMIT = 500
const FLAGGED: RiskLevel[] = ['medium', 'high']

// Field by field on purpose: spreading the document would leak storage
// details (e.g. Mongoose's __v) into API responses.
export const toScan = (d: ScanDoc): ScanResult => ({
  id: d._id.toString(),
  type: d.type,
  content: d.content,
  riskLevel: d.riskLevel,
  riskScore: d.riskScore,
  threatStatus: d.threatStatus,
  recommendation: d.recommendation,
  checks: d.checks,
  reputation: d.reputation,
  createdAt: d.createdAt.toISOString(),
  userId: d.userId.toString(),
})

const scope = (userId?: string) => (userId ? { userId: new Types.ObjectId(userId) } : {})

const newestFirst = async (filter: object, limit = HISTORY_LIMIT) =>
  (await ScanModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit).lean<ScanDoc[]>()).map(toScan)

export const scansRepo = {
  /**
   * Saves a scan, then bumps the user's activity counters for the admin list.
   * The counters are informational, so failing to update them doesn't fail the scan.
   */
  async record(userId: string, scan: UnsavedScan): Promise<ScanResult> {
    const doc = await ScanModel.create({ ...scan, userId: new Types.ObjectId(userId) })
    await UserModel.updateOne({ _id: doc.userId }, { $inc: { scanCount: 1 }, $max: { lastActiveAt: doc.createdAt } }).catch(
      (err: unknown) => console.error('could not update user activity counters', err),
    )
    return toScan(doc.toObject())
  },

  /** A user's scans, newest first. */
  listByUser: (userId: string) => newestFirst(scope(userId)),

  /** A user's medium and high scans (their threat reports), newest first. */
  listFlaggedByUser: (userId: string) => newestFirst({ ...scope(userId), riskLevel: { $in: FLAGGED } }),

  /** Platform-wide detection log, newest first. */
  listRecent: (limit = HISTORY_LIMIT) => newestFirst({}, limit),

  /** Scans per risk level, for one user or (without a user) the whole platform. */
  async levelCounts(userId?: string): Promise<LevelCounts> {
    const rows: { _id: RiskLevel; n: number }[] = await ScanModel.aggregate([
      { $match: scope(userId) },
      { $group: { _id: '$riskLevel', n: { $sum: 1 } } },
    ])
    const counts: LevelCounts = { total: 0, low: 0, medium: 0, high: 0 }
    for (const { _id, n } of rows) {
      counts[_id] = n
      counts.total += n
    }
    return counts
  },

  /** Risk level and time of every scan since `since` (for daily charts). */
  async levelsSince(since: Date, userId?: string): Promise<Pick<ScanResult, 'riskLevel' | 'createdAt'>[]> {
    const docs = await ScanModel.find({ ...scope(userId), createdAt: { $gte: since } }, { riskLevel: 1, createdAt: 1 }).lean<
      Pick<ScanDoc, 'riskLevel' | 'createdAt'>[]
    >()
    return docs.map((d) => ({ riskLevel: d.riskLevel, createdAt: d.createdAt.toISOString() }))
  },

  async countSince(since: Date): Promise<number> {
    return ScanModel.countDocuments({ createdAt: { $gte: since } })
  },
}
