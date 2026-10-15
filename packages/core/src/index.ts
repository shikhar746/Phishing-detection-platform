// @phishlens/core — the domain model shared by the API and the web app:
// types, the rule-based analysis engine, validation, stats and reports.

export * from "./types.js";
export * from "./labels.js";
export * from "./validation.js";
export * from "./stats.js";
export * from "./reports.js";
export * from "./analysis/keywords.js";
export * from "./analysis/score.js";
export { analyzeUrl, registrableDomain } from "./analysis/url.js";
export { analyzeEmail } from "./analysis/email.js";
