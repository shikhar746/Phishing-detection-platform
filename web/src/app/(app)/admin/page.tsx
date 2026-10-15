import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";

export const metadata: Metadata = { title: "Admin" };

// Content is gated client-side by the auth check in <AppShell>, so the server
// render has nothing to validate for instant navigation.
export const instant = false;

export default function AdminPage() {
  return <AdminView />;
}
