import type { Request, Response } from 'express'
import { presentReports } from '@phishlens/core'
import { reportsRepo } from '../repositories/reports.repo.js'

export async function reportsController(req: Request, res: Response) {
  res.status(200).json({ reports: presentReports(await reportsRepo.listByUser(req.userId!)) })
}
