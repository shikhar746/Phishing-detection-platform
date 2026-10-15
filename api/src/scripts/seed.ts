// Seeds the keyword list and, optionally, makes an existing account an admin.
//   npm run seed -w api
//   npm run seed -w api -- --admin you@example.com
import { DEFAULT_KEYWORDS } from '@phishlens/core'
import { connectDb, disconnectDb } from '../lib/db.js'
import { UserModel } from '../models/user.model.js'
import { keywordsRepo } from '../repositories/keywords.repo.js'

async function main() {
  await connectDb()
  try {
    const added = await keywordsRepo.seed(DEFAULT_KEYWORDS)
    console.log(`keywords: added ${added} of ${DEFAULT_KEYWORDS.length} defaults (existing ones kept)`)

    const flag = process.argv.indexOf('--admin')
    const email = flag >= 0 ? process.argv[flag + 1]?.trim().toLowerCase() : undefined
    if (email) {
      const { matchedCount } = await UserModel.updateOne({ email }, { role: 'admin' })
      console.log(matchedCount ? `admin: ${email} is now an admin` : `admin: no account for ${email} (register first)`)
    }
  } finally {
    await disconnectDb()
  }
}

main().catch((err: unknown) => {
  console.error('seed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
