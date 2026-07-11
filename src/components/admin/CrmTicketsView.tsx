"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PIPELINE_COLUMNS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  formatTicketDate,
  isSlaBreached,
  priorityStyles,
  SLA_HOURS,
  statusStyles,
  type TicketPriority,
  type TicketStatus,
} from "@/content/tickets-labels";
import {
  TICKET_RESPONSE_TEMPLATES,
  applyTicketTemplate,
} from "@/content/ticket-response-templates";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Client } from "@/lib/clients";
import type { Ticket, TicketMessage } from "@/lib/tickets";
import type { TicketListFilters } from "@/lib/tickets";
import {
  addTicketMessageApi,
  createTicketApi,
  deleteTicketApi,
  fetchTicketMessages,
  fetchTicketStats,
  fetchTickets,
  updateTicketApi,
} from "@/lib/tickets-api";
import { cn } from "@/lib/utils";
import { KanbanDropColumn, KANBAN_DRAG_MIME } from "@/lib/kanban-dnd";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import {
  AlertTriangle,
  Clock,
  FileText,
  GripVertical,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmTicketsView() {
  const searchParams = useSearchParams();
  const teamAssignees = useCrmAssignees();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, slaBreached: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState<"all" | "breached" | "ok">("all");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);

  const listFilters = useMemo((): TicketListFilters => ({
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    clientId: clientFilter !== "all" ? clientFilter : undefined,
    assignee: assigneeFilter !== "all" ? assigneeFilter : undefined,
    slaBreached: slaFilter === "breached" ? true : slaFilter === "ok" ? false : undefined,
  }), [priorityFilter, clientFilter, assigneeFilter, slaFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, statsData, clientsData] = await Promise.all([
        fetchTickets(listFilters),
        fetchTicketStats(),
        fetchCrmClients(),
      ]);
      setTickets(data);
      setStats(statsData);
      setClients(clientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [listFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || tickets.length === 0) return;
    const match = tickets.find((t) => t.reference === ref);
    if (match) setSelected(match);
  }, [searchParams, tickets]);

  async function handleStatusChange(ticket: Ticket, status: TicketStatus) {
    setSaving(true);
    try {
      const updated = await updateTicketApi(ticket.id, { status });
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      setStats(await fetchTicketStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDropOnColumn(targetStatus: TicketStatus, ticketId: string) {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === targetStatus) return;
    await handleStatusChange(ticket, targetStatus);
  }

  const pipeline = tickets.filter((t) => t.status !== "closed");
  const closed = tickets.filter((t) => t.status === "closed");

  const assigneeOptions = useMemo(() => {
    const set = new Set(teamAssignees);
    for (const ticket of tickets) {
      if (ticket.assignee) set.add(ticket.assignee);
    }
    return [...set].sort();
  }, [teamAssignees, tickets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Tickets ouverts depuis l&apos;espace client — SLA et réponses centralisées. Glisser-déposer entre colonnes.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" aria-hidden />
            Nouveau ticket
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total actifs" value={stats.open + stats.inProgress} />
        <StatCard label="Ouverts" value={stats.open} />
        <StatCard label="En traitement" value={stats.inProgress} />
        <StatCard label="SLA dépassé" value={stats.slaBreached} alert={stats.slaBreached > 0} />
        <StatCard label="Résolus" value={stats.resolved} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mr-2 font-medium text-gray-text">Priorité</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "all")}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Toutes</option>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 font-medium text-gray-text">Client</span>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 font-medium text-gray-text">Assigné</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Toute l&apos;équipe</option>
            <option value="__unassigned__">Non assigné</option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 font-medium text-gray-text">SLA</span>
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as "all" | "breached" | "ok")}
            className="rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="breached">Dépassé</option>
            <option value="ok">Dans les délais</option>
          </select>
        </label>
      </div>

      {error && <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <LifeBuoy className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun ticket</p>
          <p className="mt-1 text-sm text-gray-text">Les demandes de l&apos;espace client apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {TICKET_PIPELINE_COLUMNS.map(({ status, title }) => {
              const column = pipeline.filter((t) => t.status === status);
              return (
                <KanbanDropColumn
                  key={status}
                  columnId={status}
                  isDropTarget={dragOverColumn === status}
                  dragMime={KANBAN_DRAG_MIME.ticket}
                  onDrop={(ticketId) => void handleDropOnColumn(status, ticketId)}
                  onDragOverChange={(id) => setDragOverColumn(id as TicketStatus | null)}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold tracking-wide text-gray-text">{title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">{column.length}</span>
                  </div>
                  <div className="space-y-2">
                    {column.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        dragging={draggingId === ticket.id}
                        onOpen={() => setSelected(ticket)}
                        onStatusChange={(s) => void handleStatusChange(ticket, s)}
                        onDragStart={() => setDraggingId(ticket.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverColumn(null);
                        }}
                        disabled={saving}
                      />
                    ))}
                    {column.length === 0 && (
                      <p className="py-6 text-center text-xs text-gray-text">
                        {dragOverColumn === status ? "Déposer ici" : "Aucun ticket"}
                      </p>
                    )}
                  </div>
                </KanbanDropColumn>
              );
            })}
          </div>
          {closed.length > 0 && (
            <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-gray-text">FERMÉS ({closed.length})</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} onOpen={() => setSelected(ticket)} onStatusChange={(s) => void handleStatusChange(ticket, s)} disabled={saving} compact />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <TicketDetailPanel
          ticket={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelected(updated);
          }}
          onDelete={async () => {
            await deleteTicketApi(selected.id);
            setTickets((prev) => prev.filter((t) => t.id !== selected.id));
            setSelected(null);
            setStats(await fetchTicketStats());
          }}
        />
      )}

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setShowCreate(false);
            void fetchTicketStats().then(setStats);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-gray/40 bg-white p-4 shadow-sm", alert && "border-accent/40 bg-accent/5")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", alert ? "text-accent" : "text-foreground")}>{value}</p>
    </div>
  );
}

