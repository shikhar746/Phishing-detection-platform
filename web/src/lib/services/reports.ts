// Threat reports (api/src/routes/reports.routes.ts):
//   GET /api/reports -> { reports: ThreatReport[] }
// The API stores a report row with every medium/high scan; the summary and
// de-duplication come from presentReports in @phishlens/core.

import { USE_MOCKS } from "@/lib/config";
import { api } from "@/lib/api/client";
import { mockReportService } from "@/lib/mock/services/reports";
import type { ThreatReport } from "@phishlens/core";

export interface ReportService {
  list(): Promise<ThreatReport[]>;
}

const httpReportService: ReportService = {
  list: async () => (await api.get<{ reports: ThreatReport[] }>("/api/reports")).reports,
};

export const reportService: ReportService = USE_MOCKS ? mockReportService : httpReportService;
