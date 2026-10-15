// Realistic seed data for mock mode. Scans are produced by running the real
// analyzer over sample inputs, so every check and score is self-consistent.
// All domains below are fictional examples.

import { DEFAULT_KEYWORDS, analyzeEmail, analyzeUrl, type AdminUser, type KeywordRule, type ReputationResult, type ScanResult, type ScanType, type SuspiciousKeyword } from "@phishlens/core";

/** Scans seeded for whoever is signed in use this owner id. */
export const SELF = "self";

/** Small deterministic PRNG so seed data is stable between reloads. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Stand-in for VirusTotal + Google Safe Browsing. The real API calls replace
 * this; until then reputation follows the rule-based score so demos are coherent.
 */
export function mockReputation(url: string, ruleScore: number): ReputationResult[] {
  const engines = 94;
  const flaggedBy = 4 + (hash(url) % 11);
  return [
    ruleScore >= 60
      ? { source: "virustotal", status: "flagged", summary: `${flaggedBy} / ${engines} security vendors flagged this URL.` }
      : { source: "virustotal", status: "clean", summary: `0 / ${engines} security vendors flagged this URL.` },
    ruleScore >= 70
      ? { source: "safe-browsing", status: "flagged", summary: "Listed as SOCIAL_ENGINEERING (deceptive site)." }
      : { source: "safe-browsing", status: "clean", summary: "Not on Google's unsafe-site lists." },
  ];
}

/** Rule analysis plus simulated reputation — what the real API will return for a URL. */
export function analyzeUrlWithMockReputation(url: string, keywords: KeywordRule[] = DEFAULT_KEYWORDS) {
  return analyzeUrl(url, keywords, mockReputation(url, analyzeUrl(url, keywords).riskScore));
}

export function buildScan(
  type: ScanType,
  content: string,
  createdAt: Date,
  userId: string,
  keywords: KeywordRule[] = DEFAULT_KEYWORDS,
): ScanResult {
  const analysis = type === "url" ? analyzeUrlWithMockReputation(content, keywords) : analyzeEmail(content, keywords);
  return {
    id: `scn_${hash(content + createdAt.toISOString()).toString(36)}`,
    type,
    content,
    ...analysis,
    createdAt: createdAt.toISOString(),
    userId,
  };
}

const SAFE_URLS = [
  "https://github.com/vercel/next.js/releases",
  "https://www.wikipedia.org",
  "https://docs.google.com/document/d/1x8Hq/edit",
  "https://www.amazon.in/gp/your-account/order-history",
  "https://www.netflix.com/browse",
  "https://stripe.com/docs/payments",
  "https://news.ycombinator.com",
  "https://www.linkedin.com/feed",
  "https://www.paypal.com/myaccount/summary",
  "https://developer.mozilla.org/en-US/docs/Web/HTTP",
  "https://www.irctc.co.in",
  "https://mail.google.com/mail/u/0",
];

const MEDIUM_URLS = [
  "http://example-shop.top/deals",
  "https://bit.ly/3xYz9Qa",
  "http://weather-today-update.net/login",
  "https://account-update.info/verify",
  "http://free-wallpapers-hd-now.xyz",
];

const HIGH_URLS = [
  "http://secure-paypal-login-free.com",
  "http://apple-id-verify.support/unlock",
  "http://192.168.4.21/office365/login.php",
  "https://microsoft-account-secure.click/verify",
  "http://netflix-billing-update.xyz/account",
  "http://amazon-prize-claim.top/free-bonus",
  "http://chase-secure-banking.ml/confirm",
  "http://dhl-parcel-redelivery.xyz/update",
];

const SAFE_EMAILS = [
  "Hi Priya, attaching the slides from Thursday's design review. Let me know if anything's missing before Monday's sync.",
  "Your order #4417 has shipped and should arrive Wednesday. You can track it from your orders page.",
  "Reminder: the quarterly all-hands moves to 3pm on Friday. Same room, snacks provided.",
];

