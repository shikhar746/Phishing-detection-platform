import { Types } from 'mongoose'
import type { ScanReport } from '@phishlens/core'
import { ScanModel, type ScanDoc } from '../models/scan.model.js'
import { toScan } from './scans.repo.js'

// Reports live inside their scan documents (written by scansRepo.record), so
// this module only reads them back.

export const reportsRepo = {
  /** A user's reports with their scans, newest first. */
  async listByUser(userId: string): Promise<ScanReport[]> {
    const docs = await ScanModel.find({ userId: new Types.ObjectId(userId), report: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean<ScanDoc[]>()
    return docs.map((d) => {
      const scan = toScan(d)
      const report = d.report!
      return {
        id: `rpt_${scan.id}`,
        reportType: 'scan',
        category: report.category as ScanReport['category'],
        riskLevel: scan.riskLevel,
        title: report.title,
        details: report.details,
        createdAt: scan.createdAt,
        scan,
      }
    })
  },
}
