import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "./Field";

/** Search box with a leading icon. `label` is the accessible name. */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg pl-10 text-sm"
      />
    </div>
  );
}
