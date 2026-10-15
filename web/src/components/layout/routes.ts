import { FileWarning, LayoutDashboard, ScanSearch, ShieldEllipsis, type LucideIcon } from "lucide-react";
import type { User } from "@/lib/types";

/** Who may open a page inside the app shell. */
export type Access = "public" | "user" | "admin";

export interface AppRoute {
  href: string;
  label: string;
  icon: LucideIcon;
  access: Access;
}

// The single source of truth for the app's pages: the sidebar, the auth gate
// and the admin check are all derived from this list.
export const APP_ROUTES: AppRoute[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, access: "user" },
  { href: "/scanner", label: "Scanner", icon: ScanSearch, access: "public" },
  { href: "/reports", label: "Threat reports", icon: FileWarning, access: "user" },
  { href: "/admin", label: "Admin", icon: ShieldEllipsis, access: "admin" },
];

export function isActive(route: AppRoute, pathname: string): boolean {
  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}

/** Pages not in the table default to signed-in only. */
export function accessFor(pathname: string): Access {
  return APP_ROUTES.find((r) => isActive(r, pathname))?.access ?? "user";
}

/** Sidebar entries: admin pages only for admins; others always (they redirect to sign-in). */
export function visibleRoutes(user: User | null): AppRoute[] {
  return APP_ROUTES.filter((r) => r.access !== "admin" || user?.role === "admin");
}

export type Gate = "allow" | "checking" | "login" | "forbidden";

/** What the shell should render for a page, given the session. */
export function gate(access: Access, session: { user: User | null; loading: boolean }): Gate {
  if (access === "public") return "allow";
  if (session.loading) return "checking";
  if (!session.user) return "login";
  if (access === "admin" && session.user.role !== "admin") return "forbidden";
  return "allow";
}
