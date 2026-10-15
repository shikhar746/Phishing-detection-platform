// Threat reports. The API stores one report row per flagged scan (the
// `reports` table); both the API and the web demo mode build those rows and
// the summary with these functions, so the wording never diverges.

import { categorize } from "./analysis/score.js";
import { CATEGORY_LABEL, shortContent } from "./labels.js";
import type { ScanReport, ScanResult, SummaryReport, ThreatCategory, ThreatReport } from "./types.js";

/** Medium and high results become reports; low ones do not. */
export const isFlagged = (scan: Pick<ScanResult, "riskLevel">) => scan.riskLevel !== "low";

/** The report for one flagged scan. */
export function scanReport(scan: ScanResult): ScanReport {
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

function summaryReport(reports: ScanReport[], now: Date): SummaryReport {
  const counts = new Map<ThreatCategory, number>();
  reports.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
  const [top, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
  return {
    id: "rpt_summary",
    title: "Threat summary",
    reportType: "summary",
    category: top,
    riskLevel: reports.some((r) => r.riskLevel === "high") ? "high" : "medium",
    details: `${reports.length} distinct threat${reports.length === 1 ? "" : "s"} across your scans. Most common pattern: ${CATEGORY_LABEL[top].toLowerCase()} (${topCount}).`,
    createdAt: now.toISOString(),
  };
}

/**
 * What a user sees on the reports page: one report per distinct scanned
 * content (the newest wins), preceded by a summary when there is anything
 * to summarize. `reports` must be ordered newest first.
 */
export function presentReports(reports: ScanReport[], now = new Date()): ThreatReport[] {
  const seen = new Set<string>();
  const distinct = reports.filter((r) => !seen.has(r.scan.content) && seen.add(r.scan.content));
  return distinct.length ? [summaryReport(distinct, now), ...distinct] : [];
}
