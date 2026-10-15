"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RiskBadge, riskStyles } from "@/components/ui/RiskBadge";
import { ScanTypeIcon } from "@/components/ui/ScanTypeIcon";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { CheckResult, RiskLevel, ScanResult, ScanType } from "@phishlens/core";
import { RiskGauge } from "./RiskGauge";

const GUIDANCE: Record<ScanType, Record<RiskLevel, string>> = {
  url: {
    low: "No warning signs found. Still check the address bar before entering passwords or payment details.",
    medium: "Some signals look off. Don't sign in or pay through this link — open the site by typing its address yourself.",
    high: "This link shows several phishing signs. Don't open it, and don't enter any personal information if you already did — change that password now.",
  },
  email: {
    low: "Nothing in this message matches common phishing patterns. Be cautious with unexpected attachments.",
    medium: "Contact the sender through a channel you already trust before acting on this message.",
    high: "Treat this as phishing. Don't click links, open attachments or reply. Report it to your email provider or IT team, then delete it.",
  },
};

const severityIcon: Record<CheckResult["severity"], { Icon: typeof CheckCircle2; className: string; label: string }> = {
  pass: { Icon: CheckCircle2, className: "text-risk-low-ink", label: "Passed" },
  info: { Icon: Info, className: "text-ink-muted", label: "Note" },
  warn: { Icon: AlertTriangle, className: "text-risk-medium-ink", label: "Warning" },
  fail: { Icon: XCircle, className: "text-risk-high-ink", label: "Failed" },
};

export function ScanResultCard({ scan, onReset }: { scan: ScanResult; onReset?: () => void }) {
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const style = riskStyles[scan.riskLevel];
  const ordered = [...scan.checks].sort((a, b) => b.weight - a.weight);
  const flagged = ordered.filter((c) => c.weight > 0);

  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [scan.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card as="article" aria-labelledby="scan-result-heading" className="overflow-hidden">
        {/* Header: what was scanned */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line/70 bg-surface/60 px-5 py-4 sm:px-7">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-raised ring-1 ring-line">
            <ScanTypeIcon type={scan.type} className="size-4 text-accent-ink" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              {scan.type === "url" ? "URL scanned" : "Message analyzed"}
            </p>
            <p className="truncate font-mono text-sm text-ink" title={scan.content}>
              {scan.content}
            </p>
          </div>
          <time dateTime={scan.createdAt} className="text-xs text-ink-muted">
            {formatDateTime(scan.createdAt)}
          </time>
        </div>

        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-10">
          {/* Gauge */}
          <div className={cn("flex flex-col items-center justify-center rounded-2xl px-4 pb-6 pt-8", style.soft)}>
            <RiskGauge score={scan.riskScore} level={scan.riskLevel} />
          </div>

          {/* Verdict */}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-3">
              <RiskBadge level={scan.riskLevel} size="lg" />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Threat status</span>
            </p>
            <h2
              id="scan-result-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink focus:outline-none sm:text-4xl"
            >
              {scan.threatStatus}
            </h2>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Recommendation</dt>
                <dd className={cn("mt-1 font-semibold", style.text)}>{scan.recommendation}</dd>
              </div>
              <div className="rounded-xl border border-line/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">Indicators</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {flagged.length} of {ordered.length} checks flagged
                </dd>
              </div>
            </dl>

            <div className={cn("mt-3 flex gap-3 rounded-xl p-4 text-sm leading-relaxed text-ink-soft", style.soft)}>
              {scan.riskLevel === "high" ? (
                <OctagonAlert className={cn("mt-0.5 size-5 shrink-0", style.text)} aria-hidden />
              ) : (
                <style.Icon className={cn("mt-0.5 size-5 shrink-0", style.text)} aria-hidden />
              )}
              <p>{GUIDANCE[scan.type][scan.riskLevel]}</p>
            </div>

            {scan.reputation.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink">Reputation services</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {scan.reputation.map((r) => (
                    <li key={r.source} className="flex items-start gap-2.5 rounded-xl border border-line/70 p-3">
                      {r.status === "flagged" ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-risk-high-ink" aria-label="Flagged" />
                      ) : r.status === "clean" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-risk-low-ink" aria-label="Clean" />
                      ) : (
                        <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-label="Unavailable" />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-ink">{r.source === "virustotal" ? "VirusTotal" : "Google Safe Browsing"}</p>
                        <p className="text-ink-muted [overflow-wrap:anywhere]">{r.summary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Checks */}
        <div className="border-t border-line/70 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">What we checked</h3>
            <p className="text-sm text-ink-muted">
              {flagged.length === 0 ? "No indicators triggered" : `${flagged.length} of ${ordered.length} checks raised the score`}
            </p>
          </div>
          <ul className="mt-3 divide-y divide-line/60">
            {ordered.map((c) => {
              const s = severityIcon[c.severity];
              return (
                <li key={c.id} className="flex items-start gap-3 py-3">
                  <s.Icon className={cn("mt-0.5 size-4 shrink-0", s.className)} aria-label={s.label} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-ink">{c.label}</p>
                    <p className="text-ink-muted [overflow-wrap:anywhere]">{c.detail}</p>
                  </div>
                  {c.weight > 0 && (
                    <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-ink-soft ring-1 ring-line">
                      +{c.weight}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {onReset && (
          <div className="flex flex-wrap gap-3 border-t border-line/70 bg-surface/60 px-5 py-4 sm:px-7">
            <Button variant="primary" onClick={onReset}>
              <RotateCcw className="size-4" aria-hidden />
              Scan something else
            </Button>
            <ButtonLink href="/dashboard" variant="secondary">
              View scan history
            </ButtonLink>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
