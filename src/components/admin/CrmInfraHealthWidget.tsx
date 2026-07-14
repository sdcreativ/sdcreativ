"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Container,
  Copy,
  Database,
  Globe,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import type {
  InfraAction,
  InfraCheck,
  InfraCheckStatus,
  InfraDockerService,
  InfraHealth,
} from "@/lib/infra-health-types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<InfraCheckStatus, string> = {
  ok: "Opérationnel",
  warning: "Attention",
  error: "Critique",
  unknown: "Inconnu",
};

const STATUS_RING: Record<InfraCheckStatus, string> = {
  ok: "ring-emerald-500/30",
  warning: "ring-amber-500/30",
  error: "ring-red-500/30",
  unknown: "ring-white/10",
};

const STATUS_BADGE: Record<InfraCheckStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-200 border-amber-500/25",
  error: "bg-red-500/15 text-red-200 border-red-500/25",
  unknown: "bg-white/10 text-white/70 border-white/15",
};

const CARD_ACCENT: Record<InfraCheckStatus, string> = {
  ok: "border-l-emerald-500",
  warning: "border-l-amber-500",
  error: "border-l-red-500",
  unknown: "border-l-gray-300",
};

const CHECK_ICONS: Record<string, typeof Database> = {
  database: Database,
  "s3-backup": Cloud,
  "host-status": Server,
  disk: HardDrive,
  "backup-cron": Clock,
  docker: Container,
};

const DOCKER_ICONS: Record<string, typeof Database> = {
  app: Layers,
  postgres: Database,
  redis: Zap,
  nginx: Globe,
  certbot: Shield,
};

function StatusIcon({ status, className }: { status: InfraCheckStatus; className?: string }) {
  if (status === "ok") return <CheckCircle2 className={cn("h-4 w-4 text-emerald-400", className)} aria-hidden />;
  if (status === "warning") return <AlertTriangle className={cn("h-4 w-4 text-amber-400", className)} aria-hidden />;
  if (status === "error") return <XCircle className={cn("h-4 w-4 text-red-400", className)} aria-hidden />;
  return <Activity className={cn("h-4 w-4 text-white/50", className)} aria-hidden />;
}

