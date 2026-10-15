"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { RISK_LABEL, RISK_THRESHOLDS, type RiskLevel } from "@phishlens/core";

const stroke: Record<RiskLevel, string> = {
  low: "stroke-risk-low",
  medium: "stroke-risk-medium",
  high: "stroke-risk-high",
};

// Semicircle from 180° (left) to 0° (right).
const R = 80;
const CX = 100;
const CY = 96;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function pointAt(pct: number, radius: number) {
  const angle = Math.PI * (1 - pct / 100);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

/** Animated half-circle gauge for a 0–100 risk score. */
export function RiskGauge({ score, level, className }: { score: number; level: RiskLevel; className?: string }) {
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? score : 0);
  const display = useTransform(value, (v) => Math.round(v));
  const progress = useTransform(value, (v) => Math.max(0.001, v / 100));
  const needle = useTransform(value, (v) => -90 + (v / 100) * 180);

  useEffect(() => {
    if (reduce) {
      value.set(score);
      return;
    }
    const controls = animate(value, score, { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 });
    return () => controls.stop();
  }, [score, reduce, value]);

  return (
    <figure
      className={cn("relative mx-auto w-full max-w-[280px]", className)}
      role="img"
      aria-label={`Risk score ${score} percent, ${RISK_LABEL[level]} risk`}
    >
      <svg viewBox="0 0 200 116" className="w-full overflow-visible" aria-hidden>
        <path d={ARC} className="fill-none stroke-surface-sunken" strokeWidth="14" strokeLinecap="round" />
        {/* threshold ticks at the medium / high boundaries */}
        {[RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high].map((t) => {
          const a = pointAt(t, R - 13);
          const b = pointAt(t, R - 20);
          return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-line-strong" strokeWidth="2" strokeLinecap="round" />;
        })}
        <motion.path
          d={ARC}
          className={cn("fill-none", stroke[level])}
          strokeWidth="14"
          strokeLinecap="round"
          style={{ pathLength: progress }}
        />
        <motion.g style={{ rotate: needle, originX: 0.5, originY: 1 }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 26} className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
        <circle cx={CX} cy={CY} r="7" className="fill-ink" />
        <circle cx={CX} cy={CY} r="2.5" className="fill-surface" />
      </svg>
      <div className="pointer-events-none mt-3 text-center">
        <p className="text-5xl font-semibold tracking-tight text-ink">
          <motion.span>{display}</motion.span>
          <span className="text-2xl text-ink-muted">%</span>
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">Risk score</p>
      </div>
    </figure>
  );
}
