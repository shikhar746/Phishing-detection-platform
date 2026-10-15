import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const POINTS = [
  "Scan links and emails in seconds",
  "See every reason behind a risk score",
  "Keep a searchable history of your scans",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-surface lg:flex lg:flex-col">
        <div className="bg-grid-dots absolute inset-0" aria-hidden />
        <div className="absolute -bottom-32 -left-32 size-[420px] rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <div className="relative">
          <Logo tone="light" />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight">
            The best time to spot a phishing link is <em className="text-highlight">before</em> you open it.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-on-dark-muted">
                <CheckCircle2 className="size-5 shrink-0 text-on-dark-accent" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main id="main" className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
