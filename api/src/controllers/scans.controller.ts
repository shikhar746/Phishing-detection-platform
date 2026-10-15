import type { Request, Response } from 'express'
import { computeDaily } from '@phishlens/core'
import { parse } from '../lib/httpError.js'
import { scansRepo } from '../repositories/scans.repo.js'
import { emailScanSchema, urlScanSchema } from '../schemas/scan.schema.js'
import { scanEmail, scanUrl } from '../services/scanner.js'

const CHART_DAYS = 14

/** Midnight (server time) at the start of a window of `days` days ending today. */
export function windowStart(days = CHART_DAYS, now = new Date()): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

export async function scanUrlController(req: Request, res: Response) {
  const { url } = parse(urlScanSchema, req.body)
  res.status(201).json({ scan: await scanUrl(url, req.userId) })
}

export async function scanEmailController(req: Request, res: Response) {
  const { content } = parse(emailScanSchema, req.body)
  res.status(201).json({ scan: await scanEmail(content, req.userId) })
}

export async function historyController(req: Request, res: Response) {
  res.status(200).json({ scans: await scansRepo.listByUser(req.userId!) })
}

export async function statsController(req: Request, res: Response) {
  const userId = req.userId!
  const [counts, recent] = await Promise.all([scansRepo.levelCounts(userId), scansRepo.levelsSince(windowStart(), userId)])
  res.status(200).json({
    stats: { total: counts.total, safe: counts.low, medium: counts.medium, suspicious: counts.high },
    daily: computeDaily(recent, CHART_DAYS),
  })
}
