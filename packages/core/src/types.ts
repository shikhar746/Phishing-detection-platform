// Shared domain types: the API contract and the shape of stored documents.
// Every closed set of values is a const list with its type derived from it,
// so database schemas can use the same lists instead of re-typing them.

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const SCAN_TYPES = ["url", "email"] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CHECK_SEVERITIES = ["pass", "info", "warn", "fail"] as const;
export type CheckSeverity = (typeof CHECK_SEVERITIES)[number];

export const REPUTATION_SOURCES = ["virustotal", "safe-browsing"] as const;
export const REPUTATION_STATUSES = ["clean", "flagged", "unavailable"] as const;

/** One rule or API check that contributed to the score. */
export interface CheckResult {
  id: string;
  label: string;
  detail: string;
  severity: CheckSeverity;
  /** Points this check added to the risk score (0 for passes). */
  weight: number;
}

export interface ReputationResult {
  source: (typeof REPUTATION_SOURCES)[number];
  status: (typeof REPUTATION_STATUSES)[number];
  /** e.g. "3 / 92 engines" or "SOCIAL_ENGINEERING". */
  summary: string;
}

export interface ScanResult {
  id: string;
  type: ScanType;
  /** URL, or the first part of the email text. */
  content: string;
  riskLevel: RiskLevel;
  /** 0–100 */
  riskScore: number;
  threatStatus: string;
  recommendation: string;
  checks: CheckResult[];
  reputation: ReputationResult[];
  createdAt: string;
  userId?: string;
}

export interface ScanStats {
  total: number;
  safe: number;
  medium: number;
  suspicious: number;
}

export interface DailyDetections {
  /** ISO date (yyyy-mm-dd) */
  date: string;
  low: number;
  medium: number;
  high: number;
}

export const THREAT_CATEGORIES = [
  "credential-harvesting",
  "brand-impersonation",
  "urgency-scam",
  "malicious-reputation",
  "insecure-transport",
] as const;
export type ThreatCategory = (typeof THREAT_CATEGORIES)[number];

interface ReportBase {
  id: string;
  title: string;
  category: ThreatCategory;
  riskLevel: RiskLevel;
  details: string;
  createdAt: string;
}

/** Generated from one flagged scan. */
export interface ScanReport extends ReportBase {
  reportType: "scan";
  scan: ScanResult;
}

/** Periodic roll-up across a user's scan reports. */
export interface SummaryReport extends ReportBase {
  reportType: "summary";
}

export type ThreatReport = ScanReport | SummaryReport;

export interface AdminUser extends User {
  status: UserStatus;
  scans: number;
  lastActive: string;
  createdAt: string;
}

/** Display order for the admin keyword panel. */
export const KEYWORD_CATEGORIES = ["url", "brand", "urgency", "threat", "credential", "scam"] as const;
export type KeywordCategory = (typeof KEYWORD_CATEGORIES)[number];

export interface SuspiciousKeyword {
  id: string;
  term: string;
  category: KeywordCategory;
  /** Points added when matched. */
  weight: number;
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  scansToday: number;
  threatsDetected: number;
  detectionRate: number;
  activeKeywords: number;
}
