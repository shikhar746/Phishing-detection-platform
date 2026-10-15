import { describe, expect, it } from "vitest";
import { computeDaily, computeStats, type RiskLevel, type ScanResult } from "../src/index.js";

function scan(riskLevel: RiskLevel, createdAt: Date): ScanResult {
  return {
    id: Math.random().toString(36),
    type: "url",
    content: "https://example.com",
    riskLevel,
    riskScore: 0,
    threatStatus: "",
    recommendation: "",
    checks: [],
    reputation: [],
    createdAt: createdAt.toISOString(),
  };
}

const now = new Date(2026, 9, 7, 15, 0);
const daysAgo = (n: number) => new Date(2026, 9, 7 - n, 10, 0);

describe("computeStats", () => {
  it("counts scans by risk level", () => {
    const stats = computeStats([scan("low", now), scan("low", now), scan("medium", now), scan("high", now)]);
    expect(stats).toEqual({ total: 4, safe: 2, medium: 1, suspicious: 1 });
  });

  it("handles no scans", () => {
    expect(computeStats([])).toEqual({ total: 0, safe: 0, medium: 0, suspicious: 0 });
  });
});

describe("computeDaily", () => {
  it("returns one row per day, oldest first, ending today", () => {
    const rows = computeDaily([], 14, now);
    expect(rows).toHaveLength(14);
    expect(rows.at(-1)!.date).toBe("2026-10-07");
    expect(rows[0]!.date).toBe("2026-09-24");
  });

  it("buckets scans into their local day and ignores older ones", () => {
    const rows = computeDaily([scan("high", now), scan("low", daysAgo(1)), scan("low", daysAgo(1)), scan("medium", daysAgo(30))], 7, now);
    expect(rows.at(-1)).toMatchObject({ high: 1, low: 0, medium: 0 });
    expect(rows.at(-2)).toMatchObject({ low: 2 });
    expect(rows.reduce((s, r) => s + r.low + r.medium + r.high, 0)).toBe(3);
  });
});
