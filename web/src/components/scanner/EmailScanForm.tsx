"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { EMAIL_MAX_LENGTH, validateEmailContent } from "@/lib/validation";

const SAMPLES: { label: string; text: string }[] = [
  { label: "Bank suspension", text: "Your bank account will be suspended. Verify immediately." },
  {
    label: "PayPal alert",
    text: "Dear Customer,\n\nWe detected unusual activity on your PayPal account. Your account will be locked within 24 hours unless you verify your account at http://secure-paypal-login-free.com\n\nPayPal Security Team",
  },
  {
    label: "Team update",
    text: "Hi Priya,\n\nAttaching the slides from Thursday's design review. Let me know if anything's missing before Monday's sync.\n\nThanks,\nDaniel",
  },
];

export function EmailScanForm({ onSubmit, disabled }: { onSubmit: (content: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    const problem = validateEmailContent(value);
    setError(problem);
    if (!problem) onSubmit(value);
  }

  const over = value.length > EMAIL_MAX_LENGTH;

  return (
    <form onSubmit={submit} noValidate aria-label="Analyze an email or message">
      <Field
        label="Email or message content"
        error={error}
        hint="Paste the subject and body. Include any links exactly as they appear."
      >
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <Textarea
              id={id}
              value={value}
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder={"Subject: Action required on your account\n\nDear customer, …"}
              onChange={(e) => {
                setValue(e.target.value);
                if (touched) setError(validateEmailContent(e.target.value));
              }}
              className="pb-8"
            />
            <span
              className={cn("pointer-events-none absolute bottom-3 right-4 text-xs", over ? "text-risk-high-ink" : "text-ink-muted")}
              aria-hidden
            >
              {formatNumber(value.length)} / {formatNumber(EMAIL_MAX_LENGTH)}
            </span>
          </div>
        )}
      </Field>

      <div className="mt-4 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">Samples:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setValue(s.text);
                setError(null);
              }}
              className="rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-line transition-colors hover:bg-surface-sunken"
            >
              {s.label}
            </button>
          ))}
        </div>
        <Button type="submit" loading={disabled} className="shrink-0">
          Analyze message
          {!disabled && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </div>
    </form>
  );
}
