// localStorage-backed mock database. Seeds itself on first read. Every access
// is wrapped in try/catch so private windows or blocked storage fall back to
// an in-memory copy instead of breaking the page.

import { MOCK_FAILURE_RATE } from "@/lib/config";
import { ApiError } from "@/lib/api/client";
import type { AdminUser, ScanResult, SuspiciousKeyword, User } from "@/lib/types";
import { SELF, seedKeywords, seedScans, seedUsers } from "./seed";

const PREFIX = "phishlens.v1.";
const memory = new Map<string, unknown>();

function read<T>(key: string, seed: () => T): T {
  if (memory.has(key)) return memory.get(key) as T;
  let value: T | undefined;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREFIX + key) : null;
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    /* storage unavailable or corrupt — reseed */
  }
  value ??= seed();
  memory.set(key, value);
  return value;
}

function write<T>(key: string, value: T): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* keep the in-memory copy */
  }
}

function remove(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Simulated network latency (and optional failures) for mock requests. */
export async function latency(min = 350, max = 900): Promise<void> {
  await new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
  if (MOCK_FAILURE_RATE > 0 && Math.random() < MOCK_FAILURE_RATE) {
    throw new ApiError("The server didn't respond. Please try again.", 503, "MOCK_FAILURE");
  }
}

export const db = {
  scans: {
    all: () => read<ScanResult[]>("scans", () => seedScans()),
    /** Scans owned by whoever is signed in (seeded "self" scans included). */
    mine() {
      const me = db.session.get();
      return db.scans.all().filter((s) => s.userId === SELF || (me !== null && s.userId === me.id));
    },
    add(scan: ScanResult) {
      write("scans", [scan, ...db.scans.all()]);
    },
  },
  users: {
    all: () => read<AdminUser[]>("users", () => seedUsers()),
    update(id: string, patch: Partial<AdminUser>) {
      const users = db.users.all().map((u) => (u.id === id ? { ...u, ...patch } : u));
      write("users", users);
      return users.find((u) => u.id === id);
    },
  },
  keywords: {
    all: () => read<SuspiciousKeyword[]>("keywords", () => seedKeywords()),
    set(list: SuspiciousKeyword[]) {
      write("keywords", list);
    },
  },
  session: {
    get: () => read<User | null>("session", () => null),
    set: (user: User) => write("session", user),
    clear: () => remove("session"),
  },
  reset() {
    ["scans", "users", "keywords"].forEach(remove);
  },
};
