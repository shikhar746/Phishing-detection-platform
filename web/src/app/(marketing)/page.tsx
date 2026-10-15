import { CtaBand } from "@/components/marketing/CtaBand";
import { Features } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { StatsStrip } from "@/components/marketing/StatsStrip";
import { UseCases } from "@/components/marketing/UseCases";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <StatsStrip />
      <UseCases />
      <CtaBand />
    </>
  );
}
