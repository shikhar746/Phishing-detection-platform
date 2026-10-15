import { Link2, Mail } from "lucide-react";
import type { ScanType } from "@/lib/types";

/** Decorative icon for what was scanned. */
export function ScanTypeIcon({ type, className }: { type: ScanType; className?: string }) {
  const Icon = type === "url" ? Link2 : Mail;
  return <Icon className={className} aria-hidden />;
}
