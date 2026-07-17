"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
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
import { DEAL_STAGES } from "@/lib/deals";
import { fetchDeals, updateDealStageApi } from "@/lib/deals-api";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
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

const PIPELINE_COLUMNS: DealStage[] = ["lead", "quote", "client", "project", "invoiced"];

const DEAL_DRAG_MIME = "application/x-sdcreativ-deal-lead-id";

export function CrmDealsView() {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dragOverColumn, setDragOverColumn] = useState<DealStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

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

  const byStage = useMemo(() => {
    const map = Object.fromEntries(DEAL_STAGES.map((s) => [s, [] as DealRecord[]])) as Record<
      DealStage,
      DealRecord[]
    >;
    for (const deal of deals) {
      map[deal.stage].push(deal);
    }
    return map;
  }, [deals]);

  async function moveDeal(leadId: string, stage: DealStage) {
    const current = deals.find((d) => d.leadId === leadId);
    if (!current || current.stage === stage) return;

    setMovingId(leadId);
    setError("");
    try {
      const updated = await updateDealStageApi(leadId, stage);
      setDeals((prev) => prev.map((d) => (d.leadId === leadId ? updated : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de déplacer l'opportunité.");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pipeline opportunités</h2>
          <p className="text-sm text-gray-text">
            Kanban actionnable : glisser pour avancer, liens vers les fiches
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "kanban"
                ? "bg-[#071525] text-white"
                : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              view === "list"
                ? "bg-[#071525] text-white"
                : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              scope === "all"
                ? "bg-[#071525] text-white"
                : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Toute l&apos;équipe
          </button>
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              scope === "mine"
                ? "bg-[#071525] text-white"
                : "border border-gray/40 text-gray-text hover:bg-gray-light/50",
            )}
          >
            Mes dossiers
          </button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
          aria-hidden
        />
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
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_COLUMNS.map((stage) => (
            <KanbanDropColumn
              key={stage}
              columnId={stage}
              isDropTarget={dragOverColumn === stage}
              dragMime={DEAL_DRAG_MIME}
              onDragOverChange={(id) => setDragOverColumn(id as DealStage | null)}
              onDrop={(leadId) => void moveDeal(leadId, stage)}
              className="min-h-[280px]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    STAGE_STYLES[stage],
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs font-medium text-gray-text">{byStage[stage].length}</span>
              </div>
              <div className="space-y-2">
                {byStage[stage].map((deal) => (
                  <DealKanbanCard
                    key={deal.id}
                    deal={deal}
                    dragging={draggingId === deal.leadId}
                    busy={movingId === deal.leadId}
                    onDragStart={() => setDraggingId(deal.leadId)}
                    onDragEnd={() => setDraggingId(null)}
                    onMarkLost={() => void moveDeal(deal.leadId, "lost")}
                  />
                ))}
              </div>
            </KanbanDropColumn>
          ))}

          <KanbanDropColumn
            columnId="lost"
            isDropTarget={dragOverColumn === "lost"}
            dragMime={DEAL_DRAG_MIME}
            onDragOverChange={(id) => setDragOverColumn(id as DealStage | null)}
            onDrop={(leadId) => void moveDeal(leadId, "lost")}
            className="min-h-[280px] border-dashed"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", STAGE_STYLES.lost)}>
                Perdu
              </span>
              <span className="text-xs font-medium text-gray-text">{byStage.lost.length}</span>
            </div>
            <div className="space-y-2">
              {byStage.lost.map((deal) => (
                <DealKanbanCard
                  key={deal.id}
                  deal={deal}
                  dragging={draggingId === deal.leadId}
                  busy={movingId === deal.leadId}
                  onDragStart={() => setDraggingId(deal.leadId)}
                  onDragEnd={() => setDraggingId(null)}
                  onRestore={() => void moveDeal(deal.leadId, "lead")}
                />
              ))}
            </div>
          </KanbanDropColumn>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <DealListCard
              key={deal.id}
              deal={deal}
              busy={movingId === deal.leadId}
              onMove={(stage) => void moveDeal(deal.leadId, stage)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DealKanbanCard({
  deal,
  dragging,
  busy,
  onDragStart,
  onDragEnd,
  onMarkLost,
  onRestore,
}: {
  deal: DealRecord;
  dragging: boolean;
  busy: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMarkLost?: () => void;
  onRestore?: () => void;
}) {
  return (
    <article
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.setData(DEAL_DRAG_MIME, deal.leadId);
        e.dataTransfer.setData(KANBAN_DRAG_MIME.lead, deal.leadId);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-xl border border-gray/25 bg-white p-3 shadow-sm active:cursor-grabbing",
        dragging && "opacity-50",
        busy && "opacity-70",
      )}
    >
      <p className="truncate text-sm font-bold text-foreground">{deal.leadName}</p>
      <p className="truncate text-xs text-gray-text">{deal.leadEmail}</p>
      {deal.quoteAmount != null && (
        <p className="mt-1 text-xs font-medium text-foreground">
          {formatQuoteAmount(deal.quoteAmount)}
        </p>
      )}
      {deal.leadAssignee && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-text">
          <User className="h-3 w-3" aria-hidden />
          {deal.leadAssignee}
        </p>
      )}
      <DealLinks deal={deal} compact />
      <div className="mt-2 flex flex-wrap gap-1">
        {onMarkLost && deal.stage !== "lost" && (
          <button
            type="button"
            onClick={onMarkLost}
            disabled={busy}
            className="rounded-lg border border-gray/30 px-2 py-1 text-[10px] font-medium text-gray-text hover:bg-gray-light/50"
          >
            Perdu
          </button>
        )}
        {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            disabled={busy}
            className="rounded-lg border border-primary/30 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary-light/40"
          >
            Réouvrir
          </button>
        )}
      </div>
    </article>
  );
}

