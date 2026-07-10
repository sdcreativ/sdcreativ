"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Container,
  Copy,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  XCircle,
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
  ok: "OK",
  warning: "Attention",
  error: "Critique",
  unknown: "Inconnu",
};

const STATUS_STYLES: Record<InfraCheckStatus, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

const CHECK_ICONS: Record<string, typeof Database> = {
  database: Database,
  "s3-backup": Cloud,
  "host-status": Server,
  disk: HardDrive,
  "backup-cron": Clock,
  docker: Container,
};

function StatusIcon({ status }: { status: InfraCheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-600" aria-hidden />;
  return <Server className="h-4 w-4 text-gray-500" aria-hidden />;
}

function DockerServiceChip({ service }: { service: InfraDockerService }) {
  const styles =
    service.status === "running"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : service.status === "down"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-gray/40 bg-gray-light/40 text-gray-text";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium",
        styles,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          service.status === "running"
            ? "bg-emerald-500"
            : service.status === "down"
              ? "bg-red-500"
              : "bg-gray-400",
        )}
        aria-hidden
      />
      {service.label}
    </span>
  );
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
      ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
      : action.variant === "primary"
        ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
        : "border-gray/50 bg-white text-gray-text hover:text-foreground hover:bg-gray-light/30";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
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

function InfraCheckCard({ check }: { check: InfraCheck }) {
  const Icon = CHECK_ICONS[check.id] ?? Server;

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray/30 bg-gradient-to-br from-white to-gray-light/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#071525] text-white">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{check.label}</p>
            <p className="mt-0.5 truncate text-xs text-gray-text">{check.detail}</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            STATUS_STYLES[check.status],
          )}
        >
          {STATUS_LABELS[check.status]}
        </span>
      </div>

      {check.metrics && check.metrics.length > 0 && (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {check.metrics.map((metric) => (
            <div
              key={`${check.id}-${metric.label}`}
              className="rounded-lg border border-gray/20 bg-white/80 px-2.5 py-2"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-text">
                {metric.label}
              </dt>
              <dd className="mt-0.5 text-xs font-medium text-foreground">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {check.hint && (
        <p className="mt-3 text-xs leading-relaxed text-gray-text/80">{check.hint}</p>
      )}

      {check.actions && check.actions.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {check.actions.map((action) => (
            <CopyCommandButton key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
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

  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071525] text-white">
            <Archive className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Santé infra VPS</h2>
            <p className="text-xs text-gray-text">
              {health
                ? `${health.hostname ?? "production"} · ${health.environment} · vérifié ${new Date(health.checkedAt).toLocaleString("fr-FR")}`
                : "PostgreSQL, S3, Docker, disque"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {health && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                STATUS_STYLES[overall],
              )}
            >
              <StatusIcon status={overall} />
              {STATUS_LABELS[overall]}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 px-3 py-2 text-xs font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <Link
            href="/admin/crm/parametres"
            className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-light/30"
          >
            Intégrations
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {loading && !health ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Analyse infra…
        </div>
      ) : health ? (
        <div className="space-y-4">
          {health.dockerServices.length > 0 && (
            <div className="rounded-xl border border-gray/30 bg-gray-light/15 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Container className="h-4 w-4 text-primary" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Services Docker</p>
                {dockerCheck && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      STATUS_STYLES[dockerCheck.status],
                    )}
                  >
                    {STATUS_LABELS[dockerCheck.status]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {health.dockerServices.map((service) => (
                  <DockerServiceChip key={service.name} service={service} />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {health.checks.map((check) => (
              <InfraCheckCard key={check.id} check={check} />
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-dashed border-gray/40 bg-gray-light/10 px-3 py-2.5 text-xs text-gray-text">
            <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Les actions de sauvegarde et restauration copient une commande SSH à exécuter sur le
              VPS (<code className="rounded bg-white px-1">/var/www/sdcreativ</code>). La
              restauration remplace la base PostgreSQL — à lancer hors heures de production.
            </p>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-gray-text">
          Impossible de charger l&apos;état infra.
        </p>
      )}
    </section>
  );
}
