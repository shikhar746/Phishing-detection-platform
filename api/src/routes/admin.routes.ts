import express from 'express'
import {
  addKeywordController,
  analyticsController,
  listKeywordsController,
  listUsersController,
  logsController,
  removeKeywordController,
  updateUserController,
} from '../controllers/admin.controller.js'
import { requireAdmin, requireAuth } from '../middlewares/auth.js'

const router = express.Router()

router.use(requireAuth, requireAdmin)
router.get('/analytics', analyticsController)
router.get('/users', listUsersController)
router.patch('/users/:id', updateUserController)
router.get('/logs', logsController)
router.get('/keywords', listKeywordsController)
router.post('/keywords', addKeywordController)
router.delete('/keywords/:id', removeKeywordController)

export default router
