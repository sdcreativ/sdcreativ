"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import {
  DASHBOARD_PERIODS,
  REPORT_PERIOD_LABELS,
  type DashboardPeriod,
} from "@/content/reports-labels";
import { CRM_ROLE_LABELS } from "@/content/crm-roles";
import {
  CrmConversionChart,
  CrmPipelineChart,
  CrmRevenueChart,
} from "@/components/admin/CrmReportCharts";
import { CrmInfraHealthWidget } from "@/components/admin/CrmInfraHealthWidget";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Client } from "@/lib/clients";
import {
  DASHBOARD_WIDGET_LABELS,
  loadDashboardLayout,
  moveWidget,
  saveDashboardLayout,
  toggleWidgetVisibility,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/dashboard-config";
import { fetchDashboardSnapshot } from "@/lib/dashboard-api";
import { fetchCrmSession, saveDashboardLayoutApi } from "@/lib/crm-settings-api";
import {
  canShowDashboardWidget,
  filterDashboardWidgets,
  hasCrmPermission,
} from "@/lib/crm-access";
import { fetchInfraHealth } from "@/lib/infra-api";
import type { InfraHealth } from "@/lib/infra-health-types";
import { getReportsExportUrl } from "@/lib/reports-api";
import type { ReportsSummary } from "@/lib/reports";
import { updateTaskApi } from "@/lib/tasks-api";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import type {
  DashboardActivity,
  DashboardKpi,
  DashboardPipelineColumn,
} from "@/lib/dashboard-utils";
import { cn } from "@/lib/utils";

const statusStyles = {
  "EN COURS": "bg-primary-light text-primary",
  "EN TEST": "bg-amber-100 text-amber-700",
  TERMINÉ: "bg-emerald-100 text-emerald-700",
} as const;

type OpenTask = { id: string; label: string; due: string; done: boolean };
type RecentProject = {
  id: string;
  name: string;
  type: string;
  status: "EN COURS" | "EN TEST" | "TERMINÉ";
  progress: number;
  href: string;
};

type DashboardFilters = {
  assignee: string;
  clientId: string;
};

export function CrmDashboard() {
  const assignees = useCrmAssignees();
  const { permissions } = useCrmPermissions();
  const canTasksWrite = hasCrmPermission(permissions, "tasks.write");
  const canReports = hasCrmPermission(permissions, "reports.view");
  const canClients = hasCrmPermission(permissions, "clients.read");
  const canInfra = hasCrmPermission(permissions, "infra.view");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);
  const [pipeline, setPipeline] = useState<DashboardPipelineColumn[]>([]);
  const [tasks, setTasks] = useState<OpenTask[]>([]);
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({ assignee: "", clientId: "" });
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [infraHealth, setInfraHealth] = useState<InfraHealth | null>(null);
  const [infraLoading, setInfraLoading] = useState(false);
  const [infraError, setInfraError] = useState("");

  useEffect(() => {
    void fetchCrmSession()
      .then((s) => {
        setUserId(s.userId);
        setRoleLabel(s.roleLabel ?? CRM_ROLE_LABELS[s.role as keyof typeof CRM_ROLE_LABELS] ?? s.role);
        const base = s.dashboardLayout ?? loadDashboardLayout(s.role);
        setLayout(base);
      })
      .catch(() => setLayout(loadDashboardLayout("admin")));
    if (canClients) {
      void fetchCrmClients({ pageSize: 100 })
        .then(setClients)
        .catch(() => setClients([]));
    } else {
      setClients([]);
    }
  }, [canClients]);

  const apiFilters = useMemo(
    () => ({
      assignee: filters.assignee || undefined,
      clientId: filters.clientId || undefined,
    }),
    [filters],
  );

  const loadInfra = useCallback(async () => {
    if (!canInfra) return;
    setInfraLoading(true);
    setInfraError("");
    try {
      setInfraHealth(await fetchInfraHealth());
    } catch (err) {
      setInfraError(err instanceof Error ? err.message : "Impossible de charger l'état infra.");
      setInfraHealth(null);
    } finally {
      setInfraLoading(false);
    }
  }, [canInfra]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    void loadInfra();
    try {
      const snapshot = await fetchDashboardSnapshot(period, apiFilters);
      setReports(snapshot.reports);
      setKpis(snapshot.kpis);
      setPipeline(snapshot.pipeline);
      setTasks(snapshot.openTasks);
      setProjects(snapshot.recentProjects);
      setActivities(snapshot.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  }, [period, apiFilters, loadInfra]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleTask(task: OpenTask) {
    if (!canTasksWrite) return;
    setTogglingTask(task.id);
    try {
      await updateTaskApi(task.id, { status: "done" });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch {
      setError("Impossible de mettre à jour la tâche.");
    } finally {
      setTogglingTask(null);
    }
  }

  function updateLayout(next: DashboardLayout) {
    setLayout(next);
    saveDashboardLayout(next);
    void saveDashboardLayoutApi(next).catch(() => {
      /* fallback localStorage déjà sauvegardé */
    });
  }

  const exportPdfUrl = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.clientId) params.set("clientId", filters.clientId);
    return `/api/admin/reports/pdf?${params}`;
  }, [period, filters]);

  function renderWidget(id: DashboardWidgetId) {
    switch (id) {
      case "infra":
        return canInfra ? (
          <CrmInfraHealthWidget
            key="infra"
            health={infraHealth}
            loading={infraLoading}
            error={infraError}
            onRefresh={() => void loadInfra()}
          />
        ) : null;

      case "kpis":
        return (
          <div key="kpis" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {kpis.map((kpi) => (
              <Link
                key={kpi.id}
                href={kpi.href}
                className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-text">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{kpi.value}</p>
              </Link>
            ))}
          </div>
        );

      case "charts":
        return reports ? (
          <section key="charts" className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-foreground">Graphiques — {reports.period.label}</h2>
              <Link href="/admin/crm/rapports" className="text-sm font-medium text-primary hover:underline">
                Rapports détaillés
              </Link>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">Courbe CA</p>
                <CrmRevenueChart summary={reports} compact />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">Conversion</p>
                <CrmConversionChart summary={reports} />
              </div>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">Pipeline leads</p>
              <CrmPipelineChart summary={reports} />
            </div>
          </section>
        ) : null;

      case "pipeline":
        return (
          <section key="pipeline" className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">Pipeline commercial</h2>
              <Link href="/admin/crm/leads" className="text-sm font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pipeline.map((column) => (
                <div key={column.id} className="rounded-xl bg-gray-light/70 p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold tracking-wide text-gray-text">{column.title}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                      {column.count}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.cards.length === 0 ? (
                      <p className="px-1 py-4 text-center text-xs text-gray-text">Aucun lead</p>
                    ) : (
                      column.cards.map((card) => (
                        <Link
                          key={card.id}
                          href={card.href}
                          className="block rounded-xl border border-gray/40 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <p className="text-sm font-semibold text-foreground">{card.title}</p>
                          <p className="mt-0.5 text-xs text-gray-text">{card.subtitle}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-gray-text">{card.meta}</span>
                            {card.badge && (
                              <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {card.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case "tasks":
        return (
          <section key="tasks" className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">Tâches à faire</h2>
              <Link href="/admin/crm/taches" className="text-sm font-medium text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-text">
                Aucune tâche ouverte.{" "}
                <Link href="/admin/crm/taches?create=1" className="text-primary hover:underline">
                  Créer une tâche
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.done}
                      disabled={!canTasksWrite || togglingTask === task.id}
                      onChange={() => void toggleTask(task)}
                      aria-label={task.label}
                      className="mt-1 h-4 w-4 rounded border-gray/60 text-primary disabled:opacity-50"
                    />
                    <Link href="/admin/crm/taches" className="min-w-0 flex-1 hover:opacity-80">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          task.done ? "text-gray-text line-through" : "text-foreground",
                        )}
                      >
                        {task.label}
                      </p>
                      <p className="text-xs text-gray-text">{task.due}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

      case "projects":
        return (
          <section key="projects" className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">Projets récents</h2>
              <Link
                href="/admin/crm/projets"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Voir tout
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-text">
                Aucun projet.{" "}
                <Link href="/admin/crm/projets?create=1" className="text-primary hover:underline">
                  Créer un projet
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray/40 text-xs uppercase tracking-wide text-gray-text">
                      <th className="pb-3 pr-4 font-semibold">Projet</th>
                      <th className="pb-3 pr-4 font-semibold">Type</th>
                      <th className="pb-3 pr-4 font-semibold">Statut</th>
                      <th className="pb-3 font-semibold">Progression</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray/30">
                    {projects.map((project) => (
                      <tr key={project.id} className="group">
                        <td className="py-3.5 pr-4">
                          <Link
                            href={project.href}
                            className="font-medium text-foreground group-hover:text-primary hover:underline"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="py-3.5 pr-4 text-gray-text">{project.type}</td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-bold",
                              statusStyles[project.status],
                            )}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-light">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold text-gray-text">
                              {project.progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );

      case "activity":
        return (
          <section key="activity" className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-foreground">Activité récente</h2>
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-text">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-4">
                {activities.map((activity, index) => (
                  <li key={activity.id} className="relative pl-5">
                    {index < activities.length - 1 && (
                      <span className="absolute bottom-0 left-[7px] top-4 w-px bg-gray/60" aria-hidden />
                    )}
                    <span
                      className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-white"
                      aria-hidden
                    />
                    <Link href={activity.href} className="block hover:opacity-80">
                      <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                      <p className="text-xs text-gray-text">{activity.subtitle}</p>
                      <p className="mt-1 text-[11px] text-gray-text/80">{activity.time}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );

      default:
        return null;
    }
  }

  if (loading && !reports && canReports) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement du tableau de bord…
      </div>
    );
  }

  const visibleWidgets = filterDashboardWidgets(
    layout?.order ?? ["kpis", "charts", "pipeline", "tasks", "projects", "activity"],
    permissions,
    kpis.length,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-text">
            Données CRM en temps réel —{" "}
            {roleLabel && (
              <span className="font-medium text-foreground">Vue {roleLabel.toLowerCase()}</span>
            )}
            {reports && <> · {reports.period.label}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gray/60 bg-white p-1">
            {DASHBOARD_PERIODS.map((p) => (
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
          {canReports && (
            <>
              <a
                href={getReportsExportUrl()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
              >
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">CSV</span>
              </a>
              <a
                href={exportPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-primary-light/30"
              >
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">PDF</span>
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => setCustomizeOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Widgets</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", customizeOpen && "rotate-180")} aria-hidden />
          </button>
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

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        {userId && userId !== "legacy" && (
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, assignee: userId }))}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              filters.assignee === userId
                ? "bg-[#071525] text-white"
                : "border border-gray/60 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Mes dossiers
          </button>
        )}
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-text">Équipe</span>
          <select
            value={filters.assignee}
            onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm min-w-[10rem]"
          >
            <option value="">Toute l&apos;équipe</option>
            {assignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        {canClients && (
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-text">Client</span>
          <select
            value={filters.clientId}
            onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value }))}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm min-w-[12rem]"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>
        </label>
        )}
        {(filters.assignee || filters.clientId) && (
          <button
            type="button"
            onClick={() => setFilters({ assignee: "", clientId: "" })}
            className="rounded-xl border border-gray/60 px-3 py-2 text-xs font-medium text-gray-text hover:text-foreground"
          >
            Réinitialiser filtres
          </button>
        )}
      </div>

      {customizeOpen && layout && (
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-bold text-foreground">Personnaliser les widgets</h3>
          </div>
          <ul className="space-y-2">
            {layout.order
              .filter((widgetId) => canShowDashboardWidget(widgetId, permissions, kpis.length))
              .map((widgetId, index) => (
              <li
                key={widgetId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray/30 bg-gray-light/20 px-3 py-2"
              >
                <span className="text-sm font-medium text-foreground">
                  {DASHBOARD_WIDGET_LABELS[widgetId]}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => updateLayout(moveWidget(layout, widgetId, "up"))}
                    className="rounded-lg border border-gray/60 p-1.5 disabled:opacity-40"
                    aria-label={`Monter ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={index === layout.order.length - 1}
                    onClick={() => updateLayout(moveWidget(layout, widgetId, "down"))}
                    className="rounded-lg border border-gray/60 p-1.5 disabled:opacity-40"
                    aria-label={`Descendre ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayout(toggleWidgetVisibility(layout, widgetId))}
                    className="rounded-lg border border-gray/60 p-1.5"
                    aria-label={`Masquer ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {layout.hidden.map((widgetId) => (
              <li
                key={widgetId}
                className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-gray/40 px-3 py-2 opacity-60"
              >
                <span className="text-sm text-gray-text">{DASHBOARD_WIDGET_LABELS[widgetId]}</span>
                <button
                  type="button"
                  onClick={() => updateLayout(toggleWidgetVisibility(layout, widgetId))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Afficher
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      <div className="space-y-6">
        {visibleWidgets.map((widgetId) => {
          const content = renderWidget(widgetId);
          return content ? <div key={widgetId}>{content}</div> : null;
        })}
      </div>
    </div>
  );
}
