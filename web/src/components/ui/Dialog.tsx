"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Modal built on the native <dialog> element, which provides the focus trap,
 * Escape-to-close and inert background for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[92vh] w-[min(960px,calc(100vw-2rem))] overflow-visible bg-transparent p-0 backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {open && (
        <div className="relative max-h-[92vh] overflow-y-auto rounded-card">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full bg-surface-raised text-ink-soft shadow-soft ring-1 ring-line hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