const MEDIUM_EMAILS = [
  "URGENT: Your password expires today. Update it from the IT portal before you log off.",
  "Dear customer, your subscription renewal failed. Please update your payment details soon to avoid interruption.",
];

const HIGH_EMAILS = [
  "Your bank account will be suspended. Verify immediately.",
  "Dear Customer, we detected unusual activity on your PayPal account. Your account will be locked within 24 hours unless you verify your account at http://secure-paypal-login-free.com",
  "CONGRATULATIONS!!! You have won the lottery! Claim your prize today by replying with your bank details and a gift card for processing!!!",
  "Final notice: your mailbox storage is full and will be closed. Act now and confirm your password and OTP to keep receiving email.",
];

export function seedScans(now = new Date()): ScanResult[] {
  const rand = seeded(20261007);
  const day = 86_400_000;
  const pools: [ScanType, string[], number][] = [
    ["url", SAFE_URLS, 3],
    ["url", MEDIUM_URLS, 1],
    ["url", HIGH_URLS, 2],
    ["email", SAFE_EMAILS, 1],
    ["email", MEDIUM_EMAILS, 1],
    ["email", HIGH_EMAILS, 1],
  ];
  const owners = [SELF, SELF, SELF, "usr_02", "usr_03", "usr_04", "usr_05", "usr_06", "usr_07", "usr_08"];

  const scans: ScanResult[] = [];
  for (let i = 0; i < 110; i++) {
    // weighted pick of a pool, then an item inside it
    const total = pools.reduce((s, p) => s + p[2], 0);
    let r = rand() * total;
    const pool = pools.find((p) => (r -= p[2]) < 0) ?? pools[0]!;
    const content = pool[1][Math.floor(rand() * pool[1].length)]!;
    const created = new Date(now.getTime() - Math.floor(rand() * 14 * day) - Math.floor(rand() * day));
    const owner = owners[Math.floor(rand() * owners.length)]!;
    scans.push({ ...buildScan(pool[0], content, created, owner), id: `scn_seed_${i}` });
  }
  return scans.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function seedKeywords(): SuspiciousKeyword[] {
  const created = new Date("2026-09-01T09:00:00Z").toISOString();
  return DEFAULT_KEYWORDS.map((k, i) => ({ ...k, id: `kw_${i}`, createdAt: created }));
}

export function seedUsers(now = new Date()): AdminUser[] {
  const day = 86_400_000;
  const people: [string, string, AdminUser["role"], AdminUser["status"], number, number][] = [
    ["Aarav Mehta", "aarav.mehta@example.com", "admin", "active", 64, 0],
    ["Priya Nair", "priya.nair@example.com", "user", "active", 41, 0],
    ["Daniel Okafor", "daniel.okafor@example.com", "user", "active", 23, 1],
    ["Sofia Marquez", "sofia.marquez@example.com", "user", "active", 18, 2],
    ["Kenji Watanabe", "kenji.w@example.com", "user", "suspended", 3, 19],
    ["Ishita Rao", "ishita.rao@example.com", "user", "active", 57, 0],
    ["Liam Becker", "liam.becker@example.com", "user", "active", 9, 4],
    ["Fatima Zahra", "fatima.zahra@example.com", "admin", "active", 32, 1],
    ["Noah Thompson", "noah.t@example.com", "user", "active", 12, 6],
    ["Ananya Iyer", "ananya.iyer@example.com", "user", "active", 26, 2],
  ];
  return people.map(([name, email, role, status, scans, idle], i) => ({
    id: `usr_${String(i + 1).padStart(2, "0")}`,
    name,
    email,
    role,
    status,
    scans,
    lastActive: new Date(now.getTime() - idle * day - i * 3_600_000).toISOString(),
    createdAt: new Date(now.getTime() - (90 + i * 11) * day).toISOString(),
  }));
}
