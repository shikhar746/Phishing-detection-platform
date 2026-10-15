// Threat reports. Planned API contract:
//   GET /api/reports -> { reports: ThreatReport[] }
// The API would write a row to the `reports` table whenever a scan comes back
// medium/high, plus a weekly summary row from a scheduled job.

import { USE_MOCKS } from "@/lib/config";
import { api } from "@/lib/api/client";
import { mockReportService } from "@/lib/mock/services/reports";
import type { ThreatReport } from "@/lib/types";

export interface ReportService {
  list(): Promise<ThreatReport[]>;
}

const httpReportService: ReportService = {
  list: async () => (await api.get<{ reports: ThreatReport[] }>("/api/reports")).reports,
};

export const reportService: ReportService = USE_MOCKS ? mockReportService : httpReportService;
