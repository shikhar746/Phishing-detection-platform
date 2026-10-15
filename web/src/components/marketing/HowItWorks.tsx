import { Gauge, LayoutDashboard, ScanSearch, Send } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    icon: Send,
    title: "Submit",
    body: "Paste a URL, or copy in the email or message that feels off.",
  },
  {
    icon: ScanSearch,
    title: "Analyze",
    body: "Rule checks run on HTTPS, keywords and domain structure, while VirusTotal and Safe Browsing check its reputation.",
  },
  {
    icon: Gauge,
    title: "Risk score",
    body: "You get a risk level, a percentage, the threat status and a clear recommendation — plus every reason behind it.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    body: "Each result is saved to your history, so you can spot patterns and revisit reports later.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="how-heading"
            eyebrow="How it works"
            title="Four steps from “is this real?” to an answer."
          />
        </Reveal>

        <div className="relative mt-16">
          {/* connecting rule behind the step icons on large screens */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-line-strong lg:block" aria-hidden />
        <ol className="relative grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 0.1} className="relative">
                <div className="flex items-center gap-4">
                  <span className="relative grid size-14 place-items-center rounded-2xl bg-ink text-surface shadow-soft">
                    <step.icon className="size-6" aria-hidden />
                    <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-highlight font-mono text-xs font-semibold text-ink ring-4 ring-surface">
                      {i + 1}
                    </span>
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{step.body}</p>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
