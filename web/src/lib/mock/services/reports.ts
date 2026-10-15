import { categorize } from "@/lib/analysis/score";
import { CATEGORY_LABEL, shortContent } from "@/lib/format";
import type { ReportService } from "@/lib/services/reports";
import type { ScanReport, ScanResult, SummaryReport, ThreatCategory } from "@/lib/types";
import { db, latency } from "../store";

function scanReport(scan: ScanResult): ScanReport {
  const category = categorize(scan.checks);
  const fired = scan.checks.filter((c) => c.weight > 0);
  return {
    id: `rpt_${scan.id}`,
    title: `${CATEGORY_LABEL[category]}: ${shortContent(scan.content, 48)}`,
    reportType: "scan",
    category,
    riskLevel: scan.riskLevel,
    details: `${scan.threatStatus} — ${fired.length} indicator${fired.length === 1 ? "" : "s"} triggered. ${fired[0]?.detail ?? ""}`,
    scan,
    createdAt: scan.createdAt,
  };
}

function summaryReport(reports: ScanReport[]): SummaryReport {
  const counts = new Map<ThreatCategory, number>();
  reports.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
  const [top, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
  return {
    id: "rpt_weekly",
    title: "Weekly threat summary",
    reportType: "summary",
    category: top,
    riskLevel: reports.some((r) => r.riskLevel === "high") ? "high" : "medium",
    details: `${reports.length} distinct threats across your scans in the last 14 days. Most common pattern: ${CATEGORY_LABEL[top].toLowerCase()} (${topCount}).`,
    createdAt: new Date().toISOString(),
  };
}

export const mockReportService: ReportService = {
  async list() {
    await latency();
    // One report per distinct flagged content, newest scan wins (scans are newest-first).
    const newestFlagged = new Map<string, ScanResult>();
    for (const scan of db.scans.mine()) {
      if (scan.riskLevel !== "low" && !newestFlagged.has(scan.content)) newestFlagged.set(scan.content, scan);
    }
    const reports = [...newestFlagged.values()].map(scanReport);
    return reports.length ? [summaryReport(reports), ...reports] : [];
  },
};
