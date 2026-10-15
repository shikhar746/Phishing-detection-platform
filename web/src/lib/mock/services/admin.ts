import { ApiError } from "@/lib/api/client";
import type { AdminService } from "@/lib/services/admin";
import { computeDaily } from "@/lib/stats";
import type { SuspiciousKeyword } from "@/lib/types";
import { normalizeKeywordTerm } from "@/lib/validation";
import { SELF } from "../seed";
import { db, latency } from "../store";

export const mockAdminService: AdminService = {
  async analytics() {
    await latency();
    const scans = db.scans.all();
    const users = db.users.all();
    const today = new Date().toDateString();
    const threats = scans.filter((s) => s.riskLevel === "high").length;
    return {
      analytics: {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.status === "active").length,
        scansToday: scans.filter((s) => new Date(s.createdAt).toDateString() === today).length,
        threatsDetected: threats,
        detectionRate: scans.length ? Math.round((threats / scans.length) * 100) : 0,
        activeKeywords: db.keywords.all().length,
      },
      daily: computeDaily(scans),
    };
  },

  async users() {
    await latency();
    return db.users.all();
  },

  async updateUser(id, patch) {
    await latency(250, 500);
    const user = db.users.update(id, patch);
    if (!user) throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    return user;
  },

  async logs() {
    await latency();
    // seeded "self" scans belong to whoever is signed in
    const me = db.session.get();
    return db.scans.all().map((s) => (s.userId === SELF && me ? { ...s, userId: me.id } : s));
  },

  async keywords() {
    await latency();
    return db.keywords.all();
  },

  async addKeyword(input) {
    await latency(250, 500);
    const keyword: SuspiciousKeyword = {
      ...input,
      term: normalizeKeywordTerm(input.term),
      id: `kw_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    db.keywords.set([keyword, ...db.keywords.all()]);
    return keyword;
  },

  async removeKeyword(id) {
    await latency(200, 400);
    db.keywords.set(db.keywords.all().filter((k) => k.id !== id));
  },
};
