// Pure aggregations over scans. Used by the mock services today and suitable
// for the API's /stats endpoints later.

import type { DailyDetections, ScanResult, ScanStats } from "@/lib/types";

export function computeStats(scans: ScanResult[]): ScanStats {
  return {
    total: scans.length,
    safe: scans.filter((s) => s.riskLevel === "low").length,
    medium: scans.filter((s) => s.riskLevel === "medium").length,
    suspicious: scans.filter((s) => s.riskLevel === "high").length,
  };
}

/** One row per local calendar day, oldest first, ending today. */
export function computeDaily(scans: ScanResult[], days = 14, now = new Date()): DailyDetections[] {
  const rows: DailyDetections[] = [];
  const byDate = new Map<string, DailyDetections>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const row = { date: localDateKey(d), low: 0, medium: 0, high: 0 };
    byDate.set(row.date, row);
    rows.push(row);
  }
  for (const s of scans) {
    const row = byDate.get(localDateKey(new Date(s.createdAt)));
    if (row) row[s.riskLevel] += 1;
  }
  return rows;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
