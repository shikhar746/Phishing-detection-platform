import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { HttpError } from './lib/httpError.js'
import { errorHandler } from './middlewares/errorHandler.js'
import adminRoutes from './routes/admin.routes.js'
import authRoutes from './routes/auth.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import scansRoutes from './routes/scans.routes.js'

const app = express()

// Only trust X-Forwarded-For when there really is a proxy in front (see
// TRUST_PROXY); otherwise clients could choose the IP the rate limiter sees.
app.set('trust proxy', env.TRUST_PROXY)

app.use(helmet())
// The web app normally proxies /api so requests are same-origin; CORS covers
// clients that call the API directly. Cookies need credentials enabled.
app.use(
    cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    })
)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/scans', scansRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/admin', adminRoutes)

app.use(() => {
    throw new HttpError(404, 'NOT_FOUND', 'Route not found')
})

app.use(errorHandler)
export default app
