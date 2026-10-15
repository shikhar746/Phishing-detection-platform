import { presentReports, scanReport, isFlagged } from "@phishlens/core";
import type { ReportService } from "@/lib/services/reports";
import { db, latency } from "../store";

export const mockReportService: ReportService = {
  async list() {
    await latency();
    return presentReports(db.scans.mine().filter(isFlagged).map(scanReport));
  },
};
