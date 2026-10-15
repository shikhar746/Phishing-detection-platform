"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Link2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/context/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { scanService } from "@/lib/services/scans";
import { validateUrl, type ScanResult, type ScanType } from "@phishlens/core";
import { EmailScanForm } from "./EmailScanForm";
import { ScanProgress } from "./ScanProgress";
import { ScanResultCard } from "./ScanResultCard";
import { UrlScanForm } from "./UrlScanForm";

type State =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "done"; scan: ScanResult }
  | { phase: "error"; message: string; type: ScanType; input: string };

const TABS = [
  { key: "url" as const, label: "URL Scanner", icon: Link2 },
  { key: "email" as const, label: "Email Analyzer", icon: Mail },
];

export function Scanner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const initialUrl = params.get("url") ?? "";
  const [tab, setTab] = useState<ScanType>(params.get("tab") === "email" ? "email" : "url");
  const [state, setState] = useState<State>({ phase: "idle" });
  const autoRan = useRef(false);

  const run = useCallback(async (type: ScanType, input: string) => {
    setState({ phase: "scanning" });
    try {
      const scan = type === "url" ? await scanService.scanUrl(input) : await scanService.scanEmail(input);
      setState({ phase: "done", scan });
    } catch (err) {
      setState({ phase: "error", message: errorMessage(err), type, input });
    }
  }, []);

  // A URL handed over from the landing-page hero scans straight away.
  useEffect(() => {
    if (autoRan.current || !initialUrl || validateUrl(initialUrl)) return;
    autoRan.current = true;
    void run("url", initialUrl);
  }, [initialUrl, run]);

  function changeTab(next: ScanType) {
    setTab(next);
    setState({ phase: "idle" });
    router.replace(next === "email" ? "/scanner?tab=email" : "/scanner", { scroll: false });
  }

  const scanning = state.phase === "scanning";

  return (
    <div className="space-y-6">
      <Tabs idBase="scanner" label="Scanner type" items={TABS} value={tab} onChange={changeTab} />

      <TabPanel idBase="scanner" tabKey={tab}>
        <Card className="p-5 sm:p-7">
          {tab === "url" ? (
            <UrlScanForm key="url" onSubmit={(u) => run("url", u)} disabled={scanning} defaultValue={initialUrl} autoFocus={!initialUrl} />
          ) : (
            <EmailScanForm key="email" onSubmit={(c) => run("email", c)} disabled={scanning} />
          )}
        </Card>
      </TabPanel>

      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {state.phase === "scanning" && (
            <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScanProgress type={tab} />
            </motion.div>
          )}
          {state.phase === "done" && (
            <motion.div key={state.scan.id} exit={{ opacity: 0 }}>
              <ScanResultCard scan={state.scan} onReset={() => setState({ phase: "idle" })} />
              {!user && (
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
                  <ShieldCheck className="size-4 text-accent-ink" aria-hidden />
                  <span>
                    <Link href="/register?next=/dashboard" className="font-semibold text-accent-ink underline-offset-4 hover:underline">
                      Create a free account
                    </Link>{" "}
                    to keep a history of your scans.
                  </span>
                </p>
              )}
            </motion.div>
          )}
          {state.phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <ErrorState title="The scan didn't finish" message={state.message} onRetry={() => run(state.type, state.input)} />
              </Card>
            </motion.div>
          )}
          {state.phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IdleHint type={tab} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function IdleHint({ type }: { type: ScanType }) {
  const points =
    type === "url"
      ? ["HTTPS and encryption", "Brand look-alikes and bait keywords", "Domain structure", "VirusTotal & Google Safe Browsing"]
      : ["Urgent or threatening language", "Requests for passwords, OTPs or card details", "Scam phrases and fake alerts", "Every link inside the message"];
  return (
    <div className="bg-grid-dots-light rounded-card border border-dashed border-line-strong p-6 sm:p-8">
      <p className="font-display text-xl font-semibold text-ink">
        {type === "url" ? "What a URL scan looks at" : "What the email analyzer looks for"}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
