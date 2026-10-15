import type { KeywordCategory } from "../types.js";

export interface KeywordRule {
  term: string;
  category: KeywordCategory;
  weight: number;
}

/**
 * Default suspicious-keyword list. Admins edit this list from the admin panel;
 * in production it lives in the database (a `keywords` table) and the API
 * passes it to the analyzer.
 */
export const DEFAULT_KEYWORDS: KeywordRule[] = [
  // Words that show up in phishing URLs
  { term: "login", category: "url", weight: 8 },
  { term: "signin", category: "url", weight: 8 },
  { term: "verify", category: "url", weight: 8 },
  { term: "secure", category: "url", weight: 8 },
  { term: "account", category: "url", weight: 6 },
  { term: "update", category: "url", weight: 6 },
  { term: "confirm", category: "url", weight: 6 },
  { term: "free", category: "url", weight: 6 },
  { term: "bonus", category: "url", weight: 6 },
  { term: "wallet", category: "url", weight: 6 },
  { term: "unlock", category: "url", weight: 6 },

  // Brands that are commonly impersonated
  { term: "paypal", category: "brand", weight: 20 },
  { term: "apple", category: "brand", weight: 20 },
  { term: "microsoft", category: "brand", weight: 20 },
  { term: "office365", category: "brand", weight: 20 },
  { term: "netflix", category: "brand", weight: 20 },
  { term: "amazon", category: "brand", weight: 20 },
  { term: "google", category: "brand", weight: 20 },
  { term: "instagram", category: "brand", weight: 20 },
  { term: "chase", category: "brand", weight: 20 },
  { term: "dhl", category: "brand", weight: 20 },

  // Email language
  { term: "immediately", category: "urgency", weight: 20 },
  { term: "urgent", category: "urgency", weight: 20 },
  { term: "within 24 hours", category: "urgency", weight: 20 },
  { term: "act now", category: "urgency", weight: 20 },
  { term: "final notice", category: "urgency", weight: 20 },
  { term: "suspended", category: "threat", weight: 25 },
  { term: "will be closed", category: "threat", weight: 25 },
  { term: "locked", category: "threat", weight: 25 },
  { term: "unusual activity", category: "threat", weight: 20 },
  { term: "legal action", category: "threat", weight: 25 },
  { term: "verify your account", category: "credential", weight: 25 },
  { term: "verify", category: "credential", weight: 20 },
  { term: "password", category: "credential", weight: 20 },
  { term: "otp", category: "credential", weight: 25 },
  { term: "one-time code", category: "credential", weight: 25 },
  { term: "card number", category: "credential", weight: 25 },
  { term: "social security", category: "credential", weight: 25 },
  { term: "bank details", category: "credential", weight: 25 },
  { term: "you have won", category: "scam", weight: 25 },
  { term: "lottery", category: "scam", weight: 25 },
  { term: "gift card", category: "scam", weight: 20 },
  { term: "claim your prize", category: "scam", weight: 25 },
  { term: "inheritance", category: "scam", weight: 20 },
  { term: "wire transfer", category: "scam", weight: 20 },
  { term: "crypto", category: "scam", weight: 15 },
];

/** Registrable domains that legitimately own a brand keyword. */
export const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  paypal: ["paypal.com"],
  apple: ["apple.com", "icloud.com"],
  microsoft: ["microsoft.com", "live.com", "office.com", "microsoftonline.com"],
  office365: ["office.com", "microsoft.com"],
  netflix: ["netflix.com"],
  amazon: ["amazon.com", "amazon.in", "amazon.co.uk", "amazon.de"],
  google: ["google.com", "youtube.com", "gmail.com"],
  instagram: ["instagram.com"],
  chase: ["chase.com"],
  dhl: ["dhl.com"],
};

export const SUSPICIOUS_TLDS = [
  "zip", "xyz", "top", "click", "tk", "ml", "ga", "cf", "gq", "work", "loan", "rest", "country", "mov", "support",
];

export const URL_SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "cutt.ly", "rb.gy"];
