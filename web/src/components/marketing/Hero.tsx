"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { UrlScanForm } from "@/components/scanner/UrlScanForm";
import { LinkAnatomy } from "./LinkAnatomy";

export function Hero() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-ink text-surface">
      <div className="bg-grid-dots absolute inset-0" aria-hidden />
      <div
        className="absolute -right-40 -top-40 size-[520px] rounded-full bg-accent/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-8 lg:pb-28">
        <div>
          <motion.p {...fade(0)} className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-on-dark-muted ring-1 ring-white/12">
            <ShieldCheck className="size-3.5 text-highlight" aria-hidden />
            Phishing checks, explained in plain language
          </motion.p>
          <motion.h1
            {...fade(0.08)}
            id="hero-heading"
            className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Know it&apos;s safe <span className="relative whitespace-nowrap italic text-highlight">before you click.</span>
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-6 max-w-xl text-lg leading-relaxed text-on-dark-muted">
            Paste a link, email or message. We check it against HTTPS, keyword and domain-structure rules, then ask VirusTotal
            and Google Safe Browsing — and tell you the risk in seconds.
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-9 max-w-xl">
            <UrlScanForm tone="dark" onSubmit={(url) => router.push(`/scanner?url=${encodeURIComponent(url)}`)} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24, rotate: reduce ? 0 : 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <LinkAnatomy />
        </motion.div>
      </div>
    </section>
  );
}
