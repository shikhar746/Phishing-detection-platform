import { model, Schema, type InferSchemaType, type Types } from 'mongoose'
import { CHECK_SEVERITIES, REPUTATION_SOURCES, REPUTATION_STATUSES, RISK_LEVELS, SCAN_TYPES } from '@phishlens/core'

const checkSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    detail: { type: String, required: true },
    severity: { type: String, enum: CHECK_SEVERITIES, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false },
)

const reputationSchema = new Schema(
  {
    source: { type: String, enum: REPUTATION_SOURCES, required: true },
    status: { type: String, enum: REPUTATION_STATUSES, required: true },
    summary: { type: String, required: true },
  },
  { _id: false },
)

// A medium or high scan is also a threat report; the report's wording is
// derived from the scan (scanReport in @phishlens/core), so nothing extra is stored.
const scanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SCAN_TYPES, required: true },
    content: { type: String, required: true },
    riskLevel: { type: String, enum: RISK_LEVELS, required: true },
    riskScore: { type: Number, min: 0, max: 100, required: true },
    threatStatus: { type: String, required: true },
    recommendation: { type: String, required: true },
    checks: { type: [checkSchema], default: [] },
    reputation: { type: [reputationSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'scans' },
)

scanSchema.index({ userId: 1, createdAt: -1 })
scanSchema.index({ createdAt: -1 })

export type ScanDoc = InferSchemaType<typeof scanSchema> & { _id: Types.ObjectId; createdAt: Date }
export const ScanModel = model('Scan', scanSchema)
