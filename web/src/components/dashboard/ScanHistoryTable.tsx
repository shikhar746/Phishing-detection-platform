"use client";

import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ScanTypeIcon } from "@/components/ui/ScanTypeIcon";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { ScanResultCard } from "@/components/scanner/ScanResultCard";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative, shortContent } from "@/lib/format";
import type { UseAsyncResult } from "@/lib/hooks/useAsync";
import type { RiskLevel, ScanResult, ScanType } from "@/lib/types";

const PAGE_SIZE = 8;

interface Filters {
  query: string;
  risk: RiskLevel | "all";
  type: ScanType | "all";
}
const NO_FILTERS: Filters = { query: "", risk: "all", type: "all" };

function matches(s: ScanResult, { query, risk, type }: Filters, userNames?: Record<string, string>) {
  const q = query.trim().toLowerCase();
  const haystack = [s.content, s.threatStatus, userNames?.[s.userId ?? ""] ?? ""].join(" ").toLowerCase();
  return (risk === "all" || s.riskLevel === risk) && (type === "all" || s.type === type) && (!q || haystack.includes(q));
}

interface Props {
  state: UseAsyncResult<ScanResult[]>;
  /** Admin logs show which user ran each scan. */
  userNames?: Record<string, string>;
  caption: string;
}

export function ScanHistoryTable({ state, userNames, caption }: Props) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<ScanResult | null>(null);

  const filtered = useMemo(
    () => (state.data ?? []).filter((s) => matches(s, filters, userNames)),
    [state.data, filters, userNames],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const showUser = Boolean(userNames);
  const ownerName = (s: ScanResult) => userNames?.[s.userId ?? ""] ?? "Unknown user";

  // every filter change starts again from the first page
  function filter(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  }

  return (
    <div>
      {/* Filter row */}
      <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-center sm:px-6">
        <SearchInput
          label="Search scans"
          placeholder={showUser ? "Search URL, message or user…" : "Search URL or message…"}
          value={filters.query}
          onChange={(query) => filter({ query })}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select aria-label="Filter by risk level" value={filters.risk} onChange={(e) => filter({ risk: e.target.value as Filters["risk"] })} className="flex-1 sm:flex-none">
            <option value="all">All risk levels</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </Select>
          <Select aria-label="Filter by scan type" value={filters.type} onChange={(e) => filter({ type: e.target.value as Filters["type"] })} className="flex-1 sm:flex-none">
            <option value="all">All types</option>
            <option value="url">URLs</option>
            <option value="email">Emails</option>
          </Select>
        </div>
      </div>

      <AsyncBoundary
        state={state}
        loadingLabel="Loading scan history"
        loading={
          <div className="space-y-2 px-5 pb-6 sm:px-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        }
        errorTitle="Couldn't load scan history"
        isEmpty={(scans) => scans.length === 0}
        empty={
          <EmptyState
            title="No scans yet"
            description="Scan a link or paste a suspicious email and the results will show up here."
            action={<ButtonLink href="/scanner" size="sm">Run your first scan</ButtonLink>}
          />
        }
      >
        {() =>
          filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No scans match these filters"
              description="Try a different search term or clear the filters."
              action={
                <button
                  type="button"
                  className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline"
                  onClick={() => filter(NO_FILTERS)}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
        <div>
          {/* Desktop table */}
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr className="border-y border-line/70 bg-surface/60 text-left text-xs uppercase tracking-[0.08em] text-ink-muted">
                  <th scope="col" className="py-2.5 pl-6 pr-3 font-semibold">Scanned content</th>
                  {showUser && <th scope="col" className="px-3 py-2.5 font-semibold">User</th>}
                  <th scope="col" className="px-3 py-2.5 font-semibold">Risk</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Score</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="py-2.5 pl-3 pr-6 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {rows.map((s) => (
                  <tr key={s.id} className="group transition-colors hover:bg-surface/70">
                    <td className="max-w-0 py-3 pl-6 pr-3">
                      <button
                        type="button"
                        onClick={() => setOpen(s)}
                        className="flex w-full min-w-0 items-center gap-2.5 text-left"
                        aria-label={`View details for ${shortContent(s.content, 80)}`}
                      >
                        <ScanTypeIcon type={s.type} className="size-4 shrink-0 text-ink-faint" />
                        <span className={cn("truncate text-ink group-hover:text-accent-ink group-hover:underline underline-offset-4", s.type === "url" && "font-mono text-[0.8rem]")}>
                          {shortContent(s.content, 90)}
                        </span>
                      </button>
                    </td>
                    {showUser && <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{ownerName(s)}</td>}
                    <td className="px-3 py-3"><RiskBadge level={s.riskLevel} size="sm" /></td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-ink-soft">{s.riskScore}%</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{s.threatStatus}</td>
                    <td className="whitespace-nowrap py-3 pl-3 pr-6 text-right text-ink-muted">
                      <time dateTime={s.createdAt} title={formatDateTime(s.createdAt)}>{formatRelative(s.createdAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line/60 border-t border-line/70 md:hidden" aria-label={caption}>
            {rows.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setOpen(s)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-surface/70">
                  <ScanTypeIcon type={s.type} className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm text-ink", s.type === "url" && "font-mono text-xs")}>{shortContent(s.content, 70)}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <RiskBadge level={s.riskLevel} size="sm" />
                      <span>{s.riskScore}%</span>
                      <span aria-hidden>·</span>
                      {showUser && <span>{ownerName(s)} ·</span>}
                      <time dateTime={s.createdAt}>{formatRelative(s.createdAt)}</time>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <nav className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-3 text-sm sm:px-6" aria-label="Pagination">
            <p className="text-ink-muted" aria-live="polite">
              {current * PAGE_SIZE + 1}–{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                className="grid size-9 place-items-center rounded-lg text-ink-soft ring-1 ring-line hover:bg-surface disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages - 1}
                className="grid size-9 place-items-center rounded-lg text-ink-soft ring-1 ring-line hover:bg-surface disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </nav>
        </div>
          )
        }
      </AsyncBoundary>

      <Dialog open={open !== null} onClose={() => setOpen(null)} title="Scan details">
        {open && <ScanResultCard scan={open} />}
      </Dialog>
    </div>
  );
}
