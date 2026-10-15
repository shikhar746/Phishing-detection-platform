import type { Request, Response } from 'express'
import { computeDaily, type AdminAnalytics } from '@phishlens/core'
import { HttpError, parse } from '../lib/httpError.js'
import { DuplicateKeywordError, keywordsRepo } from '../repositories/keywords.repo.js'
import { scansRepo } from '../repositories/scans.repo.js'
import { usersRepo } from '../repositories/users.repo.js'
import { idParam, keywordSchema, userPatchSchema } from '../schemas/admin.schema.js'
import { invalidateKeywords } from '../services/keywords.js'
import { windowStart } from './scans.controller.js'

export async function analyticsController(_req: Request, res: Response) {
  const [users, counts, scansToday, keywords, recent] = await Promise.all([
    usersRepo.counts(),
    scansRepo.levelCounts(),
    scansRepo.countSince(windowStart(1)),
    keywordsRepo.count(),
    scansRepo.levelsSince(windowStart()),
  ])
  const analytics: AdminAnalytics = {
    totalUsers: users.total,
    activeUsers: users.active,
    scansToday,
    threatsDetected: counts.high,
    detectionRate: counts.total ? Math.round((counts.high / counts.total) * 100) : 0,
    activeKeywords: keywords,
  }
  res.status(200).json({ analytics, daily: computeDaily(recent) })
}

export async function listUsersController(_req: Request, res: Response) {
  res.status(200).json({ users: await usersRepo.listOverview() })
}

export async function updateUserController(req: Request, res: Response) {
  const { id } = parse(idParam, req.params)
  const patch = parse(userPatchSchema, req.body)
  // an admin locking themselves out (or demoting the last admin) is never intended
  if (id === req.userId) throw new HttpError(400, 'CANNOT_CHANGE_SELF', 'You cannot change your own role or status')

  const user = await usersRepo.update(id, patch)
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found')
  res.status(200).json({ user })
}

export async function logsController(_req: Request, res: Response) {
  res.status(200).json({ scans: await scansRepo.listRecent() })
}

export async function listKeywordsController(_req: Request, res: Response) {
  res.status(200).json({ keywords: await keywordsRepo.list() })
}

export async function addKeywordController(req: Request, res: Response) {
  const rule = parse(keywordSchema, req.body)
  const keyword = await keywordsRepo.add(rule).catch((err: unknown) => {
    throw err instanceof DuplicateKeywordError ? new HttpError(409, 'KEYWORD_EXISTS', err.message) : err
  })
  invalidateKeywords()
  res.status(201).json({ keyword })
}

export async function removeKeywordController(req: Request, res: Response) {
  const { id } = parse(idParam, req.params)
  if (!(await keywordsRepo.remove(id))) throw new HttpError(404, 'KEYWORD_NOT_FOUND', 'Keyword not found')
  invalidateKeywords()
  res.status(204).end()
}
