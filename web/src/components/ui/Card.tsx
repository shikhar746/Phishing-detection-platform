import { cn } from "@/lib/cn";

export function Card({ className, as: Tag = "div", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }) {
  return (
    <Tag
      className={cn("rounded-card border border-line/70 bg-surface-raised shadow-soft", className)}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  id,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
