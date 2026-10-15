import type { Request, Response } from 'express'
import { presentReports, scanReport } from '@phishlens/core'
import { scansRepo } from '../repositories/scans.repo.js'

// A threat report is a flagged scan, described by core's scanReport.
export async function reportsController(req: Request, res: Response) {
  const flagged = await scansRepo.listFlaggedByUser(req.userId!)
  res.status(200).json({ reports: presentReports(flagged.map(scanReport)) })
}
