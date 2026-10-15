import { model, Schema, type InferSchemaType, type Types } from 'mongoose'
import { KEYWORD_CATEGORIES } from '@phishlens/core'

const keywordSchema = new Schema(
  {
    term: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, enum: KEYWORD_CATEGORIES, required: true },
    weight: { type: Number, min: 1, max: 50, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'keywords' },
)

keywordSchema.index({ term: 1, category: 1 }, { unique: true })

export type KeywordDoc = InferSchemaType<typeof keywordSchema> & { _id: Types.ObjectId; createdAt: Date }
export const KeywordModel = model('Keyword', keywordSchema)
