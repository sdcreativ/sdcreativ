"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare, Square, ListChecks, Loader2 } from "lucide-react";
import {
  fetchCrmDocOnboardingApi,
  setCrmDocOnboardingStepApi,
} from "@/lib/crm-docs-api";
import { buildDocShareHref } from "@/content/crm-docs/context-map";
import type { CrmDocOnboardingStep } from "@/content/crm-docs/onboarding-week";
import type { CrmDocLocale } from "@/lib/crm-docs-types";
import { cn } from "@/lib/utils";

type Props = {
  locale: CrmDocLocale;
};

export function CrmDocOnboardingChecklist({ locale }: Props) {
  const [steps, setSteps] = useState<CrmDocOnboardingStep[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCrmDocOnboardingApi();
      setSteps(data.steps);
      setCompleted(data.completed);
    } catch {
      setSteps([]);
      setCompleted([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const doneCount = completed.length;
  const total = steps.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const byDay = useMemo(() => {
    const map = new Map<number, CrmDocOnboardingStep[]>();
    for (const step of steps) {
      const list = map.get(step.day) ?? [];
      list.push(step);
      map.set(step.day, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [steps]);

  async function toggle(step: CrmDocOnboardingStep) {
    const next = !completed.includes(step.id);
    setBusyId(step.id);
    try {
      const ids = await setCrmDocOnboardingStepApi(step.id, next);
      setCompleted(ids);
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray/25 bg-white p-4 shadow-sm">
      <header className="flex items-start gap-2">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">
            {locale === "en" ? "First week checklist" : "Checklist Première semaine"}
          </h2>
          <p className="mt-0.5 text-xs text-gray-text">
            {locale === "en"
              ? "Guided path for new team members."
              : "Parcours guidé pour les nouveaux arrivants."}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {doneCount}/{total}
        </span>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray/25">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {byDay.map(([day, daySteps]) => (
            <div key={day}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-text">
                {locale === "en" ? `Day ${day}` : `Jour ${day}`}
              </p>
              <ul className="space-y-1">
                {daySteps.map((step) => {
                  const done = completed.includes(step.id);
                  return (
                    <li key={step.id} className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-gray-light/50">
                      <button
                        type="button"
                        disabled={busyId === step.id}
                        onClick={() => void toggle(step)}
                        className="mt-0.5 shrink-0 text-primary disabled:opacity-50"
                        aria-label={done ? "Marquer non fait" : "Marquer fait"}
                      >
                        {busyId === step.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : done ? (
                          <CheckSquare className="h-4 w-4" aria-hidden />
                        ) : (
                          <Square className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={buildDocShareHref(step.docSlug)}
                          className={cn(
                            "block text-sm font-medium hover:text-primary",
                            done ? "text-gray-text line-through" : "text-foreground",
                          )}
                        >
                          {locale === "en" ? step.titleEn : step.titleFr}
                        </Link>
                        <p className="text-[11px] text-gray-text">
                          {locale === "en" ? step.hintEn : step.hintFr}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
