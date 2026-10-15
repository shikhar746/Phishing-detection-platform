import Link from "next/link";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/config";

/** Lens mark: a shield outline with a focus ring — "looking closely". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <path
        d="M16 2.5 4.5 7v8.2c0 7.2 4.9 12.3 11.5 14.3 6.6-2 11.5-7.1 11.5-14.3V7L16 2.5Z"
        className="fill-accent"
      />
      <circle cx="16" cy="15" r="5.2" className="fill-none stroke-surface" strokeWidth="2.2" />
      <path d="m19.8 18.8 3.4 3.4" className="stroke-highlight" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "dark", className, href = "/" }: { tone?: "dark" | "light"; className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.shortName} home`}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className={cn("font-display text-xl font-semibold tracking-tight", tone === "dark" ? "text-ink" : "text-surface")}>
        {siteConfig.shortName}
      </span>
    </Link>
  );
}
