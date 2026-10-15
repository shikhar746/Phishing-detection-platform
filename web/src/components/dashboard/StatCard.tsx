"use client";

import { animate, useMotionValue, useReducedMotion, useTransform, motion } from "framer-motion";
import { useEffect } from "react";
import { Lift } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";

const tones = {
  ink: "bg-ink text-surface",
  accent: "bg-accent-soft text-accent-ink",
  highlight: "bg-highlight-soft text-highlight-ink",
  danger: "bg-risk-high-soft text-risk-high-ink",
} as const;

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => `${new Intl.NumberFormat("en").format(Math.round(v))}${suffix}`);
  useEffect(() => {
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 1, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "accent",
  footnote,
  loading,
}: {
  label: string;
  value: number | undefined;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof tones;
  footnote?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Lift className="h-full">
      <Card className="h-full p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        {loading || value === undefined ? (
          <Skeleton className="mt-3 h-9 w-24" />
        ) : (
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            <CountUp value={value} suffix={suffix} />
          </p>
        )}
        {footnote && <div className="mt-2 text-sm text-ink-muted">{footnote}</div>}
      </Card>
    </Lift>
  );
}
