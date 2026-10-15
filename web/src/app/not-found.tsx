import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="main" className="bg-grid-dots-light grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <LogoMark className="mx-auto size-12" />
        <p className="mt-6 font-mono text-sm text-ink-muted">404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">This page doesn&apos;t exist.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          If someone sent you this link, that&apos;s worth a second look — try scanning it.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/scanner" variant="secondary">Open scanner</ButtonLink>
        </div>
      </div>
    </main>
  );
}
