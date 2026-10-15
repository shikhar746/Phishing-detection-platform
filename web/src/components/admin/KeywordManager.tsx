"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, Tags, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncBoundary } from "@/components/ui/AsyncBoundary";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { KEYWORD_CATEGORY_LABEL } from "@/lib/format";
import type { UseAsyncResult } from "@/lib/hooks/useAsync";
import { adminService } from "@/lib/services/admin";
import { KEYWORD_CATEGORIES, type KeywordCategory, type SuspiciousKeyword } from "@/lib/types";
import { validateKeyword } from "@/lib/validation";

const WEIGHTS = [5, 8, 10, 15, 20, 25, 30];

export function KeywordManager({ state }: { state: UseAsyncResult<SuspiciousKeyword[]> }) {
  const [filter, setFilter] = useState<KeywordCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const { setData } = state;
  const keywords = useMemo(() => state.data ?? [], [state.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return keywords.filter((k) => (filter === "all" || k.category === filter) && (!q || k.term.includes(q)));
  }, [keywords, filter, query]);

  // optimistic: drop the chip at once, put it back if the server refuses
  async function remove(kw: SuspiciousKeyword) {
    setRemoveError(null);
    setData((list) => list.filter((k) => k.id !== kw.id));
    try {
      await adminService.removeKeyword(kw.id);
    } catch (err) {
      setData((list) => [kw, ...list]);
      setRemoveError(`Couldn't remove “${kw.term}”: ${errorMessage(err)}`);
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loadingLabel="Loading keywords"
      loading={
        <div className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      }
      errorTitle="Couldn't load keywords"
    >
      {() => (
        <div className="px-5 pb-6 sm:px-6">
          <AddKeywordForm existing={keywords} onAdded={(kw) => setData((list) => [kw, ...list])} />

          {removeError && (
            <p role="alert" className="mt-3 text-sm text-risk-high-ink">
              {removeError}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
              {(["all", ...KEYWORD_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filter === c}
                  onClick={() => setFilter(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors",
                    filter === c ? "bg-ink text-surface ring-ink" : "bg-surface-raised text-ink-soft ring-line hover:bg-surface",
                  )}
                >
                  {c === "all" ? "All" : KEYWORD_CATEGORY_LABEL[c]}{" "}
                  <span className="opacity-70">{c === "all" ? keywords.length : keywords.filter((k) => k.category === c).length}</span>
                </button>
              ))}
            </div>
            <SearchInput label="Search keywords" value={query} onChange={setQuery} className="sm:w-56" />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Tags}
              title={keywords.length ? "No keywords match" : "No keywords yet"}
              description={keywords.length ? "Try another filter." : "Add the first keyword above."}
            />
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suspicious keywords">
              <AnimatePresence initial={false}>
                {visible.map((k) => (
                  <motion.li
                    key={k.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group inline-flex items-center gap-2 rounded-xl bg-surface-raised py-1.5 pl-3 pr-1.5 text-sm ring-1 ring-line"
                  >
                    <span className="font-medium text-ink">{k.term}</span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
                      {KEYWORD_CATEGORY_LABEL[k.category]}
                    </span>
                    <span className="font-mono text-xs text-highlight-ink">+{k.weight}</span>
                    <button
                      type="button"
                      onClick={() => remove(k)}
                      className="grid size-6 place-items-center rounded-md text-ink-faint hover:bg-risk-high-soft hover:text-risk-high-ink"
                      aria-label={`Remove keyword ${k.term}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </AsyncBoundary>
  );
}

function AddKeywordForm({ existing, onAdded }: { existing: SuspiciousKeyword[]; onAdded: (kw: SuspiciousKeyword) => void }) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<KeywordCategory>("urgency");
  const [weight, setWeight] = useState(15);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const problem = validateKeyword(term, existing.filter((k) => k.category === category).map((k) => k.term));
    setFieldError(problem);
    if (problem) return;
    setAdding(true);
    try {
      onAdded(await adminService.addKeyword({ term, category, weight }));
      setTerm("");
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={add} noValidate className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5" aria-label="Add a suspicious keyword">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-start">
        <Field label="Keyword or phrase" error={fieldError}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={term}
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder="e.g. account verification"
              onChange={(e) => {
                setTerm(e.target.value);
                setFieldError(null);
              }}
              className="h-10 rounded-lg text-sm"
            />
          )}
        </Field>
        <Field label="Category">
          {({ id }) => (
            <Select id={id} value={category} onChange={(e) => setCategory(e.target.value as KeywordCategory)} className="w-full sm:w-36">
              {KEYWORD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {KEYWORD_CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Weight">
          {({ id }) => (
            <Select id={id} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-full sm:w-24">
              {WEIGHTS.map((w) => (
                <option key={w} value={w}>
                  +{w}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" loading={adding} className="h-10 sm:mt-[1.625rem]" size="sm">
          {!adding && <Plus className="size-4" aria-hidden />}
          Add
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">Weight is the number of points added to a scan&apos;s risk score when the keyword matches.</p>
      {submitError && (
        <p role="alert" className="mt-3 text-sm text-risk-high-ink">
          {submitError}
        </p>
      )}
    </form>
  );
}
