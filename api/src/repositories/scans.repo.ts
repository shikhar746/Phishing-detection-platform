import type { CheckResult, ReputationResult, RiskLevel, ScanReport, ScanResult, ScanType } from '@phishlens/core'
import { supabase } from '../lib/supabase.js'

// Reads and writes of `scan_history`, mapped to the shared ScanResult shape.

export interface ScanRow {
  id: string
  user_id: string
  scan_type: ScanType
  content: string
  risk_level: RiskLevel
  risk_score: number
  threat_status: string
  recommendation: string
  result: { checks: CheckResult[]; reputation: ReputationResult[] }
  created_at: string
}

export const toScan = (r: ScanRow): ScanResult => ({
  id: r.id,
  type: r.scan_type,
  content: r.content,
  riskLevel: r.risk_level,
  riskScore: r.risk_score,
  threatStatus: r.threat_status,
  recommendation: r.recommendation,
  checks: r.result.checks,
  reputation: r.result.reputation,
  createdAt: r.created_at,
  userId: r.user_id,
})

export type UnsavedScan = Omit<ScanResult, 'id' | 'createdAt' | 'userId'>
export type ReportFields = Pick<ScanReport, 'category' | 'title' | 'details'>
export type LevelCounts = Record<RiskLevel, number> & { total: number }

const HISTORY_LIMIT = 500

async function count(build: (q: ReturnType<typeof base>) => ReturnType<typeof base>): Promise<number> {
  const { count: n, error } = await build(base())
  if (error) throw error
  return n ?? 0
}
const base = () => supabase.from('scan_history').select('id', { count: 'exact', head: true })

export const scansRepo = {
  /** Saves a scan and, when flagged, its report — atomically (see record_scan in infra/schema.sql). */
  async record(userId: string, scan: UnsavedScan, report: ReportFields | null): Promise<ScanResult> {
    const { data, error } = await supabase.rpc('record_scan', {
      p_scan: {
        user_id: userId,
        scan_type: scan.type,
        content: scan.content,
        risk_level: scan.riskLevel,
        risk_score: scan.riskScore,
        threat_status: scan.threatStatus,
        recommendation: scan.recommendation,
        result: { checks: scan.checks, reputation: scan.reputation },
      },
      p_report: report,
    })
    if (error) throw error
    return toScan(data as ScanRow)
  },

  /** A user's scans, newest first. */
  async listByUser(userId: string): Promise<ScanResult[]> {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)
    if (error) throw error
    return (data as ScanRow[]).map(toScan)
  },

  /** Platform-wide detection log, newest first. */
  async listRecent(limit = HISTORY_LIMIT): Promise<ScanResult[]> {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as ScanRow[]).map(toScan)
  },

  /** Scans per risk level, for one user or (without a user) the whole platform. */
  async levelCounts(userId?: string): Promise<LevelCounts> {
    const scoped = (q: ReturnType<typeof base>) => (userId ? q.eq('user_id', userId) : q)
    const [total, low, medium, high] = await Promise.all([
      count(scoped),
      count((q) => scoped(q).eq('risk_level', 'low')),
      count((q) => scoped(q).eq('risk_level', 'medium')),
      count((q) => scoped(q).eq('risk_level', 'high')),
    ])
    return { total, low, medium, high }
  },

  /** Risk level and time of every scan since `since` (for daily charts). */
  async levelsSince(since: Date, userId?: string): Promise<Pick<ScanResult, 'riskLevel' | 'createdAt'>[]> {
    let q = supabase.from('scan_history').select('risk_level, created_at').gte('created_at', since.toISOString())
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error) throw error
    return (data as Pick<ScanRow, 'risk_level' | 'created_at'>[]).map((r) => ({ riskLevel: r.risk_level, createdAt: r.created_at }))
  },

  async countSince(since: Date): Promise<number> {
    return count((q) => q.gte('created_at', since.toISOString()))
  },
}
