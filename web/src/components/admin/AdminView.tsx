"use client";

import { Activity, Percent, ScrollText, ShieldAlert, Tags, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { DetectionChart } from "@/components/charts/DetectionChart";
import { ScanHistoryTable } from "@/components/dashboard/ScanHistoryTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/context/AuthProvider";
import { useAsync } from "@/lib/hooks/useAsync";
import { adminService } from "@/lib/services/admin";
import type { AdminAnalytics } from "@phishlens/core";
import { KeywordManager } from "./KeywordManager";
import { UserManagement } from "./UserManagement";

type Section = "users" | "logs" | "keywords";

const SECTIONS: Record<Section, { label: string; icon: typeof Users; description: string }> = {
  users: { label: "Users", icon: Users, description: "Change roles or suspend accounts. You can't change your own access." },
  logs: { label: "Detection logs", icon: ScrollText, description: "Every scan across the platform, newest first." },
  keywords: { label: "Keywords", icon: Tags, description: "Phrases the analyzer treats as suspicious, and how many points each adds." },
};
const TABS = (Object.keys(SECTIONS) as Section[]).map((key) => ({ key, label: SECTIONS[key].label, icon: SECTIONS[key].icon }));

/** With no analytics yet, each card shows its own skeleton. */
function AnalyticsCards({ analytics: a }: { analytics?: AdminAnalytics }) {
  return (
    <section aria-label="Analytics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Registered users" value={a?.totalUsers} icon={Users} tone="ink" footnote={a && `${a.activeUsers} active`} />
      <StatCard label="Scans today" value={a?.scansToday} icon={Activity} tone="accent" footnote="Across all users" />
      <StatCard label="Threats detected" value={a?.threatsDetected} icon={ShieldAlert} tone="danger" footnote="High-risk results" />
      <StatCard label="Detection rate" value={a?.detectionRate} suffix="%" icon={Percent} tone="highlight" footnote={a && `${a.activeKeywords} active keywords`} />
    </section>
  );
}

export function AdminView() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("users");
  const analytics = useAsync(() => adminService.analytics());
  const users = useAsync(() => adminService.users());
  const logs = useAsync(() => adminService.logs());
  const keywords = useAsync(() => adminService.keywords());

  const userNames = useMemo(() => {
    const names: Record<string, string> = Object.fromEntries((users.data ?? []).map((u) => [u.id, u.name]));
    if (user) names[user.id] = user.name;
    return names;
  }, [users.data, user]);

  return (
    <>
      <PageHeader title="Admin" description="Platform-wide activity, user access and the detection keyword list." />

      <AsyncBoundary
        state={analytics}
        loadingLabel="Loading analytics"
        loading={<AnalyticsCards />}
        errorTitle="Couldn't load analytics"
        className="rounded-card bg-surface-raised"
      >
        {(data) => <AnalyticsCards analytics={data.analytics} />}
      </AsyncBoundary>

      <Reveal className="mt-6">
        <Card as="section" aria-labelledby="admin-chart-heading">
          <CardHeader id="admin-chart-heading" title="Platform detections" description="All users, scans per day by risk level" />
          <div className="px-5 pb-6 pt-4 sm:px-6">
            <AsyncBoundary state={analytics} loadingLabel="Loading chart" loading={<Skeleton className="h-[260px]" />}>
              {(data) => <DetectionChart data={data.daily} title="Platform scans per day by risk level, last 14 days" />}
            </AsyncBoundary>
          </div>
        </Card>
      </Reveal>

      <section aria-label="Management" className="mt-8">
        <Tabs idBase="admin" label="Admin sections" items={TABS} value={section} onChange={setSection} className="max-w-full overflow-x-auto" />
        <TabPanel idBase="admin" tabKey={section} className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader title={SECTIONS[section].label} description={SECTIONS[section].description} className="pb-4" />
            {section === "users" && <UserManagement state={users} />}
            {section === "logs" && <ScanHistoryTable state={logs} userNames={userNames} caption="Detection logs for all users" />}
            {section === "keywords" && <KeywordManager state={keywords} />}
          </Card>
        </TabPanel>
      </section>
    </>
  );
}
