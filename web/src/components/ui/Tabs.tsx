"use client";

import { motion } from "framer-motion";
import { useId, useRef } from "react";
import { cn } from "@/lib/cn";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
 * Render panels with <TabPanel> using the same `idBase`.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  className,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  idBase: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const layoutId = useId();

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[next]!.key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex rounded-2xl bg-surface-sunken p-1 ring-1 ring-line/60", className)}
    >
      {items.map((item, i) => {
        const selected = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`${idBase}-tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:px-5",
              selected ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-surface-raised shadow-soft"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {Icon && <Icon className="relative size-4" aria-hidden />}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idBase,
  tabKey,
  children,
  className,
}: {
  idBase: string;
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${tabKey}`}
      aria-labelledby={`${idBase}-tab-${tabKey}`}
      tabIndex={0}
      className={cn("focus-visible:outline-offset-4", className)}
    >
      {children}
    </div>
  );
}
