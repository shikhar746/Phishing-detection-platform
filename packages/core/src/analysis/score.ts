// Turns rule results into a verdict: score, level, status and recommendation.
// Pure, so the API can reuse it unchanged.

import type { CheckResult, ReputationResult, RiskLevel, ScanType, ThreatCategory } from "../types.js";

/** Risk thresholds on the 0–100 score. */
export const RISK_THRESHOLDS = { medium: 35, high: 65 } as const;

export interface Analysis {
  riskScore: number;
  riskLevel: RiskLevel;
  threatStatus: string;
  recommendation: string;
  checks: CheckResult[];
  reputation: ReputationResult[];
}

/** A rule inspects some context and either flags something or says it passed (or stays silent). */
export type Rule<Ctx> = (ctx: Ctx) => CheckResult | null;

export function runRules<Ctx>(rules: Rule<Ctx>[], ctx: Ctx): CheckResult[] {
  return rules.map((rule) => rule(ctx)).filter((c): c is CheckResult => c !== null);
}

export const passed = (id: string, label: string, detail: string): CheckResult => ({ id, label, detail, severity: "pass", weight: 0 });

const REPUTATION_WEIGHT: Record<ReputationResult["source"], number> = {
  virustotal: 10,
  "safe-browsing": 12,
};

function reputationCheck(r: ReputationResult): CheckResult {
  return {
    id: `rep-${r.source}`,
    label: r.source === "virustotal" ? "VirusTotal reputation" : "Google Safe Browsing",
    detail: r.summary,
    severity: r.status === "flagged" ? "fail" : r.status === "clean" ? "pass" : "info",
    weight: r.status === "flagged" ? REPUTATION_WEIGHT[r.source] : 0,
  };
}

export function levelForScore(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) return "high";
  if (score >= RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

const STATUS: Record<ScanType, Record<RiskLevel, string>> = {
  url: { low: "Likely Safe", medium: "Potentially Suspicious", high: "Suspicious Website" },
  email: {
    low: "No Phishing Indicators",
    medium: "Potentially Suspicious Message",
    high: "Possible Phishing Attempt Detected",
  },
};

const RECOMMENDATION: Record<ScanType, Record<RiskLevel, string>> = {
  url: { low: "Safe to Visit", medium: "Proceed with Caution", high: "Avoid Visiting" },
  email: { low: "Looks Safe to Read", medium: "Verify the Sender First", high: "Do Not Click or Reply" },
};

/**
 * A reputation hit is evidence, not a hint: a URL Google lists as unsafe, or
 * that security vendors flag, is high risk however clean the address looks.
 * So a flagged result sets a minimum score instead of only adding points.
 */
const REPUTATION_FLOOR: Record<ReputationResult["source"], number> = {
  virustotal: RISK_THRESHOLDS.high,
  "safe-browsing": 85,
};

/** Sums rule and reputation weights (capped at 100) into the final verdict. */
export function score(type: ScanType, ruleChecks: CheckResult[], reputation: ReputationResult[] = []): Analysis {
  const checks = [...ruleChecks, ...reputation.map(reputationCheck)];
  const sum = Math.round(checks.reduce((total, c) => total + c.weight, 0));
  const floor = Math.max(0, ...reputation.filter((r) => r.status === "flagged").map((r) => REPUTATION_FLOOR[r.source]));
  const riskScore = Math.min(100, Math.max(sum, floor));
  const riskLevel = levelForScore(riskScore);
  return {
    riskScore,
    riskLevel,
    threatStatus: STATUS[type][riskLevel],
    recommendation: RECOMMENDATION[type][riskLevel],
    checks,
    reputation,
  };
}

/** Primary threat category for a scan, used to group threat reports. */
export function categorize(checks: CheckResult[]): ThreatCategory {
  const failed = new Set(checks.filter((c) => c.weight > 0).map((c) => c.id));
  if (failed.has("rep-safe-browsing") || failed.has("rep-virustotal")) return "malicious-reputation";
  if (failed.has("brand")) return "brand-impersonation";
  if (failed.has("credential")) return "credential-harvesting";
  if (failed.has("threat") || failed.has("urgency") || failed.has("scam")) return "urgency-scam";
  return "insecure-transport";
}
