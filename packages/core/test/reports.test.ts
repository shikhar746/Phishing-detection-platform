import { describe, expect, it } from "vitest";
import { analyzeEmail, analyzeUrl, DEFAULT_KEYWORDS, isFlagged, presentReports, scanReport, type ScanResult } from "../src/index.js";

let n = 0;
function scan(content: string, createdAt: string): ScanResult {
  const analysis = content.startsWith("http") ? analyzeUrl(content, DEFAULT_KEYWORDS) : analyzeEmail(content, DEFAULT_KEYWORDS);
  return { id: `s${++n}`, type: content.startsWith("http") ? "url" : "email", content, createdAt, ...analysis };
}

const phishing = scan("http://secure-paypal-login-free.com", "2026-10-10T10:00:00Z");
const phishingAgain = scan("http://secure-paypal-login-free.com", "2026-10-11T10:00:00Z");
const bankEmail = scan("Your bank account will be suspended. Verify immediately.", "2026-10-09T10:00:00Z");
const safe = scan("https://github.com", "2026-10-11T09:00:00Z");

describe("reports", () => {
  it("only medium and high scans are flagged", () => {
    expect(isFlagged(phishing)).toBe(true);
    expect(isFlagged(safe)).toBe(false);
  });

  it("describes a flagged scan by its main threat pattern", () => {
    const r = scanReport(phishing);
    expect(r.category).toBe("brand-impersonation");
    expect(r.title).toBe("Brand impersonation: secure-paypal-login-free.com");
    expect(r.details).toMatch(/^Suspicious Website — \d+ indicators triggered\./);
  });

  it("shows one report per distinct content, newest first, after a summary", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    const shown = presentReports([phishingAgain, phishing, bankEmail].map(scanReport), now);
    expect(shown.map((r) => r.reportType)).toEqual(["summary", "scan", "scan"]);
    expect(shown[1]).toMatchObject({ reportType: "scan", scan: { id: phishingAgain.id } });
    expect(shown[0]).toMatchObject({ riskLevel: "high", createdAt: now.toISOString() });
    expect(shown[0]!.details).toMatch(/^2 distinct threats/);
  });

  it("has nothing to show without flagged scans", () => {
    expect(presentReports([])).toEqual([]);
  });
});
