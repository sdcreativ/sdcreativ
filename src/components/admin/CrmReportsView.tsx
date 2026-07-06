"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LEAD_PIPELINE_COLUMNS,
  LEAD_SOURCE_LABELS,
} from "@/content/leads-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";
import {
  REPORT_PERIOD_LABELS,
  REPORT_PERIODS,
  formatReportAmount,
  formatReportDelta,
  formatReportMonth,
  formatReportPercent,
  type ReportPeriod,
} from "@/content/reports-labels";
import type { ReportsComparison, ReportsSummary } from "@/lib/reports";
import { fetchReportsSummary, getReportsExportUrl, getReportsPdfUrl } from "@/lib/reports-api";
import {
  CrmConversionChart,
  CrmPeriodComparisonChart,
  CrmPipelineChart,
  CrmRevenueChart,
  CrmSourcesChart,
} from "@/components/admin/CrmReportCharts";
import {
  ReportsDrilldownPanel,
  type DrilldownTarget,
} from "@/components/admin/ReportsDrilldownPanel";
import { ReportsSchedulePanel } from "@/components/admin/ReportsSchedulePanel";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/lib/leads";
import type { QuoteStatus } from "@/content/quotes-labels";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  Loader2,
  Minus,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export function CrmReportsView() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [compare, setCompare] = useState(true);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [comparison, setComparison] = useState<ReportsComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drilldown, setDrilldown] = useState<DrilldownTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReportsSummary(period, {}, { compare: compare && period !== "all" });
      setSummary(data.summary);
      setComparison(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les rapports.");
      setSummary(null);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [period, compare]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTrendLeads = Math.max(...(summary?.monthlyTrend.map((r) => r.leads) ?? [1]), 1);
  const maxPipelineCount = Math.max(...(summary?.leadPipeline.map((r) => r.count) ?? [1]), 1);

  function openLeadPipeline(status: LeadStatus, label: string) {
    setDrilldown({ entity: "leads", key: status, label });
  }

  function openQuotePipeline(status: QuoteStatus, label: string) {
    setDrilldown({ entity: "quotes", key: status, label });
  }

  function openSource(source: string, label: string) {
    setDrilldown({ source, label });
  }

  function openTeamAssignee(assignee: string) {
    setDrilldown({ entity: "tasks", key: assignee, label: `Tâches — ${assignee}` });
  }

  function getComparisonMetric(key: keyof ReportsSummary["kpis"]) {
    return comparison?.metrics.find((m) => m.key === key);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          CA, pipeline commercial, conversion et tendances sur{" "}
          <span className="font-semibold text-foreground">{summary?.period.label ?? "…"}</span>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gray/60 bg-white p-1">
            {REPORT_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  period === p ? "bg-primary text-white" : "text-gray-text hover:text-foreground",
                )}
              >
                {REPORT_PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {period !== "all" && (
            <label className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="rounded border-gray/60"
              />
              vs N-1
            </label>
          )}
          <a
            href={getReportsExportUrl()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </a>
          <a
            href={getReportsPdfUrl(period, compare && period !== "all")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-primary-light/30"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export PDF
          </a>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
        </div>
      </div>

      <ReportsSchedulePanel />

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      {loading && !summary ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des rapports…
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Nouveaux leads"
              value={String(summary.kpis.newLeads)}
              comparison={getComparisonMetric("newLeads")}
              icon={<Users className="h-4 w-4 text-primary" aria-hidden />}
            />
            <StatCard
              label="Leads signés"
              value={String(summary.kpis.signedLeads)}
              sub={formatReportPercent(summary.kpis.leadConversionRate) + " conversion"}
              comparison={getComparisonMetric("signedLeads")}
            />
            <StatCard
              label="Devis acceptés"
              value={String(summary.kpis.quotesAccepted)}
              sub={formatReportPercent(summary.kpis.quoteConversionRate) + " conversion"}
              comparison={getComparisonMetric("quotesAccepted")}
            />
            <StatCard
              label="CA devis"
              value={formatReportAmount(summary.kpis.revenueQuotes)}
              comparison={getComparisonMetric("revenueQuotes")}
              icon={<Wallet className="h-4 w-4 text-emerald-600" aria-hidden />}
              compact
            />
            <StatCard
              label="CA projets livrés"
              value={formatReportAmount(summary.kpis.revenueProjects)}
              comparison={getComparisonMetric("revenueProjects")}
              compact
            />
            <StatCard
              label="Pipeline leads"
              value={formatReportAmount(summary.kpis.pipelineValue)}
              comparison={getComparisonMetric("pipelineValue")}
              icon={<TrendingUp className="h-4 w-4 text-violet-600" aria-hidden />}
              compact
            />
          </div>

          {comparison && (
            <SectionCard
              title={`Comparaison vs ${comparison.previousPeriodLabel}`}
              icon={<BarChart3 className="h-5 w-5 text-sky-600" aria-hidden />}
            >
              <CrmPeriodComparisonChart comparison={comparison} />
            </SectionCard>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Courbe CA (12 mois)" icon={<TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />}>
              <CrmRevenueChart summary={summary} />
            </SectionCard>

            <SectionCard title="Conversion" icon={<BarChart3 className="h-5 w-5 text-violet-600" aria-hidden />}>
              <CrmConversionChart summary={summary} />
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Pipeline leads" icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}>
              <CrmPipelineChart summary={summary} onPipelineClick={openLeadPipeline} />
            </SectionCard>

            <SectionCard title="Pipeline leads (détail)" icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}>
              <div className="space-y-3">
                {LEAD_PIPELINE_COLUMNS.map(({ status, title }) => {
                  const row = summary.leadPipeline.find((r) => r.key === status);
                  const count = row?.count ?? 0;
                  const pct = Math.round((count / maxPipelineCount) * 100);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => openLeadPipeline(status, title)}
                      className="block w-full text-left transition-opacity hover:opacity-80"
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{title}</span>
                        <span className="text-gray-text">
                          {count} · {formatReportAmount(row?.amount ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-light">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => openLeadPipeline("lost", "Perdus")}
                  className="text-xs text-gray-text hover:text-primary hover:underline"
                >
                  Perdus : {summary.leadPipeline.find((r) => r.key === "lost")?.count ?? 0} — voir la liste
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Pipeline devis" icon={<BarChart3 className="h-5 w-5 text-sky-600" aria-hidden />}>
              <div className="space-y-2">
                {summary.quotePipeline
                  .filter((r) => r.count > 0)
                  .map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() =>
                        openQuotePipeline(
                          row.key as QuoteStatus,
                          QUOTE_STATUS_LABELS[row.key as QuoteStatus] ?? row.key,
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-gray/30 bg-gray-light/30 px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary-light/20"
                    >
                      <span className="font-medium text-foreground">
                        {QUOTE_STATUS_LABELS[row.key as QuoteStatus] ?? row.key}
                      </span>
                      <span className="text-gray-text">
                        {row.count} · {formatReportAmount(row.amount)}
                      </span>
                    </button>
                  ))}
                {summary.quotePipeline.every((r) => r.count === 0) && (
                  <p className="py-6 text-center text-sm text-gray-text">Aucun devis sur la période.</p>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Tendance sur 12 mois" icon={<TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden />}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray/30 text-left text-xs font-bold uppercase tracking-wide text-gray-text">
                    <th className="pb-3 pr-4">Mois</th>
                    <th className="pb-3 pr-4">Leads</th>
                    <th className="pb-3 pr-4">Signés</th>
                    <th className="pb-3 pr-4">Devis env.</th>
                    <th className="pb-3 pr-4">Acceptés</th>
                    <th className="pb-3">CA devis</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.monthlyTrend.map((row) => (
                    <tr key={row.month} className="border-b border-gray/20 last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{formatReportMonth(row.month)}</td>
                      <td className="py-3 pr-4">
                        <TrendBar value={row.leads} max={maxTrendLeads} />
                      </td>
                      <td className="py-3 pr-4 text-gray-text">{row.signedLeads}</td>
                      <td className="py-3 pr-4 text-gray-text">{row.quotesSent}</td>
                      <td className="py-3 pr-4 text-gray-text">{row.quotesAccepted}</td>
                      <td className="py-3 text-gray-text">{formatReportAmount(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Leads par source">
              <CrmSourcesChart summary={summary} onSourceClick={openSource} />
              {summary.leadsBySource.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-gray/15 pt-4">
                  {summary.leadsBySource.map((row) => (
                    <li key={row.source}>
                      <button
                        type="button"
                        onClick={() => openSource(row.source, LEAD_SOURCE_LABELS[row.source])}
                        className="flex w-full items-center justify-between rounded-xl border border-gray/30 px-3 py-2.5 text-sm hover:border-primary/30 hover:bg-primary-light/20"
                      >
                        <span className="font-medium text-foreground">{LEAD_SOURCE_LABELS[row.source]}</span>
                        <span className="text-gray-text">
                          {row.count} · {formatReportAmount(row.amount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Charge équipe (tâches)">
              {summary.teamWorkload.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-text">Aucune tâche.</p>
              ) : (
                <ul className="space-y-2">
                  {summary.teamWorkload.map((row) => (
                    <li key={row.assignee}>
                      <button
                        type="button"
                        onClick={() => openTeamAssignee(row.assignee)}
                        className="flex w-full items-center justify-between rounded-xl border border-gray/30 px-3 py-2.5 text-sm hover:border-primary/30 hover:bg-primary-light/20"
                      >
                        <span className="font-medium text-foreground">{row.assignee}</span>
                        <span className="text-gray-text">
                          {row.openTasks} ouvertes
                          {row.overdueTasks > 0 && (
                            <span className="ml-2 font-semibold text-accent">· {row.overdueTasks} en retard</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <p className="text-xs text-gray-text">
            CA basé sur les devis acceptés (subtotal HT) et budgets des projets livrés.{" "}
            {summary.kpis.activeProjects} projets actifs · {summary.kpis.activeClients} clients actifs ·{" "}
            {summary.kpis.ticketsResolved} tickets résolus sur la période.{" "}
            <Link href="/admin/crm/leads" className="font-semibold text-primary hover:underline">
              Explorer le CRM →
            </Link>
          </p>
        </>
      ) : null}

      <ReportsDrilldownPanel target={drilldown} period={period} onClose={() => setDrilldown(null)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  comparison,
  icon,
  compact,
}: {
  label: string;
  value: string;
  sub?: string;
  comparison?: ReportsComparison["metrics"][number];
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  const delta = comparison?.delta ?? 0;
  const positive = delta >= 0;

  return (
    <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
        {icon}
      </div>
      <p className={cn("mt-2 font-bold text-foreground", compact ? "text-lg" : "text-2xl")}>{value}</p>
      {comparison && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
            delta === 0 ? "text-gray-text" : positive ? "text-emerald-600" : "text-accent",
          )}
        >
          {delta === 0 ? (
            <Minus className="h-3 w-3" aria-hidden />
          ) : positive ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3 w-3" aria-hidden />
          )}
          {formatReportDelta(comparison.delta, comparison.deltaPercent)} vs N-1
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-gray-text">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function TrendBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-light">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-gray-text">{value}</span>
    </div>
  );
}
