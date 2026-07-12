"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Loader2,
  Receipt,
  Search,
  Target,
  User,
  Users,
} from "lucide-react";
import type { DealRecord, DealStage } from "@/lib/deals";
import { fetchDeals } from "@/lib/deals-api";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { LEAD_STATUS_LABELS } from "@/content/leads-labels";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  quote: "Devis",
  client: "Client",
  project: "Projet",
  invoiced: "Facturé",
  lost: "Perdu",
};

const STAGE_STYLES: Record<DealStage, string> = {
  lead: "bg-sky-100 text-sky-700",
  quote: "bg-amber-100 text-amber-800",
  client: "bg-violet-100 text-violet-700",
  project: "bg-primary-light text-primary",
  invoiced: "bg-emerald-100 text-emerald-700",
  lost: "bg-gray-light text-gray-text",
};

const STEPS: DealStage[] = ["lead", "quote", "client", "project", "invoiced"];

function stageIndex(stage: DealStage): number {
  if (stage === "lost") return -1;
  return STEPS.indexOf(stage);
}

export function CrmDealsView() {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDeals(await fetchDeals({ q: search || undefined, scope }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les opportunités.");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [search, scope]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pipeline opportunités</h2>
          <p className="text-sm text-gray-text">
            Vue unifiée lead → devis → client → projet → facturé
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              scope === "all" ? "bg-[#071525] text-white" : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Toute l&apos;équipe
          </button>
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              scope === "mine" ? "bg-[#071525] text-white" : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Mes dossiers
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un contact, email, référence devis…"
          className="w-full rounded-xl border border-gray/50 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : deals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray/40 bg-gray-light/20 px-4 py-12 text-center text-sm text-gray-text">
          Aucune opportunité trouvée.
        </p>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: DealRecord }) {
  const current = stageIndex(deal.stage);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray/30 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray/20 bg-gradient-to-r from-gray-light/30 to-white px-5 py-4">
        <div>
          <p className="font-bold text-foreground">{deal.leadName}</p>
          <p className="text-xs text-gray-text">{deal.leadEmail}</p>
          {deal.leadAssignee && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-text">
              <User className="h-3 w-3" aria-hidden />
              {deal.leadAssignee}
            </p>
          )}
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", STAGE_STYLES[deal.stage])}>
          {STAGE_LABELS[deal.stage]}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, idx) => {
            const done = current >= idx;
            const active = deal.stage === step;
            return (
              <div key={step} className="flex min-w-0 flex-1 items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done ? "bg-primary text-white" : "bg-gray-light text-gray-text",
                    active && "ring-2 ring-primary/30",
                  )}
                >
                  {idx + 1}
                </div>
                <span className="hidden truncate text-[10px] font-medium text-gray-text sm:inline">
                  {STAGE_LABELS[step]}
                </span>
                {idx < STEPS.length - 1 && (
                  <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-gray-text/40" aria-hidden />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <DealMeta
            icon={<Target className="h-3.5 w-3.5" aria-hidden />}
            label="Lead"
            value={deal.leadStatus ? LEAD_STATUS_LABELS[deal.leadStatus] : "—"}
            href={deal.leadId ? `/admin/crm/leads` : undefined}
          />
          <DealMeta
            icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
            label="Devis"
            value={deal.quoteReference ?? "—"}
            detail={deal.quoteAmount != null ? formatQuoteAmount(deal.quoteAmount) : undefined}
            href={deal.quoteId ? `/admin/crm/devis` : undefined}
          />
          <DealMeta
            icon={<Users className="h-3.5 w-3.5" aria-hidden />}
            label="Client"
            value={deal.clientName ?? "—"}
            href={deal.clientId ? `/admin/crm/clients` : undefined}
          />
          <DealMeta
            icon={<FolderKanban className="h-3.5 w-3.5" aria-hidden />}
            label="Projet"
            value={deal.projectName ?? "—"}
            href={deal.projectId ? `/admin/crm/projets/${deal.projectId}` : undefined}
          />
        </div>

        {deal.invoiceCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Receipt className="h-3.5 w-3.5" aria-hidden />
            {deal.invoiceCount} facture(s) — {formatQuoteAmount(deal.invoicedAmount)}
          </p>
        )}
      </div>
    </article>
  );
}

function DealMeta({
  icon,
  label,
  value,
  detail,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-gray/20 bg-gray-light/15 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-text">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
      {detail && <p className="text-xs text-gray-text">{detail}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}
