import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { siteConfig } from "@/lib/config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/scanner", label: "URL scanner" },
      { href: "/scanner?tab=email", label: "Email analyzer" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/reports", label: "Threat reports" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#features", label: "What we check" },
      { href: "/#use-cases", label: "Use cases" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo tone="light" />
            <p className="mt-4 text-sm leading-relaxed text-on-dark-muted">
              {siteConfig.name}. Check links and messages before you trust them.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-highlight">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-on-dark-muted transition-colors hover:text-surface">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-on-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {siteConfig.shortName}. Results are guidance, not a guarantee — when in doubt, don&apos;t click.</p>
          <p>Reputation data from VirusTotal and Google Safe Browsing.</p>
        </div>
      </div>
    </footer>
  );
}