function TicketCard({
  ticket,
  onOpen,
  onStatusChange,
  onDragStart,
  onDragEnd,
  disabled,
  compact,
  dragging,
}: {
  ticket: Ticket;
  onOpen: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled: boolean;
  compact?: boolean;
  dragging?: boolean;
}) {
  const slaBreach = isSlaBreached(ticket.slaDueAt, ticket.status);

  return (
    <article
      draggable={!compact}
      onDragStart={(e) => {
        e.dataTransfer.setData(KANBAN_DRAG_MIME.ticket, ticket.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-xl border border-gray/40 bg-white p-3 shadow-sm hover:shadow-md",
        dragging && "opacity-50 ring-2 ring-primary/30",
        compact && "cursor-pointer",
      )}
    >
      <div className="flex items-start gap-1.5">
        {!compact && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-gray-text/40" aria-hidden />
        )}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="font-mono text-[10px] font-semibold text-primary">{ticket.reference}</p>
          <h3 className="truncate text-sm font-bold text-foreground">{ticket.subject}</h3>
          <p className="mt-1 truncate text-xs text-gray-text">{ticket.clientName}</p>
          {ticket.assignee && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-text">
              <User className="h-3 w-3" aria-hidden />
              {ticket.assignee}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", priorityStyles[ticket.priority])}>{TICKET_PRIORITY_LABELS[ticket.priority]}</span>
            {slaBreach && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                <AlertTriangle className="h-3 w-3" aria-hidden />SLA
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1 text-[10px] text-gray-text">
            <MessageSquare className="h-3 w-3" aria-hidden />
            {ticket.messageCount} message(s)
          </p>
        </button>
      </div>
      {!compact && (
        <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-gray-text">
          Statut
          <select
            value={ticket.status}
            disabled={disabled}
            onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
            className="mt-1 w-full rounded-lg border border-gray/50 px-2 py-1.5 text-xs"
            aria-label={`Statut de ${ticket.reference}`}
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      )}
    </article>
  );
}

function TicketDetailPanel({
  ticket,
  saving,
  onClose,
  onUpdated,
  onDelete,
}: {
  ticket: Ticket;
  saving: boolean;
  onClose: () => void;
  onUpdated: (ticket: Ticket) => void;
  onDelete: () => void;
}) {
  const assignees = useCrmAssignees();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);

  const loadMessages = useCallback(async () => {
    setLoadingMsg(true);
    try {
      setMessages(await fetchTicketMessages(ticket.id));
    } finally {
      setLoadingMsg(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { message, ticket: updated } = await addTicketMessageApi(ticket.id, {
        content: reply.trim(),
        authorType: "staff",
        notifyClient,
      });
      setMessages((prev) => [...prev, message]);
      setReply("");
      onUpdated(updated);
    } finally {
      setSending(false);
    }
  }

  function handleApplyTemplate(templateId: string) {
    const template = TICKET_RESPONSE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setReply(
      applyTicketTemplate(template, {
        clientName: ticket.clientName,
        ticketReference: ticket.reference,
        subject: ticket.subject,
      }),
    );
  }

  const slaBreach = isSlaBreached(ticket.slaDueAt, ticket.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray/40 px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-semibold text-primary">{ticket.reference}</p>
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", statusStyles[ticket.status])}>{TICKET_STATUS_LABELS[ticket.status]}</span>
              <h2 className="mt-2 font-bold text-foreground">{ticket.subject}</h2>
              <p className="text-sm text-gray-text">{ticket.clientName} · {ticket.clientEmail}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer"><X className="h-5 w-5" aria-hidden /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={cn("rounded-full px-2 py-0.5 font-bold", priorityStyles[ticket.priority])}>{TICKET_PRIORITY_LABELS[ticket.priority]}</span>
            <span className="rounded-full bg-gray-light px-2 py-0.5 text-gray-text">{TICKET_CATEGORY_LABELS[ticket.category]}</span>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", slaBreach ? "bg-accent/10 font-bold text-accent" : "bg-gray-light text-gray-text")}>
              <Clock className="h-3 w-3" aria-hidden />
              SLA {formatTicketDate(ticket.slaDueAt)} ({SLA_HOURS[ticket.priority]}h)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="mb-4 block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
            <select value={ticket.status} disabled={saving} onChange={(e) => void updateTicketApi(ticket.id, { status: e.target.value }).then(onUpdated)} className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5">
              {Object.entries(TICKET_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>

          <label className="mb-4 block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Assigné à</span>
            <select
              value={ticket.assignee ?? ""}
              disabled={saving}
              onChange={(e) => void updateTicketApi(ticket.id, { assignee: e.target.value || null }).then(onUpdated)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              <option value="">Non assigné</option>
              {assignees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>

          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
            Conversation
          </h3>
          {loadingMsg ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          ) : (
            <ul className="space-y-3">
              {messages.map((msg) => (
                <li key={msg.id} className={cn("rounded-xl p-3 text-sm", msg.authorType === "staff" ? "ml-4 bg-primary-light/50" : "mr-4 bg-gray-light/70")}>
                  <div className="flex justify-between gap-2 text-[11px] text-gray-text">
                    <span className="font-semibold text-foreground">{msg.authorName}</span>
                    <span>{formatTicketDate(msg.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleReply} className="border-t border-gray/40 p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-text">
            <span className="mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Modèle de réponse
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleApplyTemplate(e.target.value);
                e.target.value = "";
              }}
              className={fieldClass}
              aria-label="Insérer un modèle de réponse"
            >
              <option value="">— Choisir un modèle —</option>
              {TICKET_RESPONSE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Réponse au client…" className={fieldClass} />
          <label className="mt-2 flex items-center gap-2 text-xs text-gray-text">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="rounded border-gray/60"
            />
            Notifier le client par email
          </label>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={sending || !reply.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              Envoyer
            </button>
            <button type="button" disabled={saving} onClick={() => void onDelete()} aria-label="Supprimer" className="rounded-xl border border-accent/30 px-4 py-2.5 text-accent">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ticket: Ticket) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const assignees = useCrmAssignees();

  useEffect(() => {
    void fetchCrmClients().then(setClients).catch(() => setClients([]));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const clientId = String(data.get("clientId") || "");
    const client = clients.find((c) => c.id === clientId);

    try {
      const ticket = await createTicketApi({
        subject: String(data.get("subject")),
        category: String(data.get("category")),
        priority: String(data.get("priority")),
        clientId: clientId || null,
        portalClientId: client?.portalClientId ?? null,
        clientName: client?.name ?? String(data.get("clientName")),
        clientEmail: client?.email ?? String(data.get("clientEmail")),
        assignee: String(data.get("assignee") || "") || null,
        initialMessage: String(data.get("message")),
        authorName: "Équipe SD CREATIV",
      });
      onCreated(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Nouveau ticket</h2>
          <button type="button" onClick={onClose} aria-label="Fermer"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        <div className="space-y-3">
          <input name="subject" required placeholder="Sujet *" className={fieldClass} />
          <select name="clientId" className={fieldClass} aria-label="Client CRM">
            <option value="">Client CRM (optionnel)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="category" defaultValue="technical" className={fieldClass} aria-label="Catégorie">
              {Object.entries(TICKET_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="priority" defaultValue="normal" className={fieldClass} aria-label="Priorité">
              {Object.entries(TICKET_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <select name="assignee" defaultValue="" className={fieldClass} aria-label="Assigné à">
            <option value="">Non assigné</option>
            {assignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <textarea name="message" required placeholder="Message initial *" rows={4} className={fieldClass} />
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Créer le ticket
        </button>
      </form>
    </div>
  );
}
