import { Reveal } from "@/components/motion/Reveal";
import { DEFAULT_KEYWORDS } from "@phishlens/core";

// Product facts, not usage numbers — swap in live platform totals from the
// API (e.g. GET /api/stats/public) once real traffic exists.
const STATS = [
  { value: "11", label: "link-structure checks per URL" },
  { value: `${DEFAULT_KEYWORDS.length}+`, label: "phishing keywords and phrases" },
  { value: "2", label: "reputation services queried" },
  { value: "~2s", label: "typical time to a verdict" },
];

export function StatsStrip() {
  return (
    <section aria-label="Platform at a glance" className="bg-ink text-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="flex flex-col border-l border-white/15 pl-5">
              <dt className="order-2 mt-1 text-sm text-on-dark-muted">{s.label}</dt>
              <dd className="order-1 text-4xl font-semibold tracking-tight text-highlight sm:text-5xl">{s.value}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
