import type { KeywordRule, SuspiciousKeyword } from '@phishlens/core'
import { isObjectId } from '../lib/db.js'
import { KeywordModel, type KeywordDoc } from '../models/keyword.model.js'

// Reads and writes of the admin-managed keyword list the analyzer uses.

const toKeyword = (d: KeywordDoc): SuspiciousKeyword => ({
  id: d._id.toString(),
  term: d.term,
  category: d.category as SuspiciousKeyword['category'],
  weight: d.weight,
  createdAt: d.createdAt.toISOString(),
})

export class DuplicateKeywordError extends Error {
  constructor() {
    super('That keyword is already on the list')
    this.name = 'DuplicateKeywordError'
  }
}

export const keywordsRepo = {
  async list(): Promise<SuspiciousKeyword[]> {
    const docs = await KeywordModel.find().sort({ createdAt: -1 }).lean<KeywordDoc[]>()
    return docs.map(toKeyword)
  },

  async add(rule: KeywordRule): Promise<SuspiciousKeyword> {
    try {
      const doc = await KeywordModel.create(rule)
      return toKeyword(doc.toObject() as KeywordDoc)
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new DuplicateKeywordError()
      throw err
    }
  },

  /** Returns false when there was no such keyword. */
  async remove(id: string): Promise<boolean> {
    if (!isObjectId(id)) return false
    return (await KeywordModel.deleteOne({ _id: id })).deletedCount > 0
  },

  /** Inserts any of `rules` not already present; returns how many were added. */
  async seed(rules: KeywordRule[]): Promise<number> {
    const result = await KeywordModel.bulkWrite(
      rules.map((rule) => ({
        updateOne: { filter: { term: rule.term, category: rule.category }, update: { $setOnInsert: rule }, upsert: true },
      })),
    )
    return result.upsertedCount
  },
}
