"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getBudgetLabel,
  getTimelineLabel,
} from "@/content/contact-options";
import {
  QUOTE_PIPELINE_COLUMNS,
  QUOTE_STATUS_LABELS,
  formatQuoteAmount,
  formatQuoteDate,
  statusStyles,
  type QuoteStatus,
} from "@/content/quotes-labels";
import type { Quote } from "@/lib/quotes";
import {
  createQuoteApi,
  deleteQuoteApi,
  fetchQuoteDocuments,
  fetchQuoteSignatureProof,
  fetchQuoteStats,
  fetchQuoteTimeline,
  fetchQuotes,
  getQuotePdfUrl,
  publishQuoteApi,
  updateQuoteApi,
  validateQuoteApi,
  generateInvoiceFromQuoteApi,
  type QuoteListFilters,
} from "@/lib/quotes-api";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Client } from "@/lib/clients";
import { QuoteEmailComposer } from "@/components/admin/QuoteEmailComposer";
import {
  getComposerSubtotal,
  getQuoteLinesFromComposer,
  QuoteComposerFields,
} from "@/components/admin/QuoteComposerFields";
import { createComposerLine } from "@/lib/quote-composer";
import type { QuoteComposerLine } from "@/lib/quote-composer";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type { LegalEntity } from "@/lib/legal-entities";
import { fetchLegalEntities } from "@/lib/legal-entities-api";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  Download,
  FileText,
  GripVertical,
  Loader2,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmQuotesView() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, accepted: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Quote | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<QuoteStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [amountMin, setAmountMin] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const listFilters = useMemo((): QuoteListFilters => ({
    q: search.trim() || undefined,
    clientId: clientFilter !== "all" ? clientFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    amountMin: amountMin ? Number(amountMin) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [search, clientFilter, statusFilter, amountMin, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [quotesData, statsData, clientList] = await Promise.all([
        fetchQuotes(listFilters),
        fetchQuoteStats(),
        fetchCrmClients(),
      ]);
      setQuotes(quotesData);
      setStats(statsData);
      setClients(clientList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les devis.");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [listFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refParam = searchParams.get("ref");
    const idParam = searchParams.get("id");
    if (!refParam && !idParam) return;

    const match = quotes.find(
      (q) => (idParam && q.id === idParam) || (refParam && q.reference === refParam),
    );
    if (match) setSelected(match);
  }, [searchParams, quotes]);

  useEffect(() => {
    const status = searchParams.get("status");
    const quoteStatuses = QUOTE_PIPELINE_COLUMNS.map((c) => c.status);
    if (status && quoteStatuses.includes(status as QuoteStatus)) {
      setStatusFilter(status as QuoteStatus);
    }
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const hasActiveFilters =
    clientFilter !== "all" ||
    statusFilter !== "all" ||
    !!amountMin ||
    !!dateFrom ||
    !!dateTo ||
    !!search.trim();

  function clearFilters() {
    setSearch("");
    setClientFilter("all");
    setStatusFilter("all");
    setAmountMin("");
    setDateFrom("");
    setDateTo("");
  }

  async function handleStatusChange(quote: Quote, status: QuoteStatus) {
    setSaving(true);
    try {
      const updated = await updateQuoteApi(quote.id, {
        status,
        followUpAt: status === "follow_up" ? new Date().toISOString() : undefined,
      });
      setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      const statsData = await fetchQuoteStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnColumn(targetStatus: QuoteStatus, quoteId: string) {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote || quote.status === targetStatus) return;
    await handleStatusChange(quote, targetStatus);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer le devis",
      message: "Supprimer ce devis ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteQuoteApi(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setSelected(null);
      const statsData = await fetchQuoteStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  const pipelineQuotes = quotes.filter(
    (q) => q.status !== "rejected" && q.status !== "expired" && q.status !== "draft",
  );
  const archivedQuotes = quotes.filter(
    (q) => q.status === "rejected" || q.status === "expired" || q.status === "draft",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Historique des devis du configurateur en ligne, création manuelle, relances et suivi de conversion.
        </p>
        <div className="flex gap-2">
          <Link
            href="/admin/crm/catalogue"
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            Catalogue
          </Link>
          <button
            type="button"
            onClick={() => void load()}
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
            Nouveau devis
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Recherche
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Réf., nom, projet…"
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Client
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Statut
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "all")}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Montant min. (FCFA)
            <input
              type="number"
              min={0}
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              placeholder="Ex. 500000"
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Période
            <div className="mt-1 flex gap-1">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-gray/60 px-2 py-2 text-xs" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-gray/60 px-2 py-2 text-xs" />
            </div>
          </label>
        </div>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-primary hover:underline">
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Devis total" value={String(stats.total)} />
        <StatCard label="Acceptés" value={String(stats.accepted)} />
        <StatCard
          label="Taux de conversion"
          value={`${stats.conversionRate} %`}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden />}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des devis…
        </div>
      ) : quotes.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <FileText className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun devis</p>
          <p className="mt-1 text-sm text-gray-text">
            Les demandes via le{" "}
            <Link href="/devis" className="text-primary hover:underline">
              configurateur en ligne
            </Link>{" "}
            apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {QUOTE_PIPELINE_COLUMNS.map(({ status, title }) => {
              const column = pipelineQuotes.filter((q) => q.status === status);
              return (
                <KanbanDropColumn
                  key={status}
                  columnId={status}
                  isDropTarget={dragOverColumn === status}
                  dragMime={KANBAN_DRAG_MIME.quote}
                  onDrop={(quoteId) => void handleDropOnColumn(status, quoteId)}
                  onDragOverChange={(id) => setDragOverColumn(id as QuoteStatus | null)}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">
                      {column.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.map((quote) => (
                      <QuoteCard
                        key={quote.id}
                        quote={quote}
                        dragging={draggingId === quote.id}
                        onOpen={() => setSelected(quote)}
                        onStatusChange={(next) => void handleStatusChange(quote, next)}
                        onDragStart={() => setDraggingId(quote.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        disabled={saving}
                      />
                    ))}
                    {column.length === 0 && (
                      <p className="px-1 py-6 text-center text-xs text-gray-text">
                        {dragOverColumn === status ? "Déposer ici" : "Aucun devis"}
                      </p>
                    )}
                  </div>
                </KanbanDropColumn>
              );
            })}
          </div>

          {archivedQuotes.length > 0 && (
            <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-gray-text">
                BROUILLONS / REFUSÉS / EXPIRÉS ({archivedQuotes.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {archivedQuotes.map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    onOpen={() => setSelected(quote)}
                    onStatusChange={(next) => void handleStatusChange(quote, next)}
                    disabled={saving}
                    compact
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <QuoteDetailPanel
          quote={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
            setSelected(updated);
          }}
          onDelete={() => void handleDelete(selected.id)}
        />
      )}

      {showCreate && (
        <CreateQuoteModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onCreated={(quote) => {
            void load();
            setShowCreate(false);
            setSelected(quote);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
        {value}
        {icon}
      </p>
    </div>
  );
}

function QuoteCard({
  quote,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  disabled,
  compact,
  dragging,
}: {
  quote: Quote;
  onOpen: () => void;
  onStatusChange: (status: QuoteStatus) => void;
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
        e.dataTransfer.setData(KANBAN_DRAG_MIME.quote, quote.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-xl border border-gray/40 bg-white p-3 shadow-sm transition-shadow hover:shadow-md",
        compact && "p-2.5",
        dragging && "opacity-50 ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-1">
        {!compact && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-gray-text/40" aria-hidden />
        )}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold text-primary">{quote.reference}</p>
            <h3 className="truncate text-sm font-bold text-foreground">{quote.name}</h3>
          </div>
        </div>
        <p className="mt-1 truncate text-xs text-gray-text">{quote.projectLabel}</p>
        <p className="mt-2 text-sm font-bold text-primary">{formatQuoteAmount(quote.subtotal)}</p>
        <p className="mt-1 text-[10px] text-gray-text">{formatQuoteDate(quote.createdAt)}</p>
        </button>
      </div>
      {!compact && (
        <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-text">
          Statut
          <select
            value={quote.status}
            disabled={disabled}
            onChange={(e) => onStatusChange(e.target.value as QuoteStatus)}
            className="mt-1 w-full rounded-lg border border-gray/50 px-2 py-1.5 text-xs"
            aria-label={`Statut de ${quote.reference}`}
          >
            {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}

const PUBLISHABLE_STATUSES: QuoteStatus[] = ["draft", "sent", "follow_up", "negotiation"];

function QuoteDetailPanel({
  quote,
  saving,
  onClose,
  onUpdated,
  onDelete,
}: {
  quote: Quote;
  saving: boolean;
  onClose: () => void;
  onUpdated: (quote: Quote) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [showEmail, setShowEmail] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [validating, setValidating] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");
  const [timeline, setTimeline] = useState<
    Array<{ id: string; summary: string; createdAt: string; actorName: string | null }>
  >([]);
  const [documents, setDocuments] = useState<
    Array<{ id: string; fileName: string; kind: string; downloadUrl: string | null; createdAt: string }>
  >([]);
  const [signatureProof, setSignatureProof] = useState<{
    signerName: string;
    signerEmail: string;
    signedAt: string;
    otpVerifiedAt: string | null;
    signatureHash: string;
    documentSha256: string | null;
    provider: string;
    ipAddress: string | null;
  } | null>(null);

  const canPublish = PUBLISHABLE_STATUSES.includes(quote.status);

  const loadBillingMeta = useCallback(async () => {
    try {
      const [timelineData, documentsData] = await Promise.all([
        fetchQuoteTimeline(quote.id),
        fetchQuoteDocuments(quote.id),
      ]);
      setTimeline(timelineData.events);
      setDocuments(documentsData.documents);
    } catch {
      setTimeline([]);
      setDocuments([]);
    }
    if (quote.status === "signed" || quote.status === "accepted" || quote.status === "validated" || quote.status === "invoiced") {
      try {
        const { proof } = await fetchQuoteSignatureProof(quote.id);
        setSignatureProof(proof);
      } catch {
        setSignatureProof(null);
      }
    } else {
      setSignatureProof(null);
    }
  }, [quote.id, quote.status]);

  useEffect(() => {
    void loadBillingMeta();
  }, [loadBillingMeta]);

  async function handlePublish() {
    setPublishing(true);
    setPublishError("");
    setPublishMessage("");
    try {
      const result = await publishQuoteApi(quote.id, { sendEmail: true });
      onUpdated(result.quote);
      setPublishMessage(
        result.emailSent
          ? "Devis publié, archivé sur S3 et envoyé par email."
          : "Devis publié et archivé sur S3 (email non envoyé).",
      );
      await loadBillingMeta();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleValidate() {
    setValidating(true);
    setInvoiceError("");
    try {
      const result = await validateQuoteApi(quote.id);
      onUpdated(result.quote);
      if (result.invoice) {
        setPublishMessage(
          result.invoiceGenerated
            ? result.emailSent
              ? `Devis validé — facture ${result.invoice.reference} générée, archivée et envoyée au client.`
              : `Devis validé — facture ${result.invoice.reference} générée et archivée (email non envoyé).`
            : `Devis validé — facture ${result.invoice.reference} déjà existante.`,
        );
      } else {
        setPublishMessage("Devis validé.");
      }
      await loadBillingMeta();
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Validation impossible.");
    } finally {
      setValidating(false);
    }
  }

  async function handleGenerateInvoice() {
    setCreatingInvoice(true);
    setInvoiceError("");
    try {
      const result = await generateInvoiceFromQuoteApi(quote.id, { sendEmail: true });
      onUpdated(result.quote);
      setPublishMessage(
        result.alreadyExists
          ? `Facture ${result.invoice.reference} déjà existante pour ce devis.`
          : result.emailSent
            ? `Facture ${result.invoice.reference} générée, archivée et envoyée au client.`
            : `Facture ${result.invoice.reference} générée et archivée (email non envoyé).`,
      );
      await loadBillingMeta();
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Génération de facture impossible.");
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function handleStatusChange(status: QuoteStatus) {
    const updated = await updateQuoteApi(quote.id, {
      status,
      followUpAt: status === "follow_up" ? new Date().toISOString() : undefined,
    });
    onUpdated(updated);
  }

  async function handleSaveNotes() {
    const updated = await updateQuoteApi(quote.id, { notes: notes.trim() || null });
    onUpdated(updated);
  }

  const rangeLabel =
    quote.estimateMin != null && quote.estimateMax != null
      ? `${formatQuoteAmount(quote.estimateMin).replace(" HT", "")} – ${formatQuoteAmount(quote.estimateMax)}`
      : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
          <div>
            <p className="font-mono text-xs font-semibold text-primary">{quote.reference}</p>
            <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", statusStyles[quote.status])}>
              {QUOTE_STATUS_LABELS[quote.status]}
            </span>
            <h2 className="mt-2 font-bold text-foreground">{quote.name}</h2>
            {quote.company && <p className="text-sm text-gray-text">{quote.company}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
            <select
              value={quote.status}
              disabled={saving}
              onChange={(e) => void handleStatusChange(e.target.value as QuoteStatus)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Projet</p>
            <p className="mt-1 font-medium text-foreground">{quote.projectLabel}</p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary-light/30 p-4">
            <p className="text-2xl font-bold text-primary">{formatQuoteAmount(quote.subtotal)}</p>
            {rangeLabel && <p className="mt-1 text-xs text-gray-text">Fourchette : {rangeLabel}</p>}
          </div>

          {quote.lines.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Détail</p>
              <ul className="mt-2 space-y-1 rounded-xl bg-gray-light/60 p-3">
                {quote.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-gray-text">{line.label}</span>
                    <span className="font-medium">{formatQuoteAmount(line.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Budget client</dt>
              <dd className="mt-0.5 font-medium">
                {quote.budget ? getBudgetLabel(quote.budget) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Délai souhaité</dt>
              <dd className="mt-0.5 font-medium">
                {quote.timeline ? getTimelineLabel(quote.timeline) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Envoyé le</dt>
              <dd className="mt-0.5 font-medium">{formatQuoteDate(quote.sentAt ?? quote.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Validité</dt>
              <dd className="mt-0.5 font-medium">{formatQuoteDate(quote.validUntil)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-text">Relance</dt>
              <dd className="mt-0.5 font-medium">{formatQuoteDate(quote.followUpAt)}</dd>
            </div>
          </dl>

          {(publishMessage || publishError) && (
            <p
              className={cn(
                "rounded-xl px-3 py-2 text-xs",
                publishError ? "border border-accent/30 bg-accent/5 text-accent" : "border border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
            >
              {publishError || publishMessage}
            </p>
          )}

          {canPublish && (
            <button
              type="button"
              disabled={saving || publishing}
              onClick={() => void handlePublish()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              Publier le devis (PDF S3 + email + portail)
            </button>
          )}

          {documents.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Documents archivés</p>
              <ul className="mt-2 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="text-[10px] text-gray-text">{doc.kind} · {formatQuoteDate(doc.createdAt)}</p>
                    </div>
                    {doc.downloadUrl ? (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Télécharger
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {timeline.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Historique</p>
              <ul className="mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
                {timeline.map((event) => (
                  <li key={event.id} className="text-xs">
                    <p className="font-medium text-foreground">{event.summary}</p>
                    <p className="text-gray-text">
                      {formatQuoteDate(event.createdAt)}
                      {event.actorName ? ` · ${event.actorName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {signatureProof && (
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Preuve signature SD CREATIV
              </p>
              <dl className="mt-2 space-y-1.5 text-xs text-foreground">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-text">Signataire</dt>
                  <dd className="font-medium text-right">
                    {signatureProof.signerName}
                    <span className="block text-[10px] font-normal text-gray-text">
                      {signatureProof.signerEmail}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-text">Signé le</dt>
                  <dd>{formatQuoteDate(signatureProof.signedAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-text">OTP email</dt>
                  <dd>
                    {signatureProof.otpVerifiedAt
                      ? `Vérifié · ${formatQuoteDate(signatureProof.otpVerifiedAt)}`
                      : "Non enregistré (legacy)"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-text">Fournisseur</dt>
                  <dd className="font-medium">{signatureProof.provider}</dd>
                </div>
                {signatureProof.ipAddress && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-text">IP</dt>
                    <dd className="font-mono text-[10px]">{signatureProof.ipAddress}</dd>
                  </div>
                )}
                {signatureProof.documentSha256 && (
                  <div>
                    <dt className="text-gray-text">Empreinte PDF (SHA-256)</dt>
                    <dd className="mt-0.5 break-all font-mono text-[10px] text-gray-text">
                      {signatureProof.documentSha256}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-text">Hash preuve</dt>
                  <dd className="mt-0.5 break-all font-mono text-[10px] text-gray-text">
                    {signatureProof.signatureHash}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {quote.message && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Message client</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-light/70 p-3">{quote.message}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
              placeholder="Relance effectuée, négociation en cours…"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveNotes()}
              className="mt-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Enregistrer les notes
            </button>
          </div>
        </div>

        {(quote.status === "signed" || quote.status === "accepted") && (
          <div className="border-t border-gray/40 px-5 py-3">
            {invoiceError && (
              <p className="mb-2 text-xs text-accent">{invoiceError}</p>
            )}
            <button
              type="button"
              disabled={saving || validating}
              onClick={() => void handleValidate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden />
              )}
              Valider et émettre la facture
            </button>
          </div>
        )}

        {(quote.status === "accepted" || quote.status === "validated") && (
          <div className="border-t border-gray/40 px-5 py-3">
            {invoiceError && (
              <p className="mb-2 text-xs text-accent">{invoiceError}</p>
            )}
            <p className="mb-2 text-xs text-gray-text">
              {quote.status === "validated"
                ? "La génération automatique a échoué — émettez la facture manuellement."
                : "Devis accepté sans validation — émettez la facture manuellement."}
            </p>
            <button
              type="button"
              disabled={saving || creatingInvoice}
              onClick={() => void handleGenerateInvoice()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {creatingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Receipt className="h-4 w-4" aria-hidden />
              )}
              Générer la facture
            </button>
          </div>
        )}

        {quote.status === "invoiced" && (
          <div className="border-t border-gray/40 px-5 py-3">
            <Link
              href="/admin/crm/factures"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
            >
              <Receipt className="h-4 w-4" aria-hidden />
              Voir les factures CRM
            </Link>
          </div>
        )}

        <div className="flex gap-2 border-t border-gray/40 px-5 py-4">
          <a
            href={getQuotePdfUrl(quote.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF
          </a>
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email
          </button>
          {quote.leadId && (
            <Link
              href="/admin/crm/leads"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light"
            >
              Voir le lead
            </Link>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            aria-label="Supprimer le devis"
            className="inline-flex items-center justify-center rounded-xl border border-accent/30 px-4 py-2.5 text-accent hover:bg-accent/5"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      </div>

      {showEmail && (
        <QuoteEmailComposer
          quoteId={quote.id}
          quoteReference={quote.reference}
          quoteEmail={quote.email}
          quoteName={quote.name}
          quoteAmount={quote.subtotal}
          onClose={() => setShowEmail(false)}
          onSent={() => {
            if (quote.status === "draft") void handleStatusChange("sent");
          }}
        />
      )}
    </>
  );
}

function CreateQuoteModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: Client[];
  onClose: () => void;
  onCreated: (quote: Quote) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [composerLines, setComposerLines] = useState<QuoteComposerLine[]>([createComposerLine()]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);

  useEffect(() => {
    void fetchLegalEntities()
      .then(setLegalEntities)
      .catch(() => setLegalEntities([]));
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const subtotal = getComposerSubtotal(composerLines);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const quoteLines = getQuoteLinesFromComposer(composerLines);

    if (quoteLines.length === 0) {
      setError("Ajoutez au moins une ligne avec un montant.");
      setLoading(false);
      return;
    }

    try {
      const quote = await createQuoteApi({
        name: String(data.get("name") || selectedClient?.name || ""),
        email: String(data.get("email") || selectedClient?.email || ""),
        phone: String(data.get("phone") || selectedClient?.phone || "") || null,
        company: String(data.get("company") || selectedClient?.company || "") || null,
        clientId: selectedClientId || null,
        projectLabel: String(data.get("projectLabel")),
        lines: quoteLines,
        subtotal,
        status: String(data.get("status") || "sent"),
        notes: String(data.get("notes") || "") || null,
        currency: String(data.get("currency") || "XOF"),
        legalEntityId: String(data.get("legalEntityId") || "") || null,
      });
      onCreated(quote);
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
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nouveau devis</h2>
            <p className="text-sm text-gray-text">Composez le devis à partir du catalogue ou de lignes libres.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <label className="mb-4 block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Client existant (optionnel)
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
            >
              <option value="">Saisie manuelle</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name} — {client.email}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              defaultValue={selectedClient?.name}
              placeholder="Nom du contact *"
              className={fieldClass}
              key={`name-${selectedClientId}`}
            />
            <input
              name="email"
              type="email"
              required
              defaultValue={selectedClient?.email}
              placeholder="Email *"
              className={fieldClass}
              key={`email-${selectedClientId}`}
            />
            <input
              name="phone"
              defaultValue={selectedClient?.phone ?? ""}
              placeholder="Téléphone"
              className={fieldClass}
              key={`phone-${selectedClientId}`}
            />
            <input
              name="company"
              defaultValue={selectedClient?.company ?? ""}
              placeholder="Entreprise"
              className={fieldClass}
              key={`company-${selectedClientId}`}
            />
            <input
              name="projectLabel"
              required
              placeholder="Intitulé du projet *"
              className={`${fieldClass} sm:col-span-2`}
            />
            <select name="status" defaultValue="sent" className={fieldClass} aria-label="Statut initial">
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
            </select>
            <select name="currency" defaultValue="XOF" className={fieldClass} aria-label="Devise">
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </select>
            {legalEntities.length > 0 && (
              <select name="legalEntityId" className={`${fieldClass} sm:col-span-2`} aria-label="Entité juridique">
                <option value="">Entité par défaut</option>
                {legalEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({CURRENCY_LABELS[entity.currency]})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-5">
            <QuoteComposerFields lines={composerLines} onChange={setComposerLines} />
          </div>

          <textarea
            name="notes"
            placeholder="Notes internes"
            rows={2}
            className={`${fieldClass} mt-4`}
          />
          {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        </div>

        <div className="border-t border-gray/40 px-6 py-4">
          <button
            type="submit"
            disabled={loading || subtotal <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Créer le devis — {formatQuoteAmount(subtotal)} HT
          </button>
        </div>
      </form>
    </div>
  );
}