function CopyCommandButton({ action }: { action: InfraAction }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`cd /var/www/sdcreativ && ${action.command}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [action.command]);

  const variantClass =
    action.variant === "danger"
      ? "border-red-200/80 bg-red-50 text-red-700 hover:bg-red-100/80"
      : action.variant === "primary"
        ? "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
        : "border-gray/40 bg-white text-gray-text hover:border-gray/60 hover:text-foreground";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all",
        variantClass,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          Copié
        </>
      ) : action.variant === "danger" ? (
        <>
          <RotateCcw className="h-3 w-3" aria-hidden />
          {action.label}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden />
          {action.label}
        </>
      )}
    </button>
  );
}

function DockerServiceTile({ service }: { service: InfraDockerService }) {
  const Icon = DOCKER_ICONS[service.name] ?? Container;
  const statusLabel =
    service.status === "running" ? "Actif" : service.status === "down" ? "Arrêté" : "—";

  return (
    <div
      className={cn(
        "flex min-w-[7.5rem] flex-1 flex-col rounded-xl border px-3 py-3 transition-colors",
        service.status === "running"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : service.status === "down"
            ? "border-red-500/20 bg-red-500/5"
            : "border-white/10 bg-white/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            service.status === "running"
              ? "bg-emerald-500/15 text-emerald-300"
              : service.status === "down"
                ? "bg-red-500/15 text-red-300"
                : "bg-white/10 text-white/50",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            service.status === "running"
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              : service.status === "down"
                ? "bg-red-400"
                : "bg-white/30",
          )}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-white">{service.label}</p>
      <p className="text-[10px] text-white/50">{statusLabel}</p>
    </div>
  );
}

function DiskBar({ percent }: { percent: number }) {
  const tone =
    percent >= 90 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[10px] font-medium text-gray-text">
        <span>Utilisation disque</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-light">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function InfraCheckCard({ check }: { check: InfraCheck }) {
  const Icon = CHECK_ICONS[check.id] ?? Server;
  const diskPercent = check.id === "disk"
    ? Number.parseInt(check.metrics?.find((m) => m.label === "Utilisation")?.value ?? "", 10)
    : null;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-gray/30 border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        CARD_ACCENT[check.status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#071525] text-white shadow-sm">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">{check.label}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-text">{check.detail}</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            check.status === "ok"
              ? "bg-emerald-100 text-emerald-700"
              : check.status === "warning"
                ? "bg-amber-100 text-amber-800"
                : check.status === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-600",
          )}
        >
          {STATUS_LABELS[check.status]}
        </span>
      </div>

      {diskPercent != null && !Number.isNaN(diskPercent) && <DiskBar percent={diskPercent} />}

      {check.metrics && check.metrics.length > 0 && (
        <dl className={cn("grid gap-2 sm:grid-cols-2", diskPercent != null ? "mt-3" : "mt-4")}>
          {check.metrics
            .filter((m) => !(check.id === "disk" && m.label === "Utilisation"))
            .map((metric) => (
              <div
                key={`${check.id}-${metric.label}`}
                className="rounded-xl bg-gray-light/35 px-3 py-2.5"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-text">
                  {metric.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{metric.value}</dd>
              </div>
            ))}
        </dl>
      )}

      {check.hint && (
        <p className="mt-3 rounded-lg bg-gray-light/25 px-3 py-2 text-xs leading-relaxed text-gray-text">
          {check.hint}
        </p>
      )}

      {check.actions && check.actions.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 border-t border-gray/20 pt-4">
          {check.actions.map((action) => (
            <CopyCommandButton key={action.id} action={action} />
          ))}
        </div>
      )}
    </article>
  );
}

function buildSummary(health: InfraHealth) {
  const dockerRunning = health.dockerServices.filter((s) => s.status === "running").length;
  const dockerTotal = health.dockerServices.filter((s) => s.name !== "certbot").length;
  const diskCheck = health.checks.find((c) => c.id === "disk");
  const diskUsed = diskCheck?.metrics?.find((m) => m.label === "Utilisation")?.value ?? "—";
  const backupCheck = health.checks.find((c) => c.id === "s3-backup");
  const backupAge =
    backupCheck?.metrics?.find((m) => m.label === "Dernière sauvegarde")?.value ?? "—";

  return [
    { label: "Services Docker", value: `${dockerRunning}/${dockerTotal}`, icon: Container },
    { label: "Disque VPS", value: diskUsed, icon: HardDrive },
    { label: "Dernière backup", value: backupAge, icon: Cloud },
    {
      label: "Sync hôte",
      value: health.hostUpdatedAt
        ? `il y a ${Math.max(1, Math.round((Date.now() - new Date(health.hostUpdatedAt).getTime()) / 60_000))} min`
        : "—",
      icon: Server,
    },
  ];
}

type Props = {
  health: InfraHealth | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
};

export function CrmInfraHealthWidget({ health, loading, error, onRefresh }: Props) {
  const overall = health?.overall ?? "unknown";
  const dockerCheck = health?.checks.find((c) => c.id === "docker");
  const detailChecks = useMemo(
    () => health?.checks.filter((c) => c.id !== "docker") ?? [],
    [health],
  );
  const summary = useMemo(() => (health ? buildSummary(health) : []), [health]);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
      <div
        className={cn(
          "relative border-b border-white/10 bg-[#071525] px-5 py-5 md:px-6 md:py-6",
          "ring-1 ring-inset",
          STATUS_RING[overall],
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_55%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
              <Activity className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Infrastructure
              </p>
              <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">Santé VPS & sauvegardes</h2>
              <p className="mt-1.5 text-sm text-white/60">
                {health
                  ? `${health.hostname ?? "production"} · ${health.environment}`
                  : "PostgreSQL · S3 · Docker · disque"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                STATUS_BADGE[overall],
              )}
            >
              <StatusIcon status={overall} />
              {STATUS_LABELS[overall]}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition-colors hover:bg-white/10"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
              Actualiser
            </button>
            <Link
              href="/admin/crm/parametres"
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              Intégrations
            </Link>
          </div>
        </div>

        {health && summary.length > 0 && (
          <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-white/50">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-lg font-bold text-white">{item.value}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        {error && (
          <p className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            {error}
          </p>
        )}

        {loading && !health ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Analyse de l&apos;infrastructure…
          </div>
        ) : health ? (
          <div className="space-y-5">
            {health.dockerServices.length > 0 && (
              <div className="rounded-2xl border border-gray/30 bg-gradient-to-br from-[#071525] to-[#0f2744] p-4 md:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Container className="h-4 w-4 text-primary-light" aria-hidden />
                  <h3 className="text-sm font-bold text-white">Conteneurs Docker</h3>
                  {dockerCheck && (
                    <span
                      className={cn(
                        "ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
                        STATUS_BADGE[dockerCheck.status],
                      )}
                    >
                      {STATUS_LABELS[dockerCheck.status]}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {health.dockerServices.map((service) => (
                    <DockerServiceTile key={service.name} service={service} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {detailChecks.map((check) => (
                <InfraCheckCard key={check.id} check={check} />
              ))}
            </div>

            <p className="text-right text-[11px] text-gray-text/70">
              Dernière vérification CRM : {new Date(health.checkedAt).toLocaleString("fr-FR")}
            </p>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-gray-text">
            Impossible de charger l&apos;état infra.
          </p>
        )}
      </div>
    </section>
  );
}
