// A local MongoDB for development, no installation needed:
//   npm run db:local -w api
// Listens on 127.0.0.1:27017 (the default MONGODB_URI) and keeps its data in
// api/.mongo-data between runs. Uses the same MongoDB binary as the test suite.
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MongoMemoryServer } from 'mongodb-memory-server'

const dbPath = fileURLToPath(new URL('../.mongo-data', import.meta.url))
mkdirSync(dbPath, { recursive: true })

const server = await MongoMemoryServer.create({
  instance: { ip: '127.0.0.1', port: Number(process.env.MONGO_PORT ?? 27017), dbPath, storageEngine: 'wiredTiger' },
})
console.log(`[db] MongoDB running at ${server.getUri()} — data in api/.mongo-data. Ctrl+C to stop.`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    // keep the data directory: this is a dev database, not a throwaway test one
    await server.stop({ doCleanup: false })
    process.exit(0)
  })
}
