import type { KeywordCategory, RiskLevel, ThreatCategory } from "./types.js";

export const RISK_LABEL: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High" };

export const CATEGORY_LABEL: Record<ThreatCategory, string> = {
  "credential-harvesting": "Credential harvesting",
  "brand-impersonation": "Brand impersonation",
  "urgency-scam": "Urgency scam",
  "malicious-reputation": "Known malicious",
  "insecure-transport": "Insecure link",
};

export const KEYWORD_CATEGORY_LABEL: Record<KeywordCategory, string> = {
  url: "URL",
  brand: "Brand",
  urgency: "Urgency",
  threat: "Threat",
  credential: "Credential",
  scam: "Scam",
};

/** One-line preview of scanned content, scheme stripped, ellipsized at `max`. */
export function shortContent(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, " ").trim().replace(/^https?:\/\//, "");
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
