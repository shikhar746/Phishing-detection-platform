import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { HttpError } from './lib/httpError.js'

const app = express()

// behind Render / a reverse proxy, so rate limiting sees the real client IP
app.set('trust proxy', 1)

app.use(helmet())
// the web app runs on a different origin and authenticates with cookies, so
// CORS must name the allowed origins explicitly and allow credentials
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
app.use('/api/users', userRoutes)

app.use(() => {
    throw new HttpError(404, 'NOT_FOUND', 'Route not found')
})

app.use(errorHandler)
export default app
