"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatReportAmount } from "@/content/reports-labels";
import type { ReportPeriod } from "@/content/reports-labels";
import { fetchReportDrilldown } from "@/lib/reports-api";
import type { DrilldownEntity, DrilldownItem } from "@/lib/reports-drilldown";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, X } from "lucide-react";

export type DrilldownTarget =
  | { entity: DrilldownEntity; key: string; label: string }
  | { source: string; label: string };

type Props = {
  target: DrilldownTarget | null;
  period: ReportPeriod;
  onClose: () => void;
};

export function ReportsDrilldownPanel({ target, period, onClose }: Props) {
  const [items, setItems] = useState<DrilldownItem[]>([]);
  const [listHref, setListHref] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    setError("");
    const promise =
      "source" in target
        ? fetchReportDrilldown({ entity: "leads", key: "", period, source: target.source })
        : fetchReportDrilldown({ entity: target.entity, key: target.key, period });

    void promise
      .then((data) => {
        setItems(data.items);
        setListHref(data.listHref);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Chargement impossible.");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [target, period]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/20 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Drill-down</p>
            <h3 className="text-lg font-bold text-foreground">{target.label}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </div>
          ) : error ? (
            <p className="text-sm text-accent">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-text">Aucun élément sur cette période.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-gray/30 px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary-light/20"
                    onClick={onClose}
                  >
                    <p className="font-semibold text-foreground">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-gray-text">{item.subtitle}</p>}
                    {item.amount !== null && (
                      <p className="mt-1 text-xs font-medium text-primary">{formatReportAmount(item.amount)}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {listHref && (
          <div className="border-t border-gray/20 p-4">
            <Link
              href={listHref}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark",
              )}
              onClick={onClose}
            >
              Voir tout dans le CRM
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
