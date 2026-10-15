"use client";

import { motion, useReducedMotion } from "framer-motion";
import { analyzeUrlWithMockReputation } from "@/lib/mock/seed";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { cn } from "@/lib/cn";

const EXAMPLE = "http://secure-paypal-login-free.com";

// The example URL split into annotated segments. `n` links a segment to a finding.
const SEGMENTS: { text: string; n?: number; tone?: "high" | "medium" }[] = [
  { text: "http://", n: 1, tone: "high" },
  { text: "secure", n: 3, tone: "medium" },
  { text: "-" },
  { text: "paypal", n: 2, tone: "high" },
  { text: "-" },
  { text: "login", n: 3, tone: "medium" },
  { text: "-" },
  { text: "free", n: 3, tone: "medium" },
  { text: ".com" },
];

const FINDINGS = [
  { n: 1, title: "No HTTPS", body: "Anything typed here travels unencrypted." },
  { n: 2, title: "Brand impersonation", body: "Says “paypal” but isn't paypal.com." },
  { n: 3, title: "Bait keywords", body: "“secure”, “login” and “free” in one domain." },
  { n: 4, title: "Flagged by reputation APIs", body: "VirusTotal and Safe Browsing both list it." },
];

/** Hero visual: the anatomy of a phishing link, scored by the real analyzer. */
export function LinkAnatomy() {
  const reduce = useReducedMotion();
  const result = analyzeUrlWithMockReputation(EXAMPLE);

  return (
    <figure className="relative rounded-[1.75rem] bg-surface-raised p-5 text-ink shadow-lift ring-1 ring-white/10 sm:p-7">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Anatomy of a phishing link</span>
        <RiskBadge level={result.riskLevel} />
      </figcaption>

      <p className="mt-5 break-all rounded-2xl bg-surface px-4 py-4 font-mono text-[0.95rem] leading-loose sm:text-lg" aria-label={EXAMPLE}>
        {SEGMENTS.map((s, i) =>
          s.n ? (
            <motion.span
              key={i}
              initial={reduce ? false : { backgroundSize: "0% 100%" }}
              animate={{ backgroundSize: "100% 100%" }}
              transition={{ duration: 0.5, delay: 0.8 + s.n * 0.25 }}
              className={cn(
                "relative rounded-[4px] bg-no-repeat px-0.5",
                s.tone === "high"
                  ? "bg-linear-to-r from-risk-high-soft to-risk-high-soft text-risk-high-ink"
                  : "bg-linear-to-r from-risk-medium-soft to-risk-medium-soft text-risk-medium-ink",
              )}
              aria-hidden
            >
              {s.text}
              <sup className="ml-0.5 font-sans text-[0.6rem] font-bold">{s.n}</sup>
            </motion.span>
          ) : (
            <span key={i} className="text-ink-muted" aria-hidden>
              {s.text}
            </span>
          ),
        )}
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {FINDINGS.map((f) => (
          <motion.li
            key={f.n}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + f.n * 0.18, duration: 0.45 }}
            className="flex gap-3 rounded-xl border border-line/70 p-3"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[0.7rem] font-semibold text-surface">
              {f.n}
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-ink">{f.title}</span>
              <span className="text-ink-muted">{f.body}</span>
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="mt-5 rounded-2xl bg-ink p-4 text-surface sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-on-dark-muted">Verdict</p>
            <p className="mt-1 font-display text-2xl font-semibold">{result.threatStatus}</p>
            <p className="text-sm text-on-dark-danger">Recommendation: {result.recommendation}</p>
          </div>
          <p className="text-4xl font-semibold tracking-tight">
            {result.riskScore}
            <span className="text-xl text-on-dark-muted">%</span>
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-risk-high"
            initial={{ width: reduce ? `${result.riskScore}%` : "0%" }}
            animate={{ width: `${result.riskScore}%` }}
            transition={{ duration: 1.3, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </figure>
  );
}
