"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import type { InfraCheck, InfraCheckStatus, InfraHealth } from "@/lib/infra-health-types";
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

const STATUS_DOT: Record<InfraCheckStatus, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-gray-400",
};

function StatusIcon({ status }: { status: InfraCheckStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-600" aria-hidden />;
  return <Server className="h-4 w-4 text-gray-500" aria-hidden />;
}

function InfraCheckRow({ check }: { check: InfraCheck }) {
  return (
    <div className="rounded-xl border border-gray/30 bg-gray-light/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[check.status])} aria-hidden />
          <p className="text-sm font-semibold text-foreground">{check.label}</p>
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
      <p className="mt-2 text-sm text-gray-text">{check.detail}</p>
      {check.hint && (
        <p className="mt-1.5 text-xs text-gray-text/75">{check.hint}</p>
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

  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#071525] text-white">
            <HardDrive className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Santé infra VPS</h2>
            <p className="text-xs text-gray-text">
              {health
                ? `Environnement ${health.environment} · vérifié ${new Date(health.checkedAt).toLocaleString("fr-FR")}`
                : "PostgreSQL, S3, Docker, disque"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {health.checks.map((check) => (
            <InfraCheckRow key={check.id} check={check} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-gray-text">
          Impossible de charger l&apos;état infra.
        </p>
      )}
    </section>
  );
}
