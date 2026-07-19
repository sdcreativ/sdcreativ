"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import {
  fetchCommunicationsStats,
  getCommunicationsStatsExportUrl,
  type CommunicationsStats,
} from "@/lib/reports-api";
import { REPORT_PERIODS, type ReportPeriod } from "@/content/reports-labels";
import type { CommunicationChannel } from "@/lib/threecx/journal";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Semaine",
  month: "Mois",
  quarter: "Trimestre",
  year: "Année",
  all: "Tout",
};

const CHANNELS: Array<{ id: CommunicationChannel | "all"; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "call", label: "Appels" },
  { id: "chat", label: "Chats" },
  { id: "meeting", label: "Réunions" },
];

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray/40 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-text">{hint}</p> : null}
    </div>
  );
}

type Props = {
  /** Mode compact pour le widget dashboard */
  compact?: boolean;
  defaultPeriod?: ReportPeriod;
  showExport?: boolean;
  showListLink?: boolean;
};

export function CrmCommunicationsStatsPanel({
  compact = false,
  defaultPeriod = "month",
  showExport = true,
  showListLink = false,
}: Props) {
  const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod);
  const [channel, setChannel] = useState<CommunicationChannel | "all">("all");
  const [stats, setStats] = useState<CommunicationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchCommunicationsStats(period, channel)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null);
          setError(err instanceof Error ? err.message : "Impossible de charger les stats.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, channel]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-gray/40 bg-gray-light/40 p-5 shadow-sm",
        compact && "bg-white",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-foreground">
            {compact ? "Communications 3CX" : "Statistiques 3CX"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-text">
            {stats ? stats.period.label : "…"}
            {channel !== "all" ? ` · ${channel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showListLink ? (
            <Link
              href="/admin/crm/communications"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir l’historique
            </Link>
          ) : null}
          {showExport ? (
            <a
              href={getCommunicationsStatsExportUrl(period, channel)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray/50 bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              period === p
                ? "bg-primary text-white"
                : "border border-gray/50 bg-white text-gray-text hover:border-primary/40",
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {!compact ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannel(c.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                channel === c.id
                  ? "bg-foreground text-white"
                  : "border border-gray/50 bg-white text-gray-text hover:border-foreground/30",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : stats ? (
        <div
          className={cn(
            "mt-4 grid gap-3",
            compact ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          <StatCard
            label="Chats aujourd’hui"
            value={String(stats.chats.today)}
            hint={`${stats.chats.thisWeek} cette semaine · ${stats.chats.total} sur la période`}
          />
          <StatCard
            label="Appels entrants / sortants"
            value={`${stats.calls.inbound} / ${stats.calls.outbound}`}
            hint={`${stats.calls.total} appels · ${stats.meetings.total} réunions`}
          />
          <StatCard
            label="Taux de réponse"
            value={`${stats.calls.answerRate} %`}
            hint={`${stats.calls.answered} répondus · ${stats.calls.missed} manqués`}
          />
          <StatCard
            label="Durée moyenne"
            value={formatDuration(stats.avgDurationSec)}
            hint="Chats, appels et réunions avec durée"
          />
          {!compact ? (
            <>
              <StatCard
                label="Leads 3CX vs autres"
                value={`${stats.leads.from3cx} / ${stats.leads.fromOther}`}
                hint={`Chat ${stats.leads.liveChat3cx} · Appel ${stats.leads.call3cx}`}
              />
              <StatCard
                label="Conversion cohorte 3CX"
                value={`${stats.conversion3cx.clientRate} %`}
                hint={`${stats.conversion3cx.becameClient}/${stats.conversion3cx.leads} clients · ${stats.conversion3cx.quoteRate} % devis`}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
