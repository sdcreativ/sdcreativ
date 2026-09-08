"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  FileWarning,
  Loader2,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { fetchKodivaModule } from "@/lib/kodiva-api";
import type { KodivaModuleClientResponse, KodivaModuleSnapshot } from "@/lib/kodiva-module-types";

function euros(micros: number) {
  return `${(micros / 1_000_000).toFixed(2)} €`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

export function CrmKodivaView() {
  const [data, setData] = useState<KodivaModuleClientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [embed, setEmbed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchKodivaModule();
      setData(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const module = data?.module ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-text">
            Exploitation de la plateforme IA. Les leads, contacts et RDV restent dans ce CRM. Les
            écritures (suspension, flags, support) se font dans la console KODIVA.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray/50 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray/20"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Actualiser
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement du snapshot KODIVA…
        </div>
      ) : null}

      {data && !data.configured ? (
        <div className="rounded-2xl border border-dashed border-gray/50 bg-white px-6 py-12 text-center">
          <Bot className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
          <p className="font-semibold text-foreground">KODIVA n’est pas encore branché</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-text">{data.hint}</p>
        </div>
      ) : null}

      {data?.configured && data.error && !module ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.error}
        </p>
      ) : null}

      {module ? <KodivaSnapshot module={module} embed={embed} onEmbed={setEmbed} /> : null}
    </div>
  );
}

function KodivaSnapshot({
  module,
  embed,
  onEmbed,
}: {
  module: KodivaModuleSnapshot;
  embed: boolean;
  onEmbed: (value: boolean) => void;
}) {
  const { kpis, incidents, links } = module;
  const cards = [
    { label: "Organisations", value: String(kpis.tenants) },
    { label: "Suspendues", value: String(kpis.suspended) },
    { label: "Coût mois", value: euros(kpis.monthCostMicros) },
    { label: "Tokens mois", value: kpis.monthTokens.toLocaleString("fr-FR") },
    { label: "Webhooks KO", value: String(kpis.webhookFailures) },
    {
      label: "Docs / syncs / quotas",
      value: `${kpis.failedDocuments} · ${kpis.failedSyncs} · ${kpis.quotaAlerts}`,
    },
  ];

  return (
    <>
      <p className="text-xs text-gray-text">Snapshot {formatWhen(module.generatedAt)}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm hover:shadow-md"
          >
            <h2 className="text-sm font-medium text-gray-text">{card.label}</h2>
            <p className="mt-1 text-2xl font-semibold text-foreground">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={links.home}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Ouvrir KODIVA
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={links.ops}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-gray/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-gray/20"
        >
          Incidents
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={links.tenants}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-gray/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-gray/20"
        >
          Organisations
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <button
          type="button"
          onClick={() => onEmbed(!embed)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray/50 bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-gray/20"
        >
          {embed ? "Masquer la console" : "Console embarquée"}
        </button>
      </div>

      <IncidentTable
        title="Webhooks en échec"
        icon={<Webhook className="h-4 w-4" aria-hidden />}
        empty="Aucun webhook en échec."
        rows={incidents.webhooks.map((row) => [shortId(row.id), shortId(row.tenantId), row.status, row.eventType])}
        headers={["Id", "Tenant", "Statut", "Événement"]}
      />
      <IncidentTable
        title="Documents en échec"
        icon={<FileWarning className="h-4 w-4" aria-hidden />}
        empty="Aucun document en échec."
        rows={incidents.documents.map((row) => [shortId(row.id), shortId(row.tenantId), row.title])}
        headers={["Id", "Tenant", "Titre"]}
      />
      <IncidentTable
        title="Syncs connecteur"
        icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
        empty="Aucune sync en échec."
        rows={incidents.syncs.map((row) => [shortId(row.id), shortId(row.tenantId), row.status, row.operation])}
        headers={["Id", "Tenant", "Statut", "Opération"]}
      />
      <IncidentTable
        title="Alertes quota"
        icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
        empty="Aucune alerte quota."
        rows={incidents.alerts.map((row) => [shortId(row.id), shortId(row.tenantId), String(row.threshold)])}
        headers={["Id", "Tenant", "Seuil"]}
      />

      {embed ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-text">
            L’iframe fonctionne si le CRM et KODIVA sont sur le même site (ex. *.sdcreativ.com). En
            local, préférez « Ouvrir KODIVA ».
          </p>
          <iframe
            title="Console KODIVA"
            src={links.embed}
            className="h-[720px] w-full rounded-2xl border border-gray/40 bg-white"
          />
        </div>
      ) : null}
    </>
  );
}

function IncidentTable({
  title,
  icon,
  headers,
  rows,
  empty,
}: {
  title: string;
  icon: ReactNode;
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-text">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray/40 text-gray-text">
                {headers.map((header) => (
                  <th key={header} className="pb-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-gray/20 last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-2 text-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
