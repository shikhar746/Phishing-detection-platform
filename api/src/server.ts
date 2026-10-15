import { env } from './config/env.js'
import app from './app.js'
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from './lib/db.js'

// Connect before accepting traffic, so the first request never races the database.
await connectDb()
console.log(`[api] connected to MongoDB database "${mongoose.connection.name}"`)

const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[api] listening on port ${env.PORT} (${env.NODE_ENV})`)
    console.log(`[api] allowed origins: ${env.CORS_ORIGIN.join(', ')}`)
    console.log(`[api] google sign-in: ${env.GOOGLE_CLIENT_ID ? 'enabled' : 'disabled (GOOGLE_CLIENT_ID unset)'}`)
})

// Render (and most hosts) send SIGTERM on deploys: stop accepting requests,
// let in-flight ones finish, then close the database pool.
const SHUTDOWN_GRACE_MS = 10_000

async function shutdown() {
    const finish = () => void disconnectDb().finally(() => process.exit(0))
    server.close(finish)
    // keep-alive sockets (e.g. from the web proxy) would otherwise hold close() open forever
    server.closeIdleConnections()
    // last resort for requests that never finish
    setTimeout(() => {
        server.closeAllConnections()
        finish()
    }, SHUTDOWN_GRACE_MS).unref()
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => void shutdown())
