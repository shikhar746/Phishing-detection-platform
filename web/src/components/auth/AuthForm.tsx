"use client";

import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { USE_MOCKS } from "@/lib/config";
import type { User } from "@phishlens/core";
import { validateEmailAddress, validateName, validatePassword } from "@/lib/validation";
import { GoogleSignInButton, googleSignInAvailable } from "./GoogleSignInButton";

type Mode = "login" | "register";
type Values = { name: string; email: string; password: string };
type Errors = Partial<Record<keyof Values, string | null>>;
type Auth = ReturnType<typeof useAuth>;

// Everything that differs between the two forms lives here, so the component
// body has no per-mode branching.
const MODES: Record<
  Mode,
  {
    title: string;
    subtitle: string;
    submitLabel: string;
    askName: boolean;
    passwordHint?: string;
    passwordAutoComplete: "current-password" | "new-password";
    validate: (v: Values) => Errors;
    submit: (auth: Auth, v: Values) => Promise<User>;
    switchPrompt: string;
    switchLabel: string;
    switchPath: string;
  }
> = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to see your scan history and reports.",
    submitLabel: "Sign in",
    askName: false,
    passwordAutoComplete: "current-password",
    validate: (v) => ({ email: validateEmailAddress(v.email), password: validatePassword(v.password) }),
    submit: (auth, v) => auth.login({ email: v.email.trim(), password: v.password }),
    switchPrompt: "New here? ",
    switchLabel: "Create an account",
    switchPath: "/register",
  },
  register: {
    title: "Create your account",
    subtitle: "Save every scan and get threat reports over time.",
    submitLabel: "Create account",
    askName: true,
    passwordHint: "At least 8 characters, with a letter and a number.",
    passwordAutoComplete: "new-password",
    validate: (v) => ({
      name: validateName(v.name),
      email: validateEmailAddress(v.email),
      password: validatePassword(v.password, { strict: true }),
    }),
    submit: (auth, v) => auth.register({ name: v.name.trim(), email: v.email.trim(), password: v.password }),
    switchPrompt: "Already have an account? ",
    switchLabel: "Sign in",
    switchPath: "/login",
  },
};

/** Only allow same-site relative redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/** Field errors from the API's validation issues, keyed by form field. */
function fieldErrorsFrom(err: unknown): Errors {
  const errors: Errors = {};
  if (err instanceof ApiError) {
    for (const { path, message } of err.issues ?? []) {
      const key = path[0];
      if (key === "name" || key === "email" || key === "password") errors[key] = message;
    }
  }
  return errors;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useAuth();
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const config = MODES[mode];
  const next = params.get("next");
  const validate = config.validate;

  function update(key: keyof Values, value: string) {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: validate(nextValues)[key] }));
  }

  function redirectAfterAuth(user: User) {
    router.replace(user.role === "admin" && !next ? "/admin" : safeNext(next));
  }

  async function onGoogleCredential(credential: string) {
    setFormError(null);
    try {
      redirectAfterAuth(await auth.loginWithGoogle(credential));
    } catch (err) {
      setFormError(errorMessage(err));
      throw err;
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const found = validate(values);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as (keyof Values)[]).find((k) => found[k]);
    if (firstInvalid) {
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      redirectAfterAuth(await config.submit(auth, values));
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{config.title}</h1>
      <p className="mt-2 text-ink-muted">{config.subtitle}</p>

      {USE_MOCKS && (
        <div className="mt-6 flex gap-3 rounded-xl bg-highlight-soft p-4 text-sm text-ink-soft ring-1 ring-highlight/30">
          <Info className="mt-0.5 size-4 shrink-0 text-highlight-ink" aria-hidden />
          <p>
            <strong className="font-semibold text-ink">Demo mode.</strong> Any email and an 8+ character password work. Use an
            address starting with <code className="font-mono">admin</code> to see the admin dashboard.
          </p>
        </div>
      )}

      {formError && (
        <div id="auth-error" role="alert" className="mt-6 flex gap-3 rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </div>
      )}

      {googleSignInAvailable && (
        <>
          <div className="mt-8">
            <GoogleSignInButton mode={mode} onCredential={onGoogleCredential} onError={setFormError} disabled={submitting} />
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted" role="separator">
            <span className="h-px flex-1 bg-line" aria-hidden />
            or use email
            <span className="h-px flex-1 bg-line" aria-hidden />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate className={googleSignInAvailable ? "mt-6 space-y-5" : "mt-8 space-y-5"} aria-describedby={formError ? "auth-error" : undefined}>

        {config.askName && (
          <Field label="Full name" error={errors.name}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="name" autoComplete="name" value={values.name} invalid={invalid} aria-describedby={describedBy} onChange={(e) => update("name", e.target.value)} />
            )}
          </Field>
        )}

        <Field label="Email" error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => update("email", e.target.value)}
            />
          )}
        </Field>

        <Field label="Password" error={errors.password} hint={config.passwordHint}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={config.passwordAutoComplete}
                value={values.password}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => update("password", e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {config.submitLabel}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-muted">
        {config.switchPrompt}
        <Link
          href={next ? `${config.switchPath}?next=${encodeURIComponent(next)}` : config.switchPath}
          className="font-semibold text-accent-ink underline-offset-4 hover:underline"
        >
          {config.switchLabel}
        </Link>
      </p>
    </motion.div>
  );
}
