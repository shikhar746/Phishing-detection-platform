import { Types } from 'mongoose'
import type { CheckResult, ReputationResult, RiskLevel, ScanReport, ScanResult, ScanType } from '@phishlens/core'
import { ScanModel, type ScanDoc } from '../models/scan.model.js'

// Reads and writes of scans, mapped to the shared ScanResult shape.

export type UnsavedScan = Omit<ScanResult, 'id' | 'createdAt' | 'userId'>
export type ReportFields = Pick<ScanReport, 'category' | 'title' | 'details'>
export type LevelCounts = Record<RiskLevel, number> & { total: number }

const HISTORY_LIMIT = 500

export const toScan = (d: ScanDoc): ScanResult => ({
  id: d._id.toString(),
  type: d.type as ScanType,
  content: d.content,
  riskLevel: d.riskLevel as RiskLevel,
  riskScore: d.riskScore,
  threatStatus: d.threatStatus,
  recommendation: d.recommendation,
  checks: d.checks as CheckResult[],
  reputation: d.reputation as ReputationResult[],
  createdAt: d.createdAt.toISOString(),
  userId: d.userId.toString(),
})

const scope = (userId?: string) => (userId ? { userId: new Types.ObjectId(userId) } : {})

export const scansRepo = {
  /** Saves a scan and, when flagged, its report: one document, so one atomic write. */
  async record(userId: string, scan: UnsavedScan, report: ReportFields | null): Promise<ScanResult> {
    const doc = await ScanModel.create({ ...scan, userId: new Types.ObjectId(userId), report })
    return toScan(doc.toObject() as ScanDoc)
  },

  /** A user's scans, newest first. */
  async listByUser(userId: string): Promise<ScanResult[]> {
    const docs = await ScanModel.find(scope(userId)).sort({ createdAt: -1 }).limit(HISTORY_LIMIT).lean<ScanDoc[]>()
    return docs.map(toScan)
  },

  /** Platform-wide detection log, newest first. */
  async listRecent(limit = HISTORY_LIMIT): Promise<ScanResult[]> {
    const docs = await ScanModel.find().sort({ createdAt: -1 }).limit(limit).lean<ScanDoc[]>()
    return docs.map(toScan)
  },

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
    return docs.map((d) => ({ riskLevel: d.riskLevel as RiskLevel, createdAt: d.createdAt.toISOString() }))
  },

  async countSince(since: Date): Promise<number> {
    return ScanModel.countDocuments({ createdAt: { $gte: since } })
  },
}
