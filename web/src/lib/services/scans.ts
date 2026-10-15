// Scans against the Express API. Planned contract (to add to /api):
//   POST /api/scans/url    { url }      -> { scan: ScanResult }
//   POST /api/scans/email  { content }  -> { scan: ScanResult }
//   GET  /api/scans                     -> { scans: ScanResult[] }   (current user)
//   GET  /api/scans/stats               -> { stats: ScanStats, daily: DailyDetections[] }

import { USE_MOCKS } from "@/lib/config";
import { api } from "@/lib/api/client";
import { mockScanService } from "@/lib/mock/services/scans";
import type { DailyDetections, ScanResult, ScanStats } from "@/lib/types";
import { normalizeUrl } from "@/lib/validation";

export interface ScanService {
  scanUrl(url: string): Promise<ScanResult>;
  scanEmail(content: string): Promise<ScanResult>;
  history(): Promise<ScanResult[]>;
  stats(): Promise<{ stats: ScanStats; daily: DailyDetections[] }>;
}

const httpScanService: ScanService = {
  scanUrl: async (url) => (await api.post<{ scan: ScanResult }>("/api/scans/url", { url: normalizeUrl(url) })).scan,
  scanEmail: async (content) => (await api.post<{ scan: ScanResult }>("/api/scans/email", { content: content.trim() })).scan,
  history: async () => (await api.get<{ scans: ScanResult[] }>("/api/scans")).scans,
  stats: () => api.get("/api/scans/stats"),
};

export const scanService: ScanService = USE_MOCKS ? mockScanService : httpScanService;
