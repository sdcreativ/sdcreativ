"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchCommercialWorkload } from "@/lib/workload-api";
import type { CommercialWorkloadRow, WorkloadSnapshot } from "@/lib/workload";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { BarChart3, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrmWorkloadView() {
  const [data, setData] = useState<WorkloadSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchCommercialWorkload());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la charge.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        Chargement de la charge commerciale…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-primary" aria-hidden />
            Charge commerciale
          </h2>
          <p className="text-sm text-gray-text">
            Dossiers ouverts, relances et CA pipeline par commercial — au-delà de « Mes dossiers ».
          </p>
        </div>
        <Link
          href="/admin/crm/rapports"
          className="inline-flex items-center gap-2 rounded-xl border border-gray/40 px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          Rapports détaillés
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
          <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">
            Réessayer
          </button>
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Leads ouverts" value={String(data.totals.openLeads)} />
            <Stat label="Devis en cours" value={String(data.totals.openQuotes)} />
            <Stat label="CA pipeline" value={formatQuoteAmount(data.totals.pipelineAmount)} />
            <Stat
              label="Relances dues"
              value={String(data.totals.followUpsDue)}
              accent={data.totals.followUpsDue > 0}
            />
          </div>

          {data.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray/40 bg-white px-6 py-14 text-center shadow-sm">
              <Users className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
              <p className="mt-4 font-semibold text-foreground">Aucune charge active</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-text">
                Assignez des leads / tâches à des comptes CRM pour voir la répartition.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray/30 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray/30 text-left text-xs uppercase text-gray-text">
                  <tr>
                    <th className="px-4 py-3">Commercial</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Devis</th>
                    <th className="px-4 py-3">Pipeline</th>
                    <th className="px-4 py-3">Tâches</th>
                    <th className="px-4 py-3">Retards</th>
                    <th className="px-4 py-3">Relances</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <WorkloadRow key={row.userId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray/30 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-accent" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function WorkloadRow({ row }: { row: CommercialWorkloadRow }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">
        <p className="font-semibold text-foreground">{row.name}</p>
        <p className="text-xs text-gray-text">{row.email}</p>
      </td>
      <td className="px-4 py-3">
                    <Link
                      href={`/admin/crm/leads?assignee=${encodeURIComponent(row.name)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.openLeads}
                    </Link>
      </td>
      <td className="px-4 py-3">{row.openQuotes}</td>
      <td className="px-4 py-3 font-medium">{formatQuoteAmount(row.pipelineAmount)}</td>
      <td className="px-4 py-3">
        <Link
          href={`/admin/crm/taches?assignee=${encodeURIComponent(row.name)}`}
          className="text-primary hover:underline"
        >
          {row.openTasks}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className={cn(row.overdueTasks > 0 && "font-semibold text-accent")}>
          {row.overdueTasks}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(row.followUpsDue > 0 && "font-semibold text-amber-700")}>
          {row.followUpsDue}
        </span>
      </td>
    </tr>
  );
}
