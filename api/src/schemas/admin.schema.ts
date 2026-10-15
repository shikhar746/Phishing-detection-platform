import { KEYWORD_CATEGORIES, normalizeKeywordTerm } from '@phishlens/core'
import { z } from 'zod'
import { isObjectId } from '../lib/db.js'

export const idParam = z.object({ id: z.string().refine(isObjectId, 'Invalid id') })

export const userPatchSchema = z
  .object({
    role: z.enum(['user', 'admin']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .strict()
  .refine((p) => p.role !== undefined || p.status !== undefined, { message: 'Change role or status' })

export const keywordSchema = z.object({
  term: z
    .string()
    .transform(normalizeKeywordTerm)
    .pipe(z.string().min(3, 'Keywords need at least 3 characters').max(60, 'Keep keywords under 60 characters')),
  category: z.enum(KEYWORD_CATEGORIES),
  weight: z.number().int().min(1).max(50),
})
