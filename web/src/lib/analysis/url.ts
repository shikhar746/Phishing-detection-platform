// URL rules. Each rule looks at one aspect of the link; add a rule by adding a
// function to URL_RULES.

import type { ReputationResult } from "@/lib/types";
import { normalizeUrl } from "@/lib/validation";
import { OFFICIAL_BRAND_DOMAINS, SUSPICIOUS_TLDS, URL_SHORTENERS, type KeywordRule } from "./keywords";
import { passed, runRules, score, type Analysis, type Rule } from "./score";

interface UrlContext {
  href: string;
  protocol: string;
  host: string;
  /** Registrable domain, e.g. "paypal.com" for "www.paypal.com". */
  domain: string;
  /** Lowercased full URL, for keyword matching. */
  full: string;
  isIp: boolean;
  keywords: KeywordRule[];
}

const MULTI_PART_SUFFIXES = new Set(["co.uk", "com.au", "co.in", "co.jp", "com.br", "ac.uk", "gov.uk", "org.uk"]);

export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

const https: Rule<UrlContext> = ({ protocol }) =>
  protocol === "https:"
    ? passed("https", "HTTPS", "The connection is encrypted.")
    : { id: "https", label: "HTTPS", detail: "The link uses plain HTTP, so anything you type can be read in transit.", severity: "fail", weight: 20 };

const ipHost: Rule<UrlContext> = ({ isIp }) =>
  isIp
    ? { id: "ip-host", label: "Domain structure", detail: "The link points at a raw IP address instead of a named domain.", severity: "fail", weight: 25 }
    : null;

// "@" in the authority hides the real host
const atSign: Rule<UrlContext> = ({ href }) =>
  /^[a-z]+:\/\/[^/]*@/i.test(href)
    ? {
        id: "at-sign",
        label: "Hidden destination",
        detail: "Everything before the “@” is ignored by the browser — the real site is what comes after it.",
        severity: "fail",
        weight: 15,
      }
    : null;

const punycode: Rule<UrlContext> = ({ host }) =>
  host.split(".").some((l) => l.startsWith("xn--"))
    ? {
        id: "punycode",
        label: "Look-alike characters",
        detail: "The domain uses encoded international characters that can imitate a familiar name.",
        severity: "fail",
        weight: 15,
      }
    : null;

const brandImpersonation: Rule<UrlContext> = ({ full, domain, keywords }) => {
  const impersonated = keywords.filter(
    (k) => k.category === "brand" && full.includes(k.term) && !(OFFICIAL_BRAND_DOMAINS[k.term] ?? []).includes(domain),
  );
  const first = impersonated[0];
  if (!first) return passed("brand", "Brand impersonation", "No well-known brand is being imitated.");
  return {
    id: "brand",
    label: "Brand impersonation",
    detail: `Mentions “${first.term}” but isn't hosted on ${first.term}'s official domain.`,
    severity: "fail",
    weight: Math.min(25, Math.max(...impersonated.map((b) => b.weight))),
  };
};

const suspiciousKeywords: Rule<UrlContext> = ({ full, keywords }) => {
  const terms = keywords.filter((k) => k.category === "url" && full.includes(k.term));
  if (!terms.length) return passed("keywords", "Suspicious keywords", "No phishing-related keywords found.");
  return {
    id: "keywords",
    label: "Suspicious keywords",
    detail: `Contains ${terms.map((k) => `“${k.term}”`).join(", ")}.`,
    severity: "warn",
    weight: Math.min(30, terms.reduce((s, k) => s + k.weight, 0)),
  };
};

// hyphen-stuffed names, deep subdomains and throwaway TLDs, 10 points each
const domainStructure: Rule<UrlContext> = ({ host, domain, isIp }) => {
  const hyphens = (domain.split(".")[0]?.match(/-/g) ?? []).length;
  const subdomains = host === domain ? 0 : host.slice(0, -domain.length - 1).split(".").length;
  const tld = host.split(".").pop() ?? "";
  const findings = [
    hyphens >= 2 && `${hyphens} hyphens in the domain name`,
    subdomains >= 3 && `${subdomains} levels of subdomains`,
    SUSPICIOUS_TLDS.includes(tld) && `a “.${tld}” ending often used for throwaway sites`,
  ].filter((f): f is string => Boolean(f));

  if (findings.length) {
    return { id: "structure", label: "Domain structure", detail: `Unusual pattern: ${findings.join(", ")}.`, severity: "warn", weight: findings.length * 10 };
  }
  // a raw IP is already reported by ipHost, so don't also call it "ordinary"
  return isIp ? null : passed("structure", "Domain structure", `Ordinary domain (${domain}).`);
};

const shortener: Rule<UrlContext> = ({ domain }) =>
  URL_SHORTENERS.includes(domain)
    ? { id: "shortener", label: "Shortened link", detail: "Link shorteners hide the final destination.", severity: "warn", weight: 10 }
    : null;

const length: Rule<UrlContext> = ({ href }) =>
  href.length > 75
    ? { id: "length", label: "Link length", detail: `The link is ${href.length} characters long, which can hide the real domain.`, severity: "info", weight: 5 }
    : null;

const URL_RULES: Rule<UrlContext>[] = [https, ipHost, atSign, punycode, brandImpersonation, suspiciousKeywords, domainStructure, shortener, length];

export function analyzeUrl(rawUrl: string, keywords: KeywordRule[], reputation: ReputationResult[] = []): Analysis {
  const href = normalizeUrl(rawUrl);
  const url = new URL(href);
  const host = url.hostname.toLowerCase();
  const ctx: UrlContext = {
    href,
    protocol: url.protocol,
    host,
    domain: registrableDomain(host),
    full: href.toLowerCase(),
    isIp: /^\d{1,3}(\.\d{1,3}){3}$/.test(host),
    keywords,
  };
  return score("url", runRules(URL_RULES, ctx), reputation);
}
