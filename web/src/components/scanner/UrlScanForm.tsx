"use client";

import { ArrowRight, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { validateUrl } from "@phishlens/core";

const SAMPLES = ["http://secure-paypal-login-free.com", "https://github.com/vercel/next.js", "https://bit.ly/3xYz9Qa"];

export function UrlScanForm({
  onSubmit,
  disabled,
  defaultValue = "",
  tone = "light",
  showSamples = true,
  autoFocus,
}: {
  onSubmit: (url: string) => void;
  disabled?: boolean;
  defaultValue?: string;
  /** "dark" renders the compact hero variant on the ink background. */
  tone?: "light" | "dark";
  showSamples?: boolean;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const problem = validateUrl(value);
    setError(problem);
    if (!problem) onSubmit(value.trim());
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Scan a URL">
      <Field
        label="Website URL"
        hideLabel={tone === "dark"}
        tone={tone}
        error={error}
        hint={tone === "light" ? "Paste the full link. We never open the page in your browser." : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row",
              tone === "dark" && "rounded-2xl bg-surface-raised p-2 shadow-lift ring-1 ring-white/10",
            )}
          >
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
              <Input
                id={id}
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus={autoFocus}
                placeholder="https://example.com/login"
                value={value}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (touched) setError(validateUrl(e.target.value));
                }}
                className={cn("pl-12 font-mono text-[0.95rem]", tone === "dark" && "h-13 border-transparent hover:border-transparent")}
              />
            </div>
            <Button type="submit" variant={tone === "dark" ? "highlight" : "primary"} size={tone === "dark" ? "lg" : "md"} loading={disabled} className={tone === "light" ? "h-12" : ""}>
              Scan Now
              {!disabled && <ArrowRight className="size-4" aria-hidden />}
            </Button>
          </div>
        )}
      </Field>

      {showSamples && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className={tone === "dark" ? "text-on-dark-muted" : "text-ink-muted"}>Try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                setError(null);
              }}
              className={cn(
                "max-w-full truncate rounded-lg px-2.5 py-1 font-mono text-xs transition-colors",
                tone === "dark"
                  ? "bg-white/8 text-surface ring-1 ring-white/12 hover:bg-white/14"
                  : "bg-surface text-ink-soft ring-1 ring-line hover:bg-surface-sunken",
              )}
            >
              {s.replace(/^https?:\/\//, "")}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
