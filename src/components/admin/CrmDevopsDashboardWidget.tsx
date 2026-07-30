"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitBranch,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import type { DevopsGithubSnapshot, DevopsPipelineStep } from "@/lib/devops-github";
import type { InfraHealth } from "@/lib/infra-health-types";
import { cn } from "@/lib/utils";

type Props = {
  devops: DevopsGithubSnapshot | null;
  devopsLoading: boolean;
  devopsError: string;
  health: InfraHealth | null;
  infraLoading: boolean;
  onRefresh: () => void;
};

function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return "à l’instant";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function StepIcon({ status }: { status: DevopsPipelineStep["status"] }) {
  if (status === "success") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />;
  }
  if (status === "failure") {
    return <XCircle className="h-5 w-5 text-red-600" aria-hidden />;
  }
  if (status === "in_progress" || status === "queued") {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />;
  }
  if (status === "skipped" || status === "cancelled") {
    return <Circle className="h-5 w-5 text-gray-text/50" aria-hidden />;
  }
  return <Circle className="h-5 w-5 text-gray-text/40" aria-hidden />;
}

function pipelineStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return "Pipeline réussi";
    case "failure":
      return "Pipeline échoué";
    case "in_progress":
      return "Pipeline en cours";
    case "queued":
      return "Pipeline en file";
    case "cancelled":
      return "Pipeline annulé";
    default:
      return "Pipeline";
  }
}

