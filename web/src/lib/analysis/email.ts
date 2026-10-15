// Email / message rules. Links found in the text are scored with the URL rules.

import type { CheckResult, KeywordCategory } from "@/lib/types";
import type { KeywordRule } from "./keywords";
import { passed, runRules, score, type Analysis, type Rule } from "./score";
import { analyzeUrl } from "./url";

interface EmailContext {
  text: string;
  lower: string;
  keywords: KeywordRule[];
}

function matchesPhrase(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

/** One rule per keyword category: strongest match, plus 5 per extra match, capped at 30. */
function keywordRule(category: KeywordCategory, label: string, detail: string): Rule<EmailContext> {
  return ({ lower, keywords }) => {
    const hits = keywords.filter((k) => k.category === category && matchesPhrase(lower, k.term));
    if (!hits.length) return passed(category, label, "None found.");
    return {
      id: category,
      label,
      detail: `${detail}: ${hits.slice(0, 4).map((h) => `“${h.term}”`).join(", ")}.`,
      severity: "fail",
      weight: Math.min(30, Math.max(...hits.map((h) => h.weight)) + (hits.length - 1) * 5),
    };
  };
}

const genericGreeting: Rule<EmailContext> = ({ text }) =>
  /\bdear (customer|user|client|member|valued|account holder|sir\/madam)/i.test(text)
    ? { id: "greeting", label: "Generic greeting", detail: "Real senders usually address you by name.", severity: "warn", weight: 8 }
    : null;

const alarmistTone: Rule<EmailContext> = ({ text }) => {
  const exclamations = (text.match(/!/g) ?? []).length;
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  return exclamations >= 3 || capsWords >= 3
    ? { id: "tone", label: "Alarmist formatting", detail: "Heavy use of capitals or exclamation marks.", severity: "info", weight: 5 }
    : null;
};

const URL_IN_TEXT = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;

const embeddedLinks: Rule<EmailContext> = ({ text, keywords }) => {
  const links = Array.from(new Set(text.match(URL_IN_TEXT) ?? [])).slice(0, 5);
  if (!links.length) return passed("links", "Links", "No links in the message.");

  const scored = links.flatMap((link) => {
    try {
      return [{ link, analysis: analyzeUrl(link.replace(/[.,;]+$/, ""), keywords) }];
    } catch {
      return []; // not a parseable URL after all
    }
  });
  const worst = scored.sort((a, b) => b.analysis.riskScore - a.analysis.riskScore)[0];
  if (!worst || worst.analysis.riskLevel === "low") {
    return passed("links", "Links", `${links.length} link${links.length > 1 ? "s" : ""} checked, none look risky.`);
  }
  const high = worst.analysis.riskLevel === "high";
  return {
    id: "links",
    label: "Suspicious link",
    detail: `Links to ${worst.link} (${worst.analysis.riskScore}% risk on its own).`,
    severity: high ? "fail" : "warn",
    weight: high ? 25 : 12,
  } satisfies CheckResult;
};

const EMAIL_RULES: Rule<EmailContext>[] = [
  keywordRule("threat", "Threatening language", "Threatens consequences"),
  keywordRule("urgency", "Urgency pressure", "Pushes you to act fast"),
  keywordRule("credential", "Credential request", "Asks for sign-in or financial details"),
  keywordRule("scam", "Scam wording", "Uses common scam phrases"),
  genericGreeting,
  alarmistTone,
  embeddedLinks,
];

export function analyzeEmail(text: string, keywords: KeywordRule[]): Analysis {
  return score("email", runRules(EMAIL_RULES, { text, lower: text.toLowerCase(), keywords }));
}
