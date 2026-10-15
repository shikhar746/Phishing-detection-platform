import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from '../config/env.js'

/** The database to use: MONGODB_DB, else the name in the URI, else "phishlens". */
export function databaseName(uri: string, override?: string): string {
  if (override) return override
  // mongodb://host/name?opts and mongodb+srv://host/name: the path after the host
  const fromUri = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/.exec(uri)?.[1]
  return fromUri ? decodeURIComponent(fromUri) : 'phishlens'
}

/** Opens the shared Mongoose connection and makes sure every model's indexes exist. */
export async function connectDb(uri = env.MONGODB_URI, dbName = databaseName(uri, env.MONGODB_DB)): Promise<void> {
  // mongodb+srv:// needs an SRV lookup, which some local resolvers refuse
  if (env.DNS_SERVERS.length) dns.setServers(env.DNS_SERVERS)
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000 })
  // unique indexes back real rules (one account per email, no duplicate keywords)
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()))
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect()
}

/** A 24-hex-digit MongoDB ObjectId string (stricter than mongoose.isValidObjectId). */
export const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)
