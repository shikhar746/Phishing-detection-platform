"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import type { DailyDetections, RiskLevel } from "@phishlens/core";

/*
 * Stacked daily detections by risk level. Colors are the brand risk tokens
 * (validated: adjacent CVD ΔE ≥ 10). The highlight tone is under 3:1 against
 * white, so the chart always ships a legend, a hover/focus tooltip and a
 * table view — identity and values never depend on color alone.
 */

const SERIES: { key: RiskLevel; label: string; fill: string; swatch: string }[] = [
  { key: "low", label: "Safe", fill: "fill-risk-low", swatch: "bg-risk-low" },
  { key: "medium", label: "Medium", fill: "fill-risk-medium", swatch: "bg-risk-medium" },
  { key: "high", label: "High", fill: "fill-risk-high", swatch: "bg-risk-high" },
];

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };
const GAP = 2;

const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });
const parse = (d: string) => new Date(`${d}T12:00:00`);

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / step;
  const nice = n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return nice * step;
}

export function DetectionChart({ data, title }: { data: DailyDetections[]; title: string }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const totals = data.map((d) => d.low + d.medium + d.high);
  const max = niceMax(Math.max(1, ...totals));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / data.length;
  const barW = Math.min(28, Math.max(6, band * 0.56));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const labelEvery = band < 34 ? 2 : 1;

  function onKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    setActive((a) => {
      const cur = a ?? 0;
      if (e.key === "Home") return 0;
      if (e.key === "End") return data.length - 1;
      return e.key === "ArrowRight" ? Math.min(data.length - 1, cur + 1) : Math.max(0, cur - 1);
    });
  }

  const activeRow = active !== null ? data[active] : undefined;
  const tooltipLeft = active !== null ? PAD.left + band * active + band / 2 : 0;

  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", s.swatch)} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="inline-flex rounded-lg bg-surface p-0.5 ring-1 ring-line" role="group" aria-label="Chart view">
          {(
            [
              ["chart", "Chart", BarChart3],
              ["table", "Table", Table2],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors",
                view === key ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <div className="relative mt-4">
          <svg
            width={width}
            height={HEIGHT}
            role="group"
            aria-label={`${title}. Use left and right arrow keys to read each day.`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onFocus={() => setActive((a) => a ?? data.length - 1)}
            onBlur={() => setActive(null)}
            onMouseLeave={() => setActive(null)}
            className="block overflow-visible focus-visible:outline-offset-4"
          >
            {/* recessive grid + y ticks */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = PAD.left + band * i + band / 2;
              const x = cx - barW / 2;
              let acc = 0;
              const visible = SERIES.filter((s) => d[s.key] > 0);
              const topKey = visible[visible.length - 1]?.key;
              return (
                <g key={d.date} onMouseEnter={() => setActive(i)} className={cn(active !== null && active !== i && "opacity-55", "transition-opacity")}>
                  {/* full-height hit area */}
                  <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} className="fill-transparent" />
                  {active === i && <rect x={PAD.left + band * i + 2} y={PAD.top} width={band - 4} height={plotH} rx={6} className="fill-surface" />}
                  {visible.map((s, si) => {
                    const v = d[s.key];
                    const y0 = y(acc);
                    acc += v;
                    const y1 = y(acc);
                    const gap = si > 0 ? GAP : 0;
                    const h = Math.max(1, y0 - y1 - gap);
                    const isTop = s.key === topKey;
                    const r = isTop ? Math.min(4, barW / 2, h) : 0;
                    const top = y1;
                    // path with rounded top corners only on the top segment
                    const path = `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`;
                    return (
                      <motion.path
                        key={s.key}
                        d={path}
                        className={s.fill}
                        initial={reduce ? false : { opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        style={{ originY: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                      />
                    );
                  })}
                  {i % labelEvery === (data.length - 1) % labelEvery && (
                    <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                      {dayFmt.format(parse(d.date))}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} className="stroke-line-strong" strokeWidth={1} />
          </svg>

          {activeRow && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-xs text-surface shadow-lift"
              style={{ left: Math.min(Math.max(tooltipLeft, 88), width - 88) }}
              aria-live="polite"
            >
              <p className="font-semibold">{weekdayFmt.format(parse(activeRow.date))}</p>
              <ul className="mt-1.5 space-y-1">
                {[...SERIES].reverse().map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-[2px]", s.swatch)} aria-hidden />
                    <span className="text-on-dark-muted">{s.label}</span>
                    <span className="ml-auto font-semibold tabular-nums">{activeRow[s.key]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 border-t border-white/10 pt-1.5 text-on-dark-muted">
                Total <span className="float-right font-semibold text-surface tabular-nums">{activeRow.low + activeRow.medium + activeRow.high}</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative mt-4 max-h-[260px] overflow-auto rounded-xl ring-1 ring-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Date</th>
                {SERIES.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-right font-semibold">{s.label}</th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">{weekdayFmt.format(parse(d.date))}</th>
                  {SERIES.map((s) => (
                    <td key={s.key} className="px-3 py-2 text-right tabular-nums text-ink-soft">{d[s.key]}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{d.low + d.medium + d.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
