import { CheckCircle2, FileBarChart2, History, Link2, Mail, ShieldHalf, SlidersHorizontal } from "lucide-react";
import { Lift, Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { SectionHeading } from "./SectionHeading";

const URL_CHECKS = [
  "HTTPS and encryption",
  "Brand impersonation",
  "Suspicious keywords",
  "Raw IP addresses",
  "Hyphen-stuffed domains",
  "Deep subdomains",
  "Throwaway domain endings",
  "Look-alike characters",
  "Hidden “@” redirects",
  "Link shorteners",
];

const FEATURES = [
  {
    icon: Mail,
    title: "Email & message analyzer",
    body: "Spots urgency, threats, credential requests, fake security alerts and scam phrases — and scores any links inside.",
  },
  {
    icon: ShieldHalf,
    title: "Two reputation services",
    body: "Every URL is checked against VirusTotal's security vendors and Google Safe Browsing's unsafe-site lists.",
  },
  {
    icon: History,
    title: "Scan history & dashboard",
    body: "Search and filter everything you've scanned, with daily detection trends at a glance.",
  },
  {
    icon: FileBarChart2,
    title: "Threat reports",
    body: "Flagged scans become reports grouped by pattern, so you can see what's actually targeting you.",
  },
  {
    icon: SlidersHorizontal,
    title: "Admin keyword control",
    body: "Admins tune the suspicious-keyword list and weights as new scams appear — no redeploy needed.",
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 bg-surface-raised py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="features-heading"
            eyebrow="Features"
            title="Transparent checks, not a black box."
            description="No mystery model. Every score is the sum of specific, explainable signals — and we show you each one."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Lead feature */}
          <Reveal className="lg:row-span-2">
            <Lift className="h-full">
              <article className="relative h-full overflow-hidden rounded-card bg-ink p-7 text-surface shadow-soft sm:p-8">
                <div className="bg-grid-dots absolute inset-0" aria-hidden />
                <div className="relative">
                  <span className="grid size-11 place-items-center rounded-xl bg-highlight text-ink">
                    <Link2 className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-6 font-display text-3xl font-semibold">URL scanner</h3>
                  <p className="mt-3 leading-relaxed text-on-dark-muted">
                    Paste any link and get a verdict without ever opening it. These are the checks it runs:
                  </p>
                  <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                    {URL_CHECKS.map((c) => (
                      <li key={c} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="size-4 shrink-0 text-on-dark-accent" aria-hidden />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Lift>
          </Reveal>

          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 2) * 0.08} className={cn(i === 4 && "lg:col-span-2")}>
              <Lift className="h-full">
                <article className="h-full rounded-card border border-line/70 bg-surface p-6 transition-shadow hover:shadow-lift sm:p-7">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">{f.body}</p>
                </article>
              </Lift>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
