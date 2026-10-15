import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

// Content is gated client-side by the auth check in <AppShell>, so the server
// render has nothing to validate for instant navigation.
export const instant = false;

export default function DashboardPage() {
  return <DashboardView />;
}
