"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border bg-surface-raised px-4 text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-4";
const controlState = (invalid: boolean) =>
  invalid
    ? "border-risk-high/70 focus:border-risk-high focus:ring-risk-high/15"
    : "border-line-strong/70 hover:border-line-strong focus:border-accent focus:ring-accent/20";

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: React.ReactNode;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  /** Use "dark" when the field sits on the ink background. */
  tone?: "light" | "dark";
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

/** Label + control + hint + error, with ids wired for screen readers. */
export function Field({ label, error, hint, hideLabel, tone = "light", className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 block text-sm font-medium", tone === "dark" ? "text-surface" : "text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className={cn("mt-1.5 flex items-start gap-1.5 text-sm", tone === "dark" ? "text-on-dark-danger" : "text-risk-high-ink")}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid = false, ...rest }, ref) {
  return (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, controlState(invalid), "h-12", className)} {...rest} />
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, controlState(invalid), "min-h-44 resize-y py-3 leading-relaxed", className)}
      {...rest}
    />
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 rounded-lg border border-line-strong/70 bg-surface-raised pl-3 pr-8 text-sm text-ink hover:border-line-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
