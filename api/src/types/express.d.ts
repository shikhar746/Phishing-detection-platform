import type { PublicUser } from '../repositories/users.repo.js'

// requireAuth / optionalAuth put the signed-in, active account on the request
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
      userId?: string
    }
  }
}

export {}
