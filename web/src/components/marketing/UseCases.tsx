import { Building2, GraduationCap, Link2, MailWarning } from "lucide-react";
import { Lift, Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const CASES = [
  {
    icon: Link2,
    title: "URL verification",
    scenario: "“A friend sent a link to a giveaway. Is it real?”",
    body: "Check an unfamiliar link before visiting it, instead of finding out after you've signed in.",
  },
  {
    icon: MailWarning,
    title: "Email safety check",
    scenario: "“My bank says my account will be suspended today.”",
    body: "Paste a suspicious email and see exactly which phrases and links are red flags.",
  },
  {
    icon: GraduationCap,
    title: "Cybersecurity awareness",
    scenario: "“What does a phishing link actually look like?”",
    body: "Students and new staff learn the warning signs from real, explained examples.",
  },
  {
    icon: Building2,
    title: "Organizations",
    scenario: "“Someone shared this in the team chat — safe to open?”",
    body: "Teams verify links shared internally, while admins track trends and tune the keyword list.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" aria-labelledby="use-cases-heading" className="scroll-mt-20 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="use-cases-heading"
            eyebrow="Use cases"
            title="Built for the moment of doubt."
            description="Whether it's one person double-checking a link or a whole team, the question is the same."
          />
        </Reveal>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 2) * 0.1}>
              <Lift className="h-full">
                <div className="group flex h-full flex-col rounded-card border border-line/70 bg-surface-raised p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-highlight-soft text-highlight-ink transition-colors group-hover:bg-highlight group-hover:text-ink">
                      <c.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="text-lg font-semibold text-ink">{c.title}</h3>
                  </div>
                  <p className="mt-5 font-display text-xl italic leading-snug text-ink-soft">{c.scenario}</p>
                  <p className="mt-3 leading-relaxed text-ink-muted">{c.body}</p>
                </div>
              </Lift>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
