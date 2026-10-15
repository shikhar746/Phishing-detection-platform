import type { Request, Response } from 'express'
import { z } from 'zod'
import { HttpError, parse } from '../lib/httpError.js'
import { usersRepo } from '../repositories/users.repo.js'

const lookupQuery = z.object({
  email: z
    .string({ message: 'Query parameter email must be a valid address' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: 'Query parameter email must be a valid address' })),
})

// Exact-address lookup only. Deliberately no prefix or partial matching: you
// have to already know the whole address, which keeps this from being a
// directory dump.
export async function lookupUserController(req: Request, res: Response) {
  const { email } = parse(lookupQuery, req.query)

  const user = await usersRepo.findByEmail(email)
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'No account with that email')

  // never leak the password hash or Google id
  res.status(200).json({ user: { id: user.id, email: user.email, name: user.name } })
}