function DealListCard({
  deal,
  busy,
  onMove,
}: {
  deal: DealRecord;
  busy: boolean;
  onMove: (stage: DealStage) => void;
}) {
  return (
    <article className="rounded-2xl border border-gray/30 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-foreground">{deal.leadName}</p>
          <p className="text-xs text-gray-text">{deal.leadEmail}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
            STAGE_STYLES[deal.stage],
          )}
        >
          {STAGE_LABELS[deal.stage]}
        </span>
      </div>
      <DealLinks deal={deal} />
      {deal.invoiceCount > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Receipt className="h-3.5 w-3.5" aria-hidden />
          {deal.invoiceCount} facture(s) — {formatQuoteAmount(deal.invoicedAmount)}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PIPELINE_COLUMNS.filter((s) => s !== deal.stage).map((stage) => (
          <button
            key={stage}
            type="button"
            disabled={busy}
            onClick={() => onMove(stage)}
            className="rounded-lg border border-gray/30 px-2 py-1 text-[10px] font-medium text-gray-text hover:bg-gray-light/50 disabled:opacity-50"
          >
            → {STAGE_LABELS[stage]}
          </button>
        ))}
        {deal.stage !== "lost" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove("lost")}
            className="rounded-lg border border-accent/30 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/5 disabled:opacity-50"
          >
            Perdu
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMove("lead")}
            className="rounded-lg border border-primary/30 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary-light/40 disabled:opacity-50"
          >
            Réouvrir
          </button>
        )}
      </div>
    </article>
  );
}

function DealLinks({ deal, compact }: { deal: DealRecord; compact?: boolean }) {
  const links = [
    {
      href: `/admin/crm/leads?id=${deal.leadId}`,
      label: "Lead",
      icon: <Target className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />,
      show: true,
    },
    {
      href: deal.quoteId ? `/admin/crm/devis?id=${deal.quoteId}` : null,
      label: deal.quoteReference ?? "Devis",
      icon: <FileText className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />,
      show: Boolean(deal.quoteId),
    },
    {
      href: deal.clientId ? `/admin/crm/clients?id=${deal.clientId}` : null,
      label: deal.clientName ?? "Client",
      icon: <Users className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />,
      show: Boolean(deal.clientId),
    },
    {
      href: deal.projectId ? `/admin/crm/projets/${deal.projectId}` : null,
      label: deal.projectName ?? "Projet",
      icon: <FolderKanban className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />,
      show: Boolean(deal.projectId),
    },
  ].filter((l) => l.show && l.href);

  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", compact ? "mt-2" : "mt-3")}>
      {links.map((link) => (
        <Link
          key={link.href!}
          href={link.href!}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-gray/25 bg-gray-light/20 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-light/30",
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
          )}
        >
          {link.icon}
          <span className="max-w-[7rem] truncate">{link.label}</span>
          <ExternalLink className="h-2.5 w-2.5 text-gray-text" aria-hidden />
        </Link>
      ))}
    </div>
  );
}
