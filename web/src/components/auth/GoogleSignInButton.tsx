"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { GOOGLE_CLIENT_ID, USE_MOCKS } from "@/lib/config";
import { cn } from "@/lib/cn";

const GSI_SRC = "https://accounts.google.com/gsi/client";

let gsiPromise: Promise<void> | null = null;

/** Loads the Google Identity Services script once per page. */
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiPromise = null;
      script.remove();
      reject(new Error("Couldn't load Google sign-in. Check your connection or content blocker."));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/** Whether a Google button will render at all in this configuration. */
export const googleSignInAvailable = USE_MOCKS || GOOGLE_CLIENT_ID !== "";

interface Props {
  mode: "login" | "register";
  /** Receives the Google ID token (or a placeholder in mock mode). */
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * "Continue with Google". With a client ID it renders Google's official
 * button (Google Identity Services), whose callback hands us an ID token to
 * exchange at POST /api/auth/google. In mock mode it renders a look-alike
 * that signs in a demo account, since there is no real client ID to use.
 */
export function GoogleSignInButton(props: Props) {
  if (USE_MOCKS) return <MockGoogleButton {...props} />;
  if (!GOOGLE_CLIENT_ID) return null;
  return <OfficialGoogleButton {...props} />;
}

function OfficialGoogleButton({ mode, onCredential, onError, disabled }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [busy, setBusy] = useState(false);
  // keep the latest callbacks without re-initializing Google on every render
  const handlers = useRef({ onCredential, onError });
  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        const el = container.current;
        const gsi = window.google?.accounts.id;
        if (cancelled || !el || !gsi) return;
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          context: mode === "register" ? "signup" : "signin",
          itp_support: true,
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            setBusy(true);
            try {
              await handlers.current.onCredential(credential);
            } catch {
              /* the form shows the error */
            } finally {
              setBusy(false);
            }
          },
        });
        gsi.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: mode === "register" ? "signup_with" : "continue_with",
          logo_alignment: "center",
          width: Math.min(400, Math.max(200, el.offsetWidth)),
        });
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus("failed");
        handlers.current.onError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (status === "failed") return null;

  return (
    <div className={cn("relative flex h-11 justify-center", (disabled || busy) && "pointer-events-none opacity-60")} aria-busy={busy || status === "loading"}>
      {status === "loading" && <div className="skeleton absolute inset-0 rounded-full" aria-hidden />}
      <div ref={container} className="w-full [&>div]:mx-auto" />
      {busy && (
        <span className="absolute inset-0 grid place-items-center rounded-full bg-surface-raised/70" role="status">
          <Spinner className="size-4 text-accent-ink" label="Signing in with Google" />
        </span>
      )}
    </div>
  );
}

function MockGoogleButton({ mode, onCredential, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onCredential("mock-google-credential");
        } catch {
          /* the form shows the error */
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface-raised text-sm font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
    >
      {busy ? <Spinner className="size-4" /> : <GoogleLogo />}
      {mode === "register" ? "Sign up with Google" : "Continue with Google"}
      <span className="sr-only"> (demo account)</span>
    </button>
  );
}

/**
 * Google's "G" mark. Its four colors are Google's brand requirement for the
 * logo, so they are the one place colors are not design tokens.
 */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
