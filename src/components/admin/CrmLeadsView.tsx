"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LEAD_PIPELINE_COLUMNS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  formatLeadDate,
  formatLeadValue,
} from "@/content/leads-labels";
import {
  createLeadApi,
  deleteLeadApi,
  fetchDuplicateLeadGroups,
  fetchLeadsPaginated,
  getLeadsExportUrl,
  mergeLeadsApi,
  updateLeadApi,
} from "@/lib/leads-api";
import { convertLeadToClient } from "@/lib/clients-api";
import type { DuplicateLeadGroup, Lead, LeadSource, LeadStatus } from "@/lib/leads";
import {
  computeLeadScore,
  getLeadScoreTier,
  LEAD_SCORE_TIER_LABELS,
  LEAD_SCORE_TIER_STYLES,
} from "@/lib/lead-scoring";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { LeadActivityTimeline } from "@/components/admin/LeadActivityTimeline";
import { LeadEmailComposer } from "@/components/admin/LeadEmailComposer";
import { MailLinkedThreadsSection } from "@/components/admin/MailLinkedThreadsSection";
import { ThreeCxLinkedEventsSection } from "@/components/admin/ThreeCxLinkedEventsSection";
import { getLeadPresentationMeta } from "@/lib/presentation-lead-meta";
import { PRESENTATION_LOCATION_LABELS } from "@/lib/presentation-slides";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  GitMerge,
  GripVertical,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

const PAGE_SIZE = 50;

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type SortMode = "date" | "score";

