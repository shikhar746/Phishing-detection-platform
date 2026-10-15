import express from 'express'
import { historyController, scanEmailController, scanUrlController, statsController } from '../controllers/scans.controller.js'
import { optionalAuth, requireAuth } from '../middlewares/auth.js'
import { scanLimiter } from '../middlewares/rateLimit.js'

const router = express.Router()

// anyone may scan; signed-in users' scans are saved to their history
router.post('/url', optionalAuth, scanLimiter, scanUrlController)
router.post('/email', optionalAuth, scanLimiter, scanEmailController)
router.get('/', requireAuth, historyController)
router.get('/stats', requireAuth, statsController)

export default router
