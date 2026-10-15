import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-heading" className="pb-24 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="bg-grid-dots-light relative overflow-hidden rounded-[2rem] bg-highlight-soft px-6 py-14 text-center ring-1 ring-highlight/30 sm:px-12 sm:py-16">
            <h2 id="cta-heading" className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              Got a link you&apos;re not sure about?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
              Scan it now — no account needed. Create one to keep your history and reports.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/scanner" variant="primary" size="lg">
                Open the scanner
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="lg">
                Create a free account
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