function ResourceBar({
  label,
  percent,
}: {
  label: string;
  percent: number | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-text">{label}</span>
        <span className="font-semibold text-foreground">
          {percent == null ? "—" : `${percent}%`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray/50">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent == null
              ? "w-0 bg-gray"
              : percent >= 90
                ? "bg-red-500"
                : percent >= 75
                  ? "bg-amber-500"
                  : "bg-primary",
          )}
          style={{ width: percent == null ? "0%" : `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function ContainersDonut({
  running,
  down,
  unknown,
}: {
  running: number;
  down: number;
  unknown: number;
}) {
  const total = running + down + unknown;
  const r = 36;
  const c = 2 * Math.PI * r;
  const runLen = total ? (running / total) * c : 0;
  const downLen = total ? (down / total) * c : 0;
  const unkLen = total ? (unknown / total) * c : 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e8ecf0" strokeWidth="10" />
          {total > 0 && (
            <>
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={`${runLen} ${c - runLen}`}
                strokeDashoffset={0}
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="10"
                strokeDasharray={`${downLen} ${c - downLen}`}
                strokeDashoffset={-runLen}
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeDasharray={`${unkLen} ${c - unkLen}`}
                strokeDashoffset={-(runLen + downLen)}
              />
            </>
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-text">total</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Running <span className="font-semibold text-foreground">{running}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Stopped <span className="font-semibold text-foreground">{down}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Unknown <span className="font-semibold text-foreground">{unknown}</span>
        </li>
      </ul>
    </div>
  );
}

export function CrmDevopsDashboardWidget({
  devops,
  devopsLoading,
  devopsError,
  health,
  infraLoading,
  onRefresh,
}: Props) {
  const loading = devopsLoading || infraLoading;
  const services = health?.dockerServices ?? [];
  const running = services.filter((s) => s.status === "running").length;
  const down = services.filter((s) => s.status === "down").length;
  const unknown = services.filter((s) => s.status === "unknown").length;
  const resources = health?.resources;
  const pipeline = devops?.pipeline;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-bold text-foreground">DevOps</h2>
          {devops?.repository && (
            <span className="rounded-full bg-gray-light px-2.5 py-0.5 text-xs text-gray-text">
              {devops.repository}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray/50 bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-gray-light disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
          Actualiser
        </button>
      </div>

      {devopsError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {devopsError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CI/CD Pipeline */}
        <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-foreground">CI/CD Pipeline</h3>
            {pipeline && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-text">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium",
                    pipeline.status === "success" && "text-emerald-700",
                    pipeline.status === "failure" && "text-red-700",
                    pipeline.status === "in_progress" && "text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      pipeline.status === "success" && "bg-emerald-500",
                      pipeline.status === "failure" && "bg-red-500",
                      pipeline.status === "in_progress" && "bg-primary",
                      !["success", "failure", "in_progress"].includes(pipeline.status) &&
                        "bg-gray-text",
                    )}
                  />
                  {pipelineStatusLabel(pipeline.status)}
                </span>
                <span>Démarré {formatRelative(pipeline.startedAt)}</span>
                <a
                  href={pipeline.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Voir sur GitHub
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>
            )}
          </div>

          {devopsLoading && !devops ? (
            <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement GitHub…
            </p>
          ) : !devops?.configured ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                GitHub non configuré
              </p>
              <p className="mt-1 text-amber-800/90">
                {devops?.hint ??
                  "Ajoutez DEVOPS_GITHUB_TOKEN et GITHUB_REPOSITORY dans .env.docker."}
              </p>
            </div>
          ) : devops.error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {devops.error}
            </p>
          ) : !pipeline ? (
            <p className="py-8 text-center text-sm text-gray-text">
              Aucun workflow run trouvé sur ce dépôt.
            </p>
          ) : pipeline.steps.length === 0 ? (
            <p className="py-6 text-sm text-gray-text">
              Run « {pipeline.name} » ({pipeline.branch}) — détail des steps indisponible.
            </p>
          ) : (
            <div className="overflow-x-auto pb-1">
              <ol className="flex min-w-max items-start gap-0">
                {pipeline.steps.map((step, i) => (
                  <li key={`${step.name}-${i}`} className="flex items-start">
                    <div className="flex w-[7.5rem] flex-col items-center gap-1.5 px-1 text-center">
                      <StepIcon status={step.status} />
                      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                        {step.name}
                      </p>
                      <p className="text-[10px] text-gray-text">
                        {formatDuration(step.durationMs)}
                      </p>
                    </div>
                    {i < pipeline.steps.length - 1 && (
                      <div
                        className={cn(
                          "mt-2.5 h-0.5 w-4 shrink-0",
                          step.status === "success" ? "bg-emerald-400" : "bg-gray/60",
                        )}
                        aria-hidden
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Deployments */}
        <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground">Deployments</h3>
            {devops?.repository && (
              <a
                href={`https://github.com/${devops.repository}/deployments`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Voir tout
              </a>
            )}
          </div>
          {!devops?.configured ? (
            <p className="text-sm text-gray-text">Configurez GitHub pour afficher les déploiements.</p>
          ) : devops.deployments.length === 0 ? (
            <p className="text-sm text-gray-text">
              Aucun déploiement GitHub Environments sur ce dépôt.
            </p>
          ) : (
            <ul className="space-y-3">
              {devops.deployments.map((d) => (
                <li key={d.environment} className="flex items-start gap-3">
                  <CheckCircle2
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      d.state === "success" ? "text-emerald-600" : "text-gray-text",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{d.environment}</p>
                    <p className="text-xs text-gray-text">
                      {d.ref} · {d.sha} · {formatRelative(d.createdAt)}
                    </p>
                  </div>
                  {d.htmlUrl && (
                    <a
                      href={d.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-text hover:text-primary"
                      aria-label={`Ouvrir ${d.environment}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Branches */}
        <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-foreground">Git Branches</h3>
          {!devops?.configured ? (
            <p className="text-sm text-gray-text">Configurez GitHub pour lister les branches.</p>
          ) : devops.branches.length === 0 ? (
            <p className="text-sm text-gray-text">Aucune branche accessible.</p>
          ) : (
            <ul className="space-y-2.5">
              {devops.branches.map((b) => (
                <li key={b.name} className="flex items-center gap-2.5">
                  <GitBranch className="h-4 w-4 shrink-0 text-gray-text" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={b.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium text-foreground hover:text-primary"
                      >
                        {b.name}
                      </a>
                      {(b.name === "main" || b.name === "master") && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-gray-text">{b.sha}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Containers */}
        <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-foreground">Containers</h3>
          {infraLoading && !health ? (
            <p className="flex items-center gap-2 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement…
            </p>
          ) : services.length === 0 ? (
            <p className="text-sm text-gray-text">
              Statut Docker non remonté. Lancez{" "}
              <code className="text-xs">infra-status-export.sh</code> sur le VPS.
            </p>
          ) : (
            <>
              <ContainersDonut running={running} down={down} unknown={unknown} />
              <ul className="mt-4 space-y-1 border-t border-gray/40 pt-3">
                {services.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between text-xs text-gray-text"
                  >
                    <span>{s.label}</span>
                    <span
                      className={cn(
                        "font-medium",
                        s.status === "running" && "text-emerald-700",
                        s.status === "down" && "text-red-600",
                      )}
                    >
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Resource Usage */}
        <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground">Resource Usage</h3>
            <Link
              href="#infra"
              className="text-xs font-medium text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector("[data-infra-widget]")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Détails infra
            </Link>
          </div>
          {!resources ||
          (resources.cpuPercent == null &&
            resources.memUsedPercent == null &&
            resources.diskUsedPercent == null) ? (
            <p className="text-sm text-gray-text">
              Métriques host indisponibles. Mettez à jour le cron{" "}
              <code className="text-xs">infra-status-export.sh</code> sur le VPS.
            </p>
          ) : (
            <div className="space-y-4">
              <ResourceBar label="CPU Usage" percent={resources.cpuPercent} />
              <ResourceBar label="Memory Usage" percent={resources.memUsedPercent} />
              <ResourceBar label="Disk Usage" percent={resources.diskUsedPercent} />
              {resources.memTotalMb != null && (
                <p className="flex items-center gap-1.5 text-xs text-gray-text">
                  <HardDrive className="h-3.5 w-3.5" aria-hidden />
                  RAM totale : {resources.memTotalMb} Mo
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
