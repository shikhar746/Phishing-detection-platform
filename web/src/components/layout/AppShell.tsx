"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShieldEllipsis, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/States";
import { useAuth } from "@/context/AuthProvider";
import { accessFor, gate, type Gate } from "./routes";
import { Sidebar } from "./Sidebar";

const BLOCKED: Record<Exclude<Gate, "allow">, React.ReactNode> = {
  checking: (
    <div className="grid min-h-[60vh] place-items-center" role="status">
      <Spinner className="size-6 text-accent-ink" label="Checking your session" />
    </div>
  ),
  // shown for the moment before the redirect to /login lands
  login: (
    <div className="grid min-h-[60vh] place-items-center" role="status">
      <Spinner className="size-6 text-accent-ink" label="Redirecting to sign in" />
    </div>
  ),
  forbidden: (
    <EmptyState
      icon={ShieldEllipsis}
      title="Admins only"
      description="Your account doesn't have access to the admin dashboard. Ask an administrator if you need it."
      action={<ButtonLink href="/dashboard" size="sm">Back to dashboard</ButtonLink>}
      className="min-h-[60vh]"
    />
  ),
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const verdict = gate(accessFor(pathname), { user, loading });

  useEffect(() => {
    if (verdict === "login") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [verdict, pathname, router]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen bg-ink lg:block">
        <Sidebar id="desktop" pathname={pathname} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between bg-ink px-4 lg:hidden">
        <Logo tone="light" />
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="grid size-10 place-items-center rounded-lg text-surface hover:bg-white/10"
          aria-label="Open navigation"
          aria-expanded={drawer}
          aria-controls="app-drawer"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <motion.div className="absolute inset-0 bg-ink/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              id="app-drawer"
              className="absolute inset-y-0 left-0 w-[280px] bg-ink"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-4 grid size-9 place-items-center rounded-lg text-surface hover:bg-white/10"
                aria-label="Close navigation"
                autoFocus
              >
                <X className="size-5" aria-hidden />
              </button>
              <Sidebar id="drawer" pathname={pathname} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main id="main" className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{verdict === "allow" ? children : BLOCKED[verdict]}</div>
      </main>
    </div>
  );
}
