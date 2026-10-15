import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/cn";
import { RISK_LABEL, type RiskLevel } from "@phishlens/core";

export const riskStyles: Record<RiskLevel, { badge: string; text: string; fill: string; soft: string; Icon: typeof ShieldCheck }> = {
  low: {
    badge: "bg-risk-low-soft text-risk-low-ink ring-risk-low/30",
    text: "text-risk-low-ink",
    fill: "bg-risk-low",
    soft: "bg-risk-low-soft",
    Icon: ShieldCheck,
  },
  medium: {
    badge: "bg-risk-medium-soft text-risk-medium-ink ring-risk-medium/40",
    text: "text-risk-medium-ink",
    fill: "bg-risk-medium",
    soft: "bg-risk-medium-soft",
    Icon: ShieldQuestion,
  },
  high: {
    badge: "bg-risk-high-soft text-risk-high-ink ring-risk-high/30",
    text: "text-risk-high-ink",
    fill: "bg-risk-high",
    soft: "bg-risk-high-soft",
    Icon: ShieldAlert,
  },
};

/** Risk level pill. Always icon + text, never color alone. */
export function RiskBadge({ level, size = "md", className }: { level: RiskLevel; size?: "sm" | "md" | "lg"; className?: string }) {
  const { badge, Icon } = riskStyles[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm tracking-wide uppercase",
        badge,
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />
      {RISK_LABEL[level]}
      {size === "lg" ? " risk" : <span className="sr-only"> risk</span>}
    </span>
  );
}
