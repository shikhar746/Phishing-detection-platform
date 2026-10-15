import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/ReportsView";

export const metadata: Metadata = { title: "Threat reports" };

// Content is gated client-side by the auth check in <AppShell>, so the server
// render has nothing to validate for instant navigation.
export const instant = false;

export default function ReportsPage() {
  return <ReportsView />;
}
