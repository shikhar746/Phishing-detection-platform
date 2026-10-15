"use client";

import { Activity, ScanSearch, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { DetectionChart } from "@/components/charts/DetectionChart";
import { ScanHistoryTable } from "@/components/dashboard/ScanHistoryTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/context/AuthProvider";
import { useAsync } from "@/lib/hooks/useAsync";
import { scanService } from "@/lib/services/scans";
import type { ScanStats } from "@phishlens/core";

const CHART_TITLE = "Scans per day by risk level, last 14 days";

/** The four headline numbers; with no stats yet, each card shows its own skeleton. */
function SummaryCards({ stats: s }: { stats?: ScanStats }) {
  const pct = (n: number) => (s?.total ? Math.round((n / s.total) * 100) : 0);
  return (
    <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total scans" value={s?.total} icon={Activity} tone="ink" footnote="URLs and messages" />
      <StatCard label="Safe URLs & messages" value={s?.safe} icon={ShieldCheck} tone="accent" footnote={s && `${pct(s.safe)}% of all scans`} />
      <StatCard label="Needs caution" value={s?.medium} icon={ShieldQuestion} tone="highlight" footnote={s && `${pct(s.medium)}% medium risk`} />
      <StatCard label="Suspicious" value={s?.suspicious} icon={ShieldAlert} tone="danger" footnote={s && `${pct(s.suspicious)}% high risk`} />
    </section>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const stats = useAsync(() => scanService.stats());
  const history = useAsync(() => scanService.history());

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0] ?? "there"}`}
        description="Your scans, what they found, and how that's changed over the last two weeks."
        actions={
          <ButtonLink href="/scanner">
            <ScanSearch className="size-4" aria-hidden />
            New scan
          </ButtonLink>
        }
      />

      <AsyncBoundary
        state={stats}
        loadingLabel="Loading your stats"
        loading={<SummaryCards />}
        errorTitle="Couldn't load your stats"
        className="rounded-card bg-surface-raised"
      >
        {(data) => <SummaryCards stats={data.stats} />}
      </AsyncBoundary>

      <Reveal className="mt-6">
        <Card as="section" aria-labelledby="chart-heading">
          <CardHeader id="chart-heading" title="Detection statistics" description="Scans per day by risk level, last 14 days" />
          <div className="px-5 pb-6 pt-4 sm:px-6">
            <AsyncBoundary
              state={stats}
              loadingLabel="Loading chart"
              loading={<Skeleton className="h-[260px] w-full" />}
              isEmpty={(data) => data.daily.every((d) => d.low + d.medium + d.high === 0)}
              empty={<EmptyState title="Nothing to chart yet" description="Detection trends appear once you've run a few scans." />}
            >
              {(data) => <DetectionChart data={data.daily} title={CHART_TITLE} />}
            </AsyncBoundary>
          </div>
        </Card>
      </Reveal>

      <Reveal className="mt-6">
        <Card as="section" aria-labelledby="history-heading" className="overflow-hidden">
          <CardHeader id="history-heading" title="Scan history" description="Select a scan to see its full report." className="pb-4" />
          <ScanHistoryTable state={history} caption="Your scan history" />
        </Card>
      </Reveal>
    </>
  );
}
