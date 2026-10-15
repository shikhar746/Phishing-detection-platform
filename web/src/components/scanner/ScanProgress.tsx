"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import type { ScanType } from "@/lib/types";

const STEPS: Record<ScanType, string[]> = {
  url: [
    "Parsing the link and domain structure",
    "Checking HTTPS and suspicious keywords",
    "Querying VirusTotal",
    "Checking Google Safe Browsing",
    "Calculating the risk score",
  ],
  email: [
    "Reading the message",
    "Looking for urgency and threats",
    "Detecting credential requests",
    "Scanning links in the message",
    "Calculating the risk score",
  ],
};

/** Loading state for a scan: walks through the analysis steps. */
export function ScanProgress({ type }: { type: ScanType }) {
  const steps = STEPS[type];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 420);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <Card className="p-6 sm:p-8" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-4">
        <div className="relative grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
          <Spinner className="size-6" />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-accent/10" aria-hidden />
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-ink">Analyzing…</p>
          <p className="text-sm text-ink-muted">This usually takes a couple of seconds.</p>
        </div>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: i <= active ? 1 : 0.45, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 text-sm"
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full ring-1",
                  done && "bg-accent text-white ring-accent",
                  current && "bg-surface-raised text-accent-ink ring-accent",
                  !done && !current && "bg-surface text-ink-faint ring-line",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : current ? <Spinner className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className={cn(current ? "font-medium text-ink" : done ? "text-ink-soft" : "text-ink-muted")}>{step}</span>
              {done && <span className="sr-only">(done)</span>}
            </motion.li>
          );
        })}
      </ol>
    </Card>
  );
}
