import express from 'express'
import { reportsController } from '../controllers/reports.controller.js'
import { requireAuth } from '../middlewares/auth.js'

const router = express.Router()

router.get('/', requireAuth, reportsController)

export default router
