import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = "left",
  tone = "light",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  id: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", tone === "dark" ? "text-highlight" : "text-highlight-ink")}>
        {eyebrow}
      </p>
      <h2
        id={id}
        className={cn(
          "mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl",
          tone === "dark" ? "text-surface" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-lg leading-relaxed", tone === "dark" ? "text-on-dark-muted" : "text-ink-muted")}>{description}</p>
      )}
    </div>
  );
}
