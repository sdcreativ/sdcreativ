"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { formatMoney, normalizeCurrency } from "@/lib/currencies";
import type { ProjectProfitability } from "@/lib/projects/profitability";

export function ProjectProfitabilityPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectProfitability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/admin/projects/${projectId}/profitability`, { credentials: "include" })
      .then((r) => r.json())
      .then((json: { profitability?: ProjectProfitability }) => {
        if (!cancelled) setData(json.profitability ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-gray-text">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Rentabilité…
      </p>
    );
  }

  if (!data) return null;

  const currency = normalizeCurrency(data.currency);

  return (
    <section className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
        <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden />
        Rentabilité projet
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-gray-text">CA devis</dt>
          <dd className="font-semibold">{formatMoney(data.quoteRevenue, currency)}</dd>
        </div>
        <div>
          <dt className="text-gray-text">Facturé / encaissé</dt>
          <dd className="font-semibold">
            {formatMoney(data.invoicedTotal, currency)} / {formatMoney(data.invoicedPaid, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-text">Temps (saisi / vendu)</dt>
          <dd className="font-semibold">
            {data.loggedHours.toFixed(1)} h / {data.soldHours.toFixed(1)} h
            {data.timeUtilizationPercent != null ? ` · ${data.timeUtilizationPercent}%` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-gray-text">Coûts prestataires</dt>
          <dd className="font-semibold">{formatMoney(data.vendorCosts, "XOF")}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-text">Marge contribution</dt>
          <dd className="text-base font-bold text-emerald-800">
            {data.contributionMargin != null
              ? `${formatMoney(data.contributionMargin, "XOF")}${
                  data.contributionMarginPercent != null
                    ? ` (${data.contributionMarginPercent}%)`
                    : ""
                }`
              : "—"}
          </dd>
        </div>
      </dl>
      {data.quoteLines.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-emerald-200/60 pt-3 text-xs text-gray-text">
          {data.quoteLines.slice(0, 6).map((line, i) => (
            <li key={`${line.label}-${i}`} className="flex justify-between gap-2">
              <span className="truncate">{line.label}</span>
              <span className="shrink-0 font-medium text-foreground">
                {formatMoney(line.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
