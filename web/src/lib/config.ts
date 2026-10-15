export const siteConfig = {
  name: "AI Phishing Detection Platform",
  shortName: "PhishLens",
  /** Browser UI color (meta theme-color). Mirrors --color-ink in globals.css. */
  themeColor: "#22333B",
  description:
    "Check any URL, email or message for phishing before you click. Rule-based checks plus VirusTotal and Google Safe Browsing reputation, explained in plain language.",
};

/**
 * When true (the default until the backend scan endpoints exist), every
 * service reads and writes realistic mock data in localStorage instead of
 * calling the API. Set NEXT_PUBLIC_USE_MOCKS=false to use the real backend.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/**
 * OAuth client ID for Google Identity Services. Must be the same value as
 * GOOGLE_CLIENT_ID in api/.env. Empty disables the Google button (outside mock mode).
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

/** Mock-only: probability (0–1) that a mock request fails, to exercise error states. */
export const MOCK_FAILURE_RATE = Number(process.env.NEXT_PUBLIC_MOCK_FAILURE_RATE ?? 0);

/** Risk thresholds on the 0–100 score. Kept here so the API can share them. */
export const RISK_THRESHOLDS = { medium: 35, high: 65 } as const;
