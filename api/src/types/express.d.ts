// requireAuth puts the verified user id on the request
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export {}