export function CrmLeadsView() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q")?.trim() ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("score");

  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [budgetMin, setBudgetMin] = useState("");

  const assignees = useCrmAssignees();

  useEffect(() => {
    const assignee = searchParams.get("assignee")?.trim();
    if (assignee) setAssigneeFilter(decodeURIComponent(assignee));
  }, [searchParams]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchLeadsPaginated({
        page,
        pageSize: PAGE_SIZE,
        q: urlQuery || undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        assignee:
          assigneeFilter === "all"
            ? undefined
            : assigneeFilter === "__unassigned__"
              ? "__unassigned__"
              : assigneeFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
      });
      setLeads(result.leads);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les leads.");
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, urlQuery, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo, budgetMin]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const loadDuplicateCount = useCallback(async () => {
    try {
      const groups = await fetchDuplicateLeadGroups();
      setDuplicateCount(groups.length);
    } catch {
      setDuplicateCount(0);
    }
  }, []);

  useEffect(() => {
    void loadDuplicateCount();
  }, [loadDuplicateCount, leads.length]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
    const status = searchParams.get("status");
    if (status && status in LEAD_STATUS_LABELS) {
      setStatusFilter(status as LeadStatus);
    }
    const source = searchParams.get("source");
    if (source && source in LEAD_SOURCE_LABELS) {
      setSourceFilter(source as LeadSource);
    }
  }, [searchParams]);

  const createDefaults = useMemo(
    () => ({
      name: searchParams.get("name")?.trim() ?? "",
      phone: searchParams.get("phone")?.trim() ?? "",
      source:
        searchParams.get("source") && searchParams.get("source")! in LEAD_SOURCE_LABELS
          ? (searchParams.get("source") as LeadSource)
          : ("manual" as LeadSource),
    }),
    [searchParams],
  );

  useEffect(() => {
    const id = searchParams.get("id")?.trim();
    if (!id) return;
    const fromList = leads.find((l) => l.id === id);
    if (fromList) {
      setSelected(fromList);
      return;
    }
    let cancelled = false;
    void fetch(`/api/admin/leads/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as { lead?: Lead };
        if (!cancelled && json.lead) setSelected(json.lead);
      })
      .catch(() => {
        /* ignore deep-link errors */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, leads]);

  useEffect(() => {
    setPage(1);
  }, [urlQuery, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo, budgetMin]);

  const sortedLeads = useMemo(() => {
    const copy = [...leads];
    if (sortMode === "score") {
      copy.sort((a, b) => computeLeadScore(b) - computeLeadScore(a));
    }
    return copy;
  }, [leads, sortMode]);

  const exportFilters = useMemo(
    () => ({
      q: urlQuery || undefined,
      source: sourceFilter !== "all" ? sourceFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      assignee:
        assigneeFilter === "all"
          ? undefined
          : assigneeFilter === "__unassigned__"
            ? "__unassigned__"
            : assigneeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
    }),
    [urlQuery, sourceFilter, statusFilter, assigneeFilter, dateFrom, dateTo, budgetMin],
  );

  const hasActiveFilters =
    sourceFilter !== "all" ||
    statusFilter !== "all" ||
    assigneeFilter !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    !!budgetMin;

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    setSaving(true);
    try {
      const updated = await updateLeadApi(lead.id, { status });
      setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      setActivityRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer le lead",
      message: "Supprimer ce lead définitivement ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteLeadApi(id);
      setLeads((prev) => prev.filter((item) => item.id !== id));
      setSelected(null);
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnColumn(targetStatus: LeadStatus, leadId: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;
    await handleStatusChange(lead, targetStatus);
  }

  function clearFilters() {
    setSourceFilter("all");
    setStatusFilter("all");
    setAssigneeFilter("all");
    setDateFrom("");
    setDateTo("");
    setBudgetMin("");
  }

  const pipelineLeads = sortedLeads.filter((lead) => lead.status !== "lost");
  const lostLeads = sortedLeads.filter((lead) => lead.status === "lost");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Prospects synchronisés depuis les formulaires{" "}
          <strong className="text-foreground">Contact</strong> et{" "}
          <strong className="text-foreground">Devis en ligne</strong>. Glisser-déposer entre colonnes.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={getLeadsExportUrl("csv", exportFilters)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </a>
          <a
            href={getLeadsExportUrl("pdf", exportFilters)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF
          </a>
          <button
            type="button"
            onClick={() => setShowDuplicates(true)}
            className="relative inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <GitMerge className="h-4 w-4" aria-hidden />
            Doublons
            {duplicateCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {duplicateCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => void loadLeads()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau lead
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Source
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as LeadSource | "all")}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="all">Toutes</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Statut
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Commercial
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              <option value="__unassigned__">Non assignés</option>
              {assignees.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Depuis le
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Jusqu&apos;au
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Valeur min. (FCFA)
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="Ex. 500000"
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Tri
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="score">Score (priorité)</option>
              <option value="date">Date récente</option>
            </select>
          </label>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs font-semibold text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {urlQuery && (
        <p className="rounded-xl border border-primary/20 bg-primary-light/20 px-4 py-2 text-sm text-gray-text">
          Recherche « <strong className="text-foreground">{urlQuery}</strong> » —{" "}
          {total} résultat(s).{" "}
          <Link href="/admin/crm/leads" className="font-medium text-primary hover:underline">
            Effacer
          </Link>
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des leads…
        </div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {LEAD_PIPELINE_COLUMNS.map(({ status, title }) => {
              const columnLeads = pipelineLeads.filter((lead) => lead.status === status);
              return (
                <KanbanDropColumn
                  key={status}
                  columnId={status}
                  isDropTarget={dragOverColumn === status}
                  dragMime={KANBAN_DRAG_MIME.lead}
                  onDrop={(leadId) => void handleDropOnColumn(status, leadId)}
                  onDragOverChange={(id) => setDragOverColumn(id as LeadStatus | null)}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                      {columnLeads.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        dragging={draggingId === lead.id}
                        onOpen={() => setSelected(lead)}
                        onStatusChange={(next) => void handleStatusChange(lead, next)}
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        disabled={saving}
                      />
                    ))}
                    {columnLeads.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs text-gray-text">
                        {dragOverColumn === status ? "Déposer ici" : "Aucun lead"}
                      </p>
                    )}
                  </div>
                </KanbanDropColumn>
              );
            })}
          </div>

          {lostLeads.length > 0 && (
            <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-gray-text">PERDUS ({lostLeads.length})</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {lostLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={() => setSelected(lead)}
                    onStatusChange={(next) => void handleStatusChange(lead, next)}
                    disabled={saving}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray/40 bg-white px-4 py-3 text-sm">
              <p className="text-gray-text">
                Page {page} / {totalPages} — {total} lead(s)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-1.5 disabled:opacity-40"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <LeadDetailPanel
          lead={selected}
          saving={saving}
          activityRefreshKey={activityRefreshKey}
          onClose={() => setSelected(null)}
          onStatusChange={(status) => void handleStatusChange(selected, status)}
          onAssigneeChange={async (assignee) => {
            const updated = await updateLeadApi(selected.id, { assignee });
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            setSelected(updated);
            setActivityRefreshKey((k) => k + 1);
          }}
          onDelete={() => void handleDelete(selected.id)}
          onEmailSent={() => setActivityRefreshKey((k) => k + 1)}
        />
      )}

      {showCreate && (
        <CreateLeadModal
          defaults={createDefaults}
          onClose={() => setShowCreate(false)}
          onCreated={(lead) => {
            void loadLeads();
            setShowCreate(false);
            setSelected(lead);
          }}
        />
      )}

      {showDuplicates && (
        <LeadDuplicatesModal
          onClose={() => setShowDuplicates(false)}
          onMerged={() => {
            void loadLeads();
            void loadDuplicateCount();
          }}
        />
      )}
    </div>
  );
}

function LeadScoreBadge({ lead }: { lead: Lead }) {
  const score = computeLeadScore(lead);
  const tier = getLeadScoreTier(score);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        LEAD_SCORE_TIER_STYLES[tier],
      )}
      title={LEAD_SCORE_TIER_LABELS[tier]}
    >
      {score}
    </span>
  );
}

function LeadCard({
  lead,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  disabled,
  compact = false,
  dragging,
}: {
  lead: Lead;
  onOpen: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled: boolean;
  compact?: boolean;
  dragging?: boolean;
}) {
  return (
    <article
      draggable={!compact}
      onDragStart={(e) => {
        e.dataTransfer.setData(KANBAN_DRAG_MIME.lead, lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-xl border border-gray/40 bg-white p-3 shadow-sm",
        dragging && "opacity-50 ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-1">
        {!compact && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-gray-text/40" aria-hidden />
        )}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-foreground">{lead.name}</p>
            <LeadScoreBadge lead={lead} />
          </div>
          <p className="mt-0.5 text-xs text-gray-text">{lead.company || lead.email}</p>
          {lead.assignee && (
            <p className="mt-1 text-[10px] font-medium text-primary">{lead.assignee}</p>
          )}
          {!compact && (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-primary">{formatLeadValue(lead.estimatedValue)}</span>
              <span className="text-gray-text">{LEAD_SOURCE_LABELS[lead.source]}</span>
            </div>
          )}
          <p className="mt-1 text-[10px] text-gray-text">{formatLeadDate(lead.createdAt)}</p>
        </button>
      </div>
      <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-text">
        Statut
        <select
          value={lead.status}
          disabled={disabled}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
          className="mt-1 w-full rounded-lg border border-gray/50 px-2 py-1.5 text-xs"
          aria-label={`Statut de ${lead.name}`}
        >
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

function LeadDetailPanel({
  lead,
  saving,
  activityRefreshKey,
  onClose,
  onStatusChange,
  onAssigneeChange,
  onDelete,
  onEmailSent,
}: {
  lead: Lead;
  saving: boolean;
  activityRefreshKey: number;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onAssigneeChange: (assignee: string | null) => void;
  onDelete: () => void;
  onEmailSent: () => void;
}) {
  const assignees = useCrmAssignees();
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const score = computeLeadScore(lead);
  const tier = getLeadScoreTier(score);
  const presentationMeta = getLeadPresentationMeta(lead);

  async function handleConvert() {
    setConverting(true);
    try {
      await convertLeadToClient(lead.id);
      setConverted(true);
    } catch {
      /* ignore — auto-conversion may have already run */
    } finally {
      setConverting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
        <div className="flex h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
            <div>
              <h2 className="font-bold text-foreground">{lead.name}</h2>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                  LEAD_SCORE_TIER_STYLES[tier],
                )}
              >
                Score {score} — {LEAD_SCORE_TIER_LABELS[tier]}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-text hover:bg-gray-light"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <DetailRow label="Email" value={lead.email} />
            {lead.phone && (
              <DetailRow label="Téléphone" value={lead.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            )}
            {lead.company && <DetailRow label="Entreprise" value={lead.company} />}
            <DetailRow label="Source" value={LEAD_SOURCE_LABELS[lead.source]} />
            {presentationMeta && (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Session tablette
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-text">Parcours</dt>
                    <dd className="font-medium text-foreground">
                      {presentationMeta.track === "salon" ? "Salon" : "Bureau"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-text">Lieu</dt>
                    <dd className="text-right font-medium text-foreground">
                      {PRESENTATION_LOCATION_LABELS[presentationMeta.location]}
                      {presentationMeta.locationNote ? ` — ${presentationMeta.locationNote}` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-text">Présentateur</dt>
                    <dd className="font-medium text-foreground">{presentationMeta.presenterName}</dd>
                  </div>
                  {presentationMeta.clientSector && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-text">Secteur</dt>
                      <dd className="font-medium text-foreground">{presentationMeta.clientSector}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-text">Slides vues</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-foreground">
                      {presentationMeta.slidesCompleted.join(", ")}
                    </dd>
                  </div>
                  {presentationMeta.presenterNotes && (
                    <div>
                      <dt className="text-gray-text">Notes présentateur</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                        {presentationMeta.presenterNotes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
            <DetailRow label="Service / projet" value={lead.service ?? "—"} />
            <DetailRow label="Budget" value={lead.budget ?? "—"} />
            <DetailRow label="Délai" value={lead.timeline ?? "—"} />
            <DetailRow label="Valeur estimée" value={formatLeadValue(lead.estimatedValue)} />
            <DetailRow label="Reçu le" value={formatLeadDate(lead.createdAt)} />
            {lead.message && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Message</p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-light/70 p-3 text-foreground">
                  {lead.message}
                </p>
              </div>
            )}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
              <select
                value={lead.status}
                disabled={saving}
                onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
              >
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Commercial assigné</span>
              <select
                value={lead.assignee ?? ""}
                disabled={saving}
                onChange={(e) => onAssigneeChange(e.target.value || null)}
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
              >
                <option value="">Non assigné</option>
                {assignees.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </label>
            {(lead.status === "signed" || converted) && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-800">Client signé</p>
                {converted ? (
                  <Link
                    href="/admin/crm/clients"
                    className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Voir la fiche client →
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={converting || saving}
                    onClick={() => void handleConvert()}
                    className="mt-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    {converting ? "Conversion…" : "Convertir en client"}
                  </button>
                )}
              </div>
            )}

            <LeadActivityTimeline leadId={lead.id} refreshKey={activityRefreshKey} />

            <MailLinkedThreadsSection leadId={lead.id} />
            <ThreeCxLinkedEventsSection leadId={lead.id} />
          </div>
          <div className="flex gap-2 border-t border-gray/40 px-5 py-4">
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email
            </button>
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center justify-center rounded-xl border border-gray/60 px-3 py-2.5 text-xs text-gray-text hover:bg-gray-light"
              title="Ouvrir dans le client mail"
            >
              mailto
            </a>
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              aria-label="Supprimer le lead"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {showEmail && (
        <LeadEmailComposer
          leadId={lead.id}
          leadName={lead.name}
          leadEmail={lead.email}
          onClose={() => setShowEmail(false)}
          onSent={onEmailSent}
        />
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}

function LeadDuplicatesModal({
  onClose,
  onMerged,
}: {
  onClose: () => void;
  onMerged: () => void;
}) {
  const { confirm } = useDialog();
  const [groups, setGroups] = useState<DuplicateLeadGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchDuplicateLeadGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleMerge(sourceId: string, targetId: string) {
    const ok = await confirm({
      title: "Fusionner les leads",
      message:
        "Fusionner ces leads ? Le lead source sera supprimé et son historique rattaché au lead conservé.",
      confirmLabel: "Fusionner",
      variant: "danger",
    });
    if (!ok) return;
    setMerging(sourceId);
    setError("");
    try {
      await mergeLeadsApi(sourceId, targetId);
      const next = await fetchDuplicateLeadGroups();
      setGroups(next);
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fusion impossible.");
    } finally {
      setMerging(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <GitMerge className="h-5 w-5 text-primary" aria-hidden />
              Fusion de doublons
            </h2>
            <p className="text-sm text-gray-text">Email ou téléphone identiques</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Analyse en cours…
            </p>
          ) : groups.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Aucun doublon détecté.
            </p>
          ) : (
            <ul className="space-y-4">
              {groups.map((group) => (
                <li key={`${group.reason}-${group.key}`} className="rounded-xl border border-gray/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-text">
                    {group.reason === "email" ? "Email identique" : "Téléphone identique"} — {group.key}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {group.leads.map((lead) => (
                      <li
                        key={lead.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-light/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">{lead.name}</p>
                          <p className="text-xs text-gray-text">
                            {lead.email} · {LEAD_SOURCE_LABELS[lead.source]} · {LEAD_STATUS_LABELS[lead.status]}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.leads
                            .filter((other) => other.id !== lead.id)
                            .map((other) => (
                              <button
                                key={other.id}
                                type="button"
                                disabled={merging !== null}
                                onClick={() => void handleMerge(lead.id, other.id)}
                                className="rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary-light disabled:opacity-50"
                              >
                                {merging === lead.id ? "Fusion…" : `Fusionner → ${other.name}`}
                              </button>
                            ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function CreateLeadModal({
  defaults,
  onClose,
  onCreated,
}: {
  defaults?: { name?: string; phone?: string; source?: LeadSource };
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const source = defaults?.source ?? "manual";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    try {
      const lead = await createLeadApi({
        name: String(data.get("name")),
        email: String(data.get("email")),
        phone: String(data.get("phone") || "") || null,
        company: String(data.get("company") || "") || null,
        source,
        service: String(data.get("service") || "") || null,
        message: String(data.get("message") || "") || null,
        estimatedValue: data.get("estimatedValue")
          ? Number(data.get("estimatedValue"))
          : null,
      });
      onCreated(lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Nouveau lead</h2>
          <button type="button" onClick={onClose} aria-label="Fermer la fenêtre">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>
        {source === "call_3cx" ? (
          <p className="mb-3 text-xs text-gray-text">
            Prérempli depuis un appel 3CX — complète au minimum un email valide.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            defaultValue={defaults?.name || undefined}
            placeholder="Nom *"
            className={fieldClass}
          />
          <input name="email" type="email" required placeholder="Email *" className={fieldClass} />
          <input
            name="phone"
            defaultValue={defaults?.phone || undefined}
            placeholder="Téléphone"
            className={fieldClass}
          />
          <input name="company" placeholder="Entreprise" className={fieldClass} />
          <input name="service" placeholder="Service / projet" className={`${fieldClass} sm:col-span-2`} />
          <input name="estimatedValue" type="number" min={0} placeholder="Valeur estimée (FCFA)" className={fieldClass} />
        </div>
        <textarea
          name="message"
          rows={3}
          placeholder="Notes"
          className={`${fieldClass} mt-3`}
        />
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
