import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "highlight" | "secondary" | "ghost" | "danger" | "on-dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent-strong text-white hover:bg-accent-ink shadow-soft",
  highlight: "bg-highlight text-ink hover:bg-highlight-strong shadow-soft",
  secondary: "bg-surface-raised text-ink border border-line hover:border-line-strong hover:bg-surface",
  ghost: "text-ink-soft hover:bg-surface-sunken",
  danger: "bg-surface-raised text-risk-high-ink border border-risk-high/30 hover:bg-risk-high-soft",
  "on-dark": "bg-white/10 text-surface border border-white/15 hover:bg-white/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-[0.95rem] gap-2 rounded-xl",
  lg: "h-13 px-6 text-base gap-2 rounded-xl",
};

const base =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[background-color,border-color,transform,box-shadow] duration-200 active:translate-y-px disabled:opacity-60 disabled:pointer-events-none select-none";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
