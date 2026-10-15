"use client";

import { SearchX, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useAuth } from "@/context/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative, initials } from "@/lib/format";
import type { UseAsyncResult } from "@/lib/hooks/useAsync";
import { adminService, type UserPatch } from "@/lib/services/admin";
import type { AdminUser, Role } from "@phishlens/core";

export function UserManagement({ state }: { state: UseAsyncResult<AdminUser[]> }) {
  const { user: me } = useAuth();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { setData } = state;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (state.data ?? []).filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [state.data, query]);

  const replace = (next: AdminUser) => setData((list) => list.map((u) => (u.id === next.id ? next : u)));

  // optimistic: show the change at once, then keep the server's copy or roll back
  async function change(user: AdminUser, patch: UserPatch) {
    setActionError(null);
    setPending(user.id);
    replace({ ...user, ...patch });
    try {
      replace(await adminService.updateUser(user.id, patch));
    } catch (err) {
      replace(user);
      setActionError(`Couldn't update ${user.name}: ${errorMessage(err)}`);
    } finally {
      setPending(null);
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loadingLabel="Loading users"
      loading={<div className="space-y-2 p-5 sm:p-6">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>}
      errorTitle="Couldn't load users"
      isEmpty={(users) => users.length === 0}
      empty={<EmptyState icon={Users} title="No users yet" description="People who register will appear here." />}
    >
      {() => (
    <div>
      <div className="px-5 pb-4 sm:px-6">
        <SearchInput label="Search users" placeholder="Search name or email…" value={query} onChange={setQuery} className="max-w-sm" />
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-risk-high-ink">
            {actionError}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No users match" description="Try a different name or email." />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Registered users</caption>
            <thead>
              <tr className="border-y border-line/70 bg-surface/60 text-left text-xs uppercase tracking-[0.08em] text-ink-muted">
                <th scope="col" className="py-2.5 pl-6 pr-3 font-semibold">User</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Role</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Scans</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Last active</th>
                <th scope="col" className="py-2.5 pl-3 pr-6 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((u) => {
                const isMe = me?.email === u.email;
                const busy = pending === u.id;
                return (
                  <tr key={u.id} className={cn(u.status === "suspended" && "bg-surface/50")}>
                    <td className="py-3 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink" aria-hidden>
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{u.name}{isMe && <span className="ml-1.5 text-xs text-ink-muted">(you)</span>}</p>
                          <p className="truncate text-xs text-ink-muted">{u.email} · joined {formatDate(u.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={busy || isMe}
                        onChange={(e) => change(u, { role: e.target.value as Role })}
                        className="h-9"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                          u.status === "active" ? "bg-risk-low-soft text-risk-low-ink ring-risk-low/30" : "bg-surface-sunken text-ink-muted ring-line-strong",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", u.status === "active" ? "bg-risk-low" : "bg-ink-faint")} aria-hidden />
                        {u.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{u.scans}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatRelative(u.lastActive)}</td>
                    <td className="py-3 pl-3 pr-6 text-right">
                      <button
                        type="button"
                        disabled={busy || isMe}
                        onClick={() => change(u, { status: u.status === "active" ? "suspended" : "active" })}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ring-1 transition-colors disabled:opacity-40",
                          u.status === "active"
                            ? "text-risk-high-ink ring-risk-high/30 hover:bg-risk-high-soft"
                            : "text-accent-ink ring-accent/40 hover:bg-accent-soft",
                        )}
                      >
                        {busy && <Spinner className="size-3.5" />}
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                        <span className="sr-only"> {u.name}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
      )}
    </AsyncBoundary>
  );
}
