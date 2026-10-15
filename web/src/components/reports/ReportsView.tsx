"use client";

import { Download, FileText, SearchX, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lift, Reveal } from "@/components/motion/Reveal";
import { ScanResultCard } from "@/components/scanner/ScanResultCard";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CATEGORY_LABEL, THREAT_CATEGORIES, type RiskLevel, type ScanReport, type ScanResult, type SummaryReport, type ThreatCategory } from "@phishlens/core";
import { formatDateTime } from "@/lib/format";
import { useAsync } from "@/lib/hooks/useAsync";
import { reportService } from "@/lib/services/reports";

interface Filters {
  query: string;
  risk: RiskLevel | "all";
  category: ThreatCategory | "all";
}
const NO_FILTERS: Filters = { query: "", risk: "all", category: "all" };

function matches(r: ScanReport, { query, risk, category }: Filters) {
  const q = query.trim().toLowerCase();
  return (
    (risk === "all" || r.riskLevel === risk) &&
    (category === "all" || r.category === category) &&
    (!q || `${r.title} ${r.details}`.toLowerCase().includes(q))
  );
}

function exportCsv(reports: ScanReport[]) {
  const csv = toCsv(
    ["id", "title", "category", "risk_level", "risk_score", "content", "created_at"],
    reports.map((r) => [r.id, r.title, r.category, r.riskLevel, r.scan.riskScore, r.scan.content, r.createdAt]),
  );
  downloadCsv(`threat-reports-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

export function ReportsView() {
  const state = useAsync(() => reportService.list());
  const [filters, setFilters] = useState(NO_FILTERS);
  const [open, setOpen] = useState<ScanResult | null>(null);

  const { summary, reports } = useMemo(() => {
    const all = state.data ?? [];
    return {
      summary: all.find((r): r is SummaryReport => r.reportType === "summary"),
      reports: all.filter((r): r is ScanReport => r.reportType === "scan"),
    };
  }, [state.data]);
  const filtered = useMemo(() => reports.filter((r) => matches(r, filters)), [reports, filters]);
  const byCategory = useMemo(
    () =>
      THREAT_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABEL[key], value: reports.filter((r) => r.category === key).length })).sort(
        (a, b) => b.value - a.value,
      ),
    [reports],
  );

  return (
    <>
      <PageHeader
        title="Threat reports"
        description="Every medium- and high-risk scan becomes a report, grouped by the pattern behind it."
        actions={
          <Button variant="secondary" onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <AsyncBoundary
        state={state}
        loadingLabel="Loading reports"
        loading={
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        }
        errorTitle="Couldn't load reports"
        className="rounded-card"
        isEmpty={() => reports.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={FileText}
              title="No threats reported yet"
              description="When a scan comes back medium or high risk, a report appears here. That's good news so far."
              action={<ButtonLink href="/scanner" size="sm">Scan something</ButtonLink>}
            />
          </Card>
        }
      >
        {() => (
          <div className="space-y-6">
            {summary && <SummaryBanner summary={summary} reports={reports} />}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Card as="section" aria-labelledby="patterns-heading" className="lg:sticky lg:top-8">
                <CardHeader id="patterns-heading" title="Threats by pattern" description="Distinct flagged scans per category" />
                <div className="p-5 sm:p-6">
                  <CategoryBars rows={byCategory} label="Threat reports per category" />
                </div>
              </Card>

              <section aria-labelledby="reports-heading">
                <h2 id="reports-heading" className="sr-only">Reports</h2>
                <FilterBar filters={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
                {filtered.length === 0 ? (
                  <Card>
                    <EmptyState icon={SearchX} title="No reports match" description="Try another search or filter." />
                  </Card>
                ) : (
                  <ul className="space-y-3">
                    {filtered.map((r) => (
                      <li key={r.id}>
                        <ReportCard report={r} onOpen={() => setOpen(r.scan)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </AsyncBoundary>

      <Dialog open={open !== null} onClose={() => setOpen(null)} title="Report details">
        {open && <ScanResultCard scan={open} />}
      </Dialog>
    </>
  );
}

function SummaryBanner({ summary, reports }: { summary: SummaryReport; reports: ScanReport[] }) {
  return (
    <Reveal>
      <article className="relative overflow-hidden rounded-card bg-ink p-6 text-surface shadow-soft sm:p-8">
        <div className="bg-grid-dots absolute inset-0" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-highlight">
              <Sparkles className="size-3.5" aria-hidden />
              {summary.title}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold leading-snug sm:text-3xl">{summary.details}</p>
          </div>
          <dl className="flex shrink-0 gap-8">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-on-dark-muted">Reports</dt>
              <dd className="text-4xl font-semibold">{reports.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-on-dark-muted">High risk</dt>
              <dd className="text-4xl font-semibold text-on-dark-danger">{reports.filter((r) => r.riskLevel === "high").length}</dd>
            </div>
          </dl>
        </div>
      </article>
    </Reveal>
  );
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (patch: Partial<Filters>) => void }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
      <SearchInput label="Search reports" placeholder="Search reports…" value={filters.query} onChange={(query) => onChange({ query })} className="flex-1" />
      <div className="flex gap-2">
        <Select aria-label="Filter by risk" value={filters.risk} onChange={(e) => onChange({ risk: e.target.value as Filters["risk"] })} className="flex-1 sm:flex-none">
          <option value="all">All risk levels</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
        </Select>
        <Select aria-label="Filter by pattern" value={filters.category} onChange={(e) => onChange({ category: e.target.value as Filters["category"] })} className="flex-1 sm:flex-none">
          <option value="all">All patterns</option>
          {THREAT_CATEGORIES.map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABEL[k]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function ReportCard({ report: r, onOpen }: { report: ScanReport; onOpen: () => void }) {
  return (
    <Lift>
      <Card as="article" className="p-5 transition-shadow hover:shadow-lift">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge level={r.riskLevel} size="sm" />
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-line">{CATEGORY_LABEL[r.category]}</span>
          <time dateTime={r.createdAt} className="ml-auto text-xs text-ink-muted">
            {formatDateTime(r.createdAt)}
          </time>
        </div>
        <h3 className="mt-3 font-semibold text-ink [overflow-wrap:anywhere]">{r.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted [overflow-wrap:anywhere]">{r.details}</p>
        <button type="button" onClick={onOpen} className="mt-3 text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">
          View full report<span className="sr-only">: {r.title}</span>
        </button>
      </Card>
    </Lift>
  );
}
