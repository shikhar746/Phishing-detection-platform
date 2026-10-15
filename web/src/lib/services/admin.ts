// Admin endpoints. Planned API contract (all require role = admin):
//   GET    /api/admin/analytics          -> { analytics: AdminAnalytics, daily: DailyDetections[] }
//   GET    /api/admin/users              -> { users: AdminUser[] }
//   PATCH  /api/admin/users/:id          { role?, status? } -> { user: AdminUser }
//   GET    /api/admin/logs               -> { scans: ScanResult[] }   (all users)
//   GET    /api/admin/keywords           -> { keywords: SuspiciousKeyword[] }
//   POST   /api/admin/keywords           { term, category, weight } -> { keyword }
//   DELETE /api/admin/keywords/:id

import { USE_MOCKS } from "@/lib/config";
import { api } from "@/lib/api/client";
import { mockAdminService } from "@/lib/mock/services/admin";
import type {
  AdminAnalytics,
  AdminUser,
  DailyDetections,
  KeywordCategory,
  ScanResult,
  SuspiciousKeyword,
} from "@/lib/types";
import { normalizeKeywordTerm } from "@/lib/validation";

export type UserPatch = Partial<Pick<AdminUser, "role" | "status">>;
export interface NewKeyword {
  term: string;
  category: KeywordCategory;
  weight: number;
}

export interface AdminService {
  analytics(): Promise<{ analytics: AdminAnalytics; daily: DailyDetections[] }>;
  users(): Promise<AdminUser[]>;
  updateUser(id: string, patch: UserPatch): Promise<AdminUser>;
  logs(): Promise<ScanResult[]>;
  keywords(): Promise<SuspiciousKeyword[]>;
  addKeyword(input: NewKeyword): Promise<SuspiciousKeyword>;
  removeKeyword(id: string): Promise<void>;
}

const httpAdminService: AdminService = {
  analytics: () => api.get("/api/admin/analytics"),
  users: async () => (await api.get<{ users: AdminUser[] }>("/api/admin/users")).users,
  updateUser: async (id, patch) => (await api.patch<{ user: AdminUser }>(`/api/admin/users/${id}`, patch)).user,
  logs: async () => (await api.get<{ scans: ScanResult[] }>("/api/admin/logs")).scans,
  keywords: async () => (await api.get<{ keywords: SuspiciousKeyword[] }>("/api/admin/keywords")).keywords,
  addKeyword: async (input) =>
    (await api.post<{ keyword: SuspiciousKeyword }>("/api/admin/keywords", { ...input, term: normalizeKeywordTerm(input.term) }))
      .keyword,
  removeKeyword: (id) => api.delete(`/api/admin/keywords/${id}`),
};

export const adminService: AdminService = USE_MOCKS ? mockAdminService : httpAdminService;
