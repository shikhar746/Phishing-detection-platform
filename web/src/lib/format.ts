import type { KeywordCategory, RiskLevel, ThreatCategory } from "@/lib/types";

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

export function shortContent(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, " ").trim().replace(/^https?:\/\//, "");
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return formatDate(iso);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en").format(n);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
