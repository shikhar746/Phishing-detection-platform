import type { ScanReport } from '@phishlens/core'
import { supabase } from '../lib/supabase.js'
import { toScan, type ScanRow } from './scans.repo.js'

// Reads of `reports`. Rows are written together with their scan by
// scansRepo.record, so this module only reads.

interface ReportRow {
  id: string
  category: ScanReport['category']
  risk_level: ScanReport['riskLevel']
  title: string
  details: string
  created_at: string
  scan: ScanRow
}

const toReport = (r: ReportRow): ScanReport => ({
  id: r.id,
  reportType: 'scan',
  category: r.category,
  riskLevel: r.risk_level,
  title: r.title,
  details: r.details,
  createdAt: r.created_at,
  scan: toScan(r.scan),
})

export const reportsRepo = {
  /** A user's reports with their scans, newest first. */
  async listByUser(userId: string): Promise<ScanReport[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('id, category, risk_level, title, details, created_at, scan:scan_history(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data as unknown as ReportRow[]).map(toReport)
  },
}
