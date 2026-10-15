import { model, Schema, type InferSchemaType, type Types } from 'mongoose'

const checkSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    detail: { type: String, required: true },
    severity: { type: String, enum: ['pass', 'info', 'warn', 'fail'], required: true },
    weight: { type: Number, required: true },
  },
  { _id: false },
)

const reputationSchema = new Schema(
  {
    source: { type: String, enum: ['virustotal', 'safe-browsing'], required: true },
    status: { type: String, enum: ['clean', 'flagged', 'unavailable'], required: true },
    summary: { type: String, required: true },
  },
  { _id: false },
)

// A flagged scan's threat report. Embedded in its scan, so the two are always
// written together in one atomic insert and can never drift apart.
const reportSchema = new Schema(
  {
    category: {
      type: String,
      enum: ['credential-harvesting', 'brand-impersonation', 'urgency-scam', 'malicious-reputation', 'insecure-transport'],
      required: true,
    },
    title: { type: String, required: true },
    details: { type: String, required: true },
  },
  { _id: false },
)

const scanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['url', 'email'], required: true },
    content: { type: String, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    riskScore: { type: Number, min: 0, max: 100, required: true },
    threatStatus: { type: String, required: true },
    recommendation: { type: String, required: true },
    checks: { type: [checkSchema], default: [] },
    reputation: { type: [reputationSchema], default: [] },
    report: { type: reportSchema, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'scans' },
)

scanSchema.index({ userId: 1, createdAt: -1 })
scanSchema.index({ createdAt: -1 })

export type ScanDoc = InferSchemaType<typeof scanSchema> & { _id: Types.ObjectId; createdAt: Date }
export const ScanModel = model('Scan', scanSchema)
