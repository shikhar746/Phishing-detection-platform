"use client";

import { LayoutGroup, motion } from "framer-motion";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/cn";
import { USE_MOCKS } from "@/lib/config";
import { initials } from "@/lib/format";
import { isActive, visibleRoutes } from "./routes";

/**
 * Logo, page links, demo-mode note and the account box. Rendered both in the
 * desktop column and the mobile drawer; `id` keeps their active-link
 * animations independent.
 */
export function Sidebar({ id, pathname, onNavigate }: { id: string; pathname: string; onNavigate?: () => void }) {
  const { user, loading } = useAuth();

  return (
    <div className="flex h-full flex-col gap-8 p-5">
      <Logo tone="light" />

      <nav aria-label="App" className="flex-1">
        <LayoutGroup id={id}>
          <ul className="space-y-1">
            {visibleRoutes(user).map((route) => {
              const active = isActive(route, pathname);
              return (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "text-ink" : "text-on-dark-muted hover:bg-white/6 hover:text-surface",
                    )}
                  >
                    {active && (
                      <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-surface" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                    )}
                    <route.icon className="relative size-4.5" aria-hidden />
                    <span className="relative">{route.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>

      {USE_MOCKS && (
        <p className="flex items-start gap-2 rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-on-dark-muted">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-highlight" aria-hidden />
          Demo mode: data is simulated and stored in this browser.
        </p>
      )}

      {user ? <AccountBox /> : !loading && (
        <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="highlight" className="w-full">
          <LogIn className="size-4" aria-hidden />
          Sign in to save scans
        </ButtonLink>
      )}
    </div>
  );
}

function AccountBox() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-highlight text-sm font-semibold text-ink" aria-hidden>
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-surface">{user.name}</p>
        <p className="truncate text-xs text-on-dark-muted">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.push("/");
        }}
        className="grid size-9 place-items-center rounded-lg text-on-dark-muted hover:bg-white/10 hover:text-surface"
        aria-label="Sign out"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}
