import type { ScanService } from "@/lib/services/scans";
import { computeDaily, computeStats } from "@/lib/stats";
import type { ScanType } from "@/lib/types";
import { normalizeUrl } from "@/lib/validation";
import { buildScan, SELF } from "../seed";
import { db, latency } from "../store";

async function scan(type: ScanType, content: string) {
  // Real scans call two external APIs, so keep the mock's wait believable.
  await latency(1400, 2200);
  const created = buildScan(type, content, new Date(), db.session.get()?.id ?? SELF, db.keywords.all());
  const result = { ...created, id: `scn_${Date.now().toString(36)}` };
  db.scans.add(result);
  return result;
}

export const mockScanService: ScanService = {
  scanUrl: (url) => scan("url", normalizeUrl(url)),
  scanEmail: (content) => scan("email", content.trim()),

  async history() {
    await latency();
    return db.scans.mine();
  },

  async stats() {
    await latency();
    const scans = db.scans.mine();
    return { stats: computeStats(scans), daily: computeDaily(scans) };
  },
};
