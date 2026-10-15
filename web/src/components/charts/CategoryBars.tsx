"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Single-series horizontal bars with direct value labels. One series means one
 * color and no legend; every value is printed, so no table twin is needed.
 */
export function CategoryBars({ rows, label }: { rows: { key: string; label: string; value: number }[]; label: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5" aria-label={label}>
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-soft">{r.label}</span>
            <span className="font-semibold tabular-nums text-ink">{r.value}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-sunken" aria-hidden>
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: reduce ? `${(r.value / max) * 100}%` : 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
