import { describe, expect, it } from "vitest";
import { analyzeEmail } from "@/lib/analysis/email";
import { categorize, levelForScore } from "@/lib/analysis/score";
import { analyzeUrl, registrableDomain } from "@/lib/analysis/url";
import { DEFAULT_KEYWORDS } from "@/lib/analysis/keywords";

const fired = (checks: { id: string; weight: number }[]) => checks.filter((c) => c.weight > 0).map((c) => c.id);

describe("levelForScore", () => {
  it("maps scores onto the risk thresholds", () => {
    expect(levelForScore(0)).toBe("low");
    expect(levelForScore(34)).toBe("low");
    expect(levelForScore(35)).toBe("medium");
    expect(levelForScore(64)).toBe("medium");
    expect(levelForScore(65)).toBe("high");
    expect(levelForScore(100)).toBe("high");
  });
});

describe("registrableDomain", () => {
  it("strips subdomains", () => {
    expect(registrableDomain("www.paypal.com")).toBe("paypal.com");
    expect(registrableDomain("a.b.c.example.org")).toBe("example.org");
  });
  it("keeps multi-part public suffixes", () => {
    expect(registrableDomain("shop.amazon.co.uk")).toBe("amazon.co.uk");
    expect(registrableDomain("www.irctc.co.in")).toBe("irctc.co.in");
  });
});

describe("analyzeUrl", () => {
  it("scores the documented example as HIGH / Suspicious Website / Avoid Visiting", () => {
    const r = analyzeUrl("http://secure-paypal-login-free.com", DEFAULT_KEYWORDS);
    expect(r.riskLevel).toBe("high");
    expect(r.threatStatus).toBe("Suspicious Website");
    expect(r.recommendation).toBe("Avoid Visiting");
    expect(fired(r.checks)).toEqual(expect.arrayContaining(["https", "brand", "keywords", "structure"]));
  });

  it("treats a normal HTTPS site as low risk", () => {
    const r = analyzeUrl("https://github.com/vercel/next.js", DEFAULT_KEYWORDS);
    expect(r.riskScore).toBe(0);
    expect(r.riskLevel).toBe("low");
    expect(r.recommendation).toBe("Safe to Visit");
  });

  it("does not flag a brand on its own official domain", () => {
    const r = analyzeUrl("https://www.paypal.com/myaccount/summary", DEFAULT_KEYWORDS);
    expect(fired(r.checks)).not.toContain("brand");
  });

  it("flags raw IP hosts, hidden @ redirects and punycode", () => {
    expect(fired(analyzeUrl("http://192.168.4.21/login", DEFAULT_KEYWORDS).checks)).toContain("ip-host");
    expect(fired(analyzeUrl("https://www.google.com@evil.tk/x", DEFAULT_KEYWORDS).checks)).toContain("at-sign");
    expect(fired(analyzeUrl("https://xn--pypal-4ve.com", DEFAULT_KEYWORDS).checks)).toContain("punycode");
  });

  it("flags shorteners and throwaway TLDs", () => {
    expect(fired(analyzeUrl("https://bit.ly/3xYz9Qa", DEFAULT_KEYWORDS).checks)).toContain("shortener");
    expect(fired(analyzeUrl("https://example-shop.top", DEFAULT_KEYWORDS).checks)).toContain("structure");
  });

  it("accepts URLs without a scheme", () => {
    expect(() => analyzeUrl("example.com/login", DEFAULT_KEYWORDS)).not.toThrow();
  });

  it("adds flagged reputation results to the score, capped at 100", () => {
    const base = analyzeUrl("http://secure-paypal-login-free.com", DEFAULT_KEYWORDS);
    const withRep = analyzeUrl("http://secure-paypal-login-free.com", DEFAULT_KEYWORDS, [
      { source: "virustotal", status: "flagged", summary: "9 / 94" },
      { source: "safe-browsing", status: "flagged", summary: "SOCIAL_ENGINEERING" },
    ]);
    expect(withRep.riskScore).toBe(Math.min(100, base.riskScore + 22));
    expect(withRep.reputation).toHaveLength(2);
  });

  it("uses admin-edited keywords", () => {
    const custom = [...DEFAULT_KEYWORDS, { term: "invoice", category: "url" as const, weight: 30 }];
    const r = analyzeUrl("https://example.com/invoice", custom);
    expect(fired(r.checks)).toContain("keywords");
  });
});

describe("analyzeEmail", () => {
  it("scores the documented example as HIGH / Possible Phishing Attempt Detected", () => {
    const r = analyzeEmail("Your bank account will be suspended. Verify immediately.", DEFAULT_KEYWORDS);
    expect(r.riskLevel).toBe("high");
    expect(r.threatStatus).toBe("Possible Phishing Attempt Detected");
    expect(fired(r.checks)).toEqual(expect.arrayContaining(["threat", "urgency", "credential"]));
  });

  it("leaves an ordinary message low risk", () => {
    const r = analyzeEmail("Hi Priya, attaching the slides from Thursday's review. Thanks, Daniel", DEFAULT_KEYWORDS);
    expect(r.riskLevel).toBe("low");
    expect(fired(r.checks)).toEqual([]);
  });

  it("scores suspicious links inside the message", () => {
    const r = analyzeEmail("Please review your statement at http://secure-paypal-login-free.com today.", DEFAULT_KEYWORDS);
    const link = r.checks.find((c) => c.id === "links")!;
    expect(link.severity).toBe("fail");
    expect(link.weight).toBeGreaterThan(0);
  });

  it("matches whole words only", () => {
    // "otp" must not match inside "hotpot"
    const r = analyzeEmail("Dinner at the hotpot place on Friday? Let me know.", DEFAULT_KEYWORDS);
    expect(fired(r.checks)).not.toContain("credential");
  });

  it("notices generic greetings and shouting", () => {
    const r = analyzeEmail("Dear customer, URGENT URGENT ACTION NEEDED!!! Reply now!", DEFAULT_KEYWORDS);
    expect(fired(r.checks)).toEqual(expect.arrayContaining(["greeting", "tone"]));
  });
});

describe("categorize", () => {
  it("prefers reputation, then brand, then credential, then scam language", () => {
    const c = (id: string) => ({ id, label: id, detail: "", severity: "fail" as const, weight: 10 });
    expect(categorize([c("brand"), c("rep-virustotal")])).toBe("malicious-reputation");
    expect(categorize([c("brand"), c("credential")])).toBe("brand-impersonation");
    expect(categorize([c("credential"), c("urgency")])).toBe("credential-harvesting");
    expect(categorize([c("scam")])).toBe("urgency-scam");
    expect(categorize([c("https")])).toBe("insecure-transport");
  });
});

describe("score regression anchors", () => {
  // values observed in the running app before the rules were split into modules
  it("keeps the documented examples' exact scores", async () => {
    const { analyzeUrlWithMockReputation } = await import("@/lib/mock/seed");
    expect(analyzeUrl("http://secure-paypal-login-free.com", DEFAULT_KEYWORDS).riskScore).toBe(72);
    expect(analyzeUrlWithMockReputation("http://secure-paypal-login-free.com").riskScore).toBe(94);
    expect(analyzeEmail("Your bank account will be suspended. Verify immediately.", DEFAULT_KEYWORDS).riskScore).toBe(65);
  });

  it("does not report a raw IP host as an ordinary domain", () => {
    const ids = analyzeUrl("http://192.168.4.21/login", DEFAULT_KEYWORDS).checks.map((c) => c.id);
    expect(ids).toContain("ip-host");
    expect(ids).not.toContain("structure");
  });
});
