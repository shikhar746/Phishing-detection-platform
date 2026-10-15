import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Scanner } from "@/components/scanner/Scanner";

export const metadata: Metadata = { title: "Scanner" };

// The scanner reads ?url= / ?tab= on the client, so it renders after hydration.
export const instant = false;

export default function ScannerPage() {
  return (
    <>
      <PageHeader
        title="Scanner"
        description="Check a link before you open it, or paste an email to see whether it's a phishing attempt."
      />
      <Suspense>
        <Scanner />
      </Suspense>
    </>
  );
}
