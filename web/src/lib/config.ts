export const siteConfig = {
  name: "AI Phishing Detection Platform",
  shortName: "PhishLens",
  /** Browser UI color (meta theme-color). Mirrors --color-ink in globals.css. */
  themeColor: "#22333B",
  description:
    "Check any URL, email or message for phishing before you click. Rule-based checks plus VirusTotal and Google Safe Browsing reputation, explained in plain language.",
};

/**
 * Demo mode. When true (the default, so the site works with no backend),
 * every service reads and writes realistic mock data in localStorage instead
 * of calling the API. Set NEXT_PUBLIC_USE_MOCKS=false to use the real API.
 */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

/**
 * Where the browser sends API requests. Empty (the default) means same-origin:
 * Next.js proxies /api/* to API_ORIGIN (next.config.ts), so the auth cookies
 * are first-party. Only set this to call the API directly from the browser.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/**
 * OAuth client ID for Google Identity Services. Must be the same value as
 * GOOGLE_CLIENT_ID in api/.env. Empty disables the Google button (outside mock mode).
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

/** Mock-only: probability (0–1) that a mock request fails, to exercise error states. */
export const MOCK_FAILURE_RATE = Number(process.env.NEXT_PUBLIC_MOCK_FAILURE_RATE ?? 0);
