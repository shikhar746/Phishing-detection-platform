// A real MongoDB (mongodb-memory-server) for the database tests. The first
// run downloads a mongod binary into the user cache, so allow it time.
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach } from 'vitest'

export function useRealMongo() {
  let server: MongoMemoryServer

  beforeAll(async () => {
    server = await MongoMemoryServer.create()
    const { connectDb } = await import('../src/lib/db.js')
    await connectDb(server.getUri(), 'phishlens-test')
  }, 180_000)

  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
  })

  afterAll(async () => {
    const { disconnectDb } = await import('../src/lib/db.js')
    await disconnectDb()
    await server?.stop()
  })
}
