import express from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { lookupUserController } from '../controllers/user.controller.js'

const router = express.Router()

router.get('/lookup', requireAuth, lookupUserController)

export default router
