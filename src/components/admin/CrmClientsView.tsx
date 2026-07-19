"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CLIENT_SECTORS,
  CLIENT_STATUS_LABELS,
  INTERACTION_TYPE_LABELS,
  formatClientDate,
  formatClientRevenue,
  type ClientStatus,
} from "@/content/clients-labels";
import {
  addClientInteractionApi,
  createCrmClient,
  deleteCrmClient,
  fetchClientInteractions,
  fetchClientOverview,
  fetchClientsPaginated,
  fetchCrmClientById,
  fetchDuplicateClientGroups,
  getClientsExportUrl,
  mergeClientsApi,
  updateCrmClient,
  type ClientListFilters,
} from "@/lib/clients-api";
import type { Client, ClientInteraction, ClientOverview, DuplicateClientGroup } from "@/lib/clients";
import { ClientPortalAccessPanel } from "@/components/admin/ClientPortalAccessPanel";
import { MailLinkedThreadsSection } from "@/components/admin/MailLinkedThreadsSection";
import { ThreeCxLinkedEventsSection } from "@/components/admin/ThreeCxLinkedEventsSection";
import { useCrmAssignees } from "@/hooks/useCrmTeamMembers";
import { PROJECT_STATUS_LABELS } from "@/content/projects-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";
import { TICKET_STATUS_LABELS } from "@/content/tickets-labels";
import { TASK_STATUS_LABELS } from "@/content/tasks-labels";
import { fetchDocuments } from "@/lib/documents-api";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { CrmPagination } from "@/components/admin/CrmPagination";
import {
  CheckSquare,
  FileText,
  FolderKanban,
  LifeBuoy,
  Download,
  GitMerge,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const statusStyles: Record<ClientStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  prospect: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-light text-gray-text",
};

export function CrmClientsView() {
  const searchParams = useSearchParams();
  const assignees = useCrmAssignees();
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 50;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [accountManagerFilter, setAccountManagerFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [revenueMin, setRevenueMin] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const listFilters = useMemo((): ClientListFilters => ({
    q: search.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    accountManager:
      accountManagerFilter === "all"
        ? undefined
        : accountManagerFilter === "__unassigned__"
          ? "__unassigned__"
          : accountManagerFilter,
    sector: sectorFilter !== "all" ? sectorFilter : undefined,
    tag: tagFilter.trim() || undefined,
    revenueMin: revenueMin ? Number(revenueMin) : undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [search, statusFilter, accountManagerFilter, sectorFilter, tagFilter, revenueMin, page]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const client of clients) {
      for (const tag of client.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [clients]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchClientsPaginated(listFilters);
      setClients(result.clients);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les clients.");
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listFilters]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, accountManagerFilter, sectorFilter, tagFilter, revenueMin]);

  const loadDuplicateCount = useCallback(async () => {
    try {
      const groups = await fetchDuplicateClientGroups();
      setDuplicateCount(groups.length);
    } catch {
      setDuplicateCount(0);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadDuplicateCount();
  }, [loadDuplicateCount, clients.length]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setShowCreate(true);
  }, [searchParams]);

  useEffect(() => {
    const id = searchParams.get("id")?.trim();
    if (!id) return;
    const fromList = clients.find((c) => c.id === id);
    if (fromList) {
      setSelected(fromList);
      return;
    }
    let cancelled = false;
    void fetchCrmClientById(id)
      .then((client) => {
        if (!cancelled) setSelected(client);
      })
      .catch(() => {
        /* ignore deep-link errors */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, clients]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    accountManagerFilter !== "all" ||
    sectorFilter !== "all" ||
    !!tagFilter.trim() ||
    !!revenueMin;

  function clearFilters() {
    setStatusFilter("all");
    setAccountManagerFilter("all");
    setSectorFilter("all");
    setTagFilter("");
    setRevenueMin("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-text">
          Fiches clients actifs — coordonnées, historique et accès espace client.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={getClientsExportUrl(listFilters)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
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
            onClick={() => void loadClients()}
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
            Nouveau client
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, entreprise, tag…"
              className={`${fieldClass} pl-9`}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Statut
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClientStatus | "all")}
              className="mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Account manager
            <select
              value={accountManagerFilter}
              onChange={(e) => setAccountManagerFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              <option value="__unassigned__">Non assignés</option>
              {assignees.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Secteur
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous</option>
              {CLIENT_SECTORS.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Tag
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            CA min. (FCFA)
            <input
              type="number"
              min={0}
              value={revenueMin}
              onChange={(e) => setRevenueMin(e.target.value)}
              placeholder="Ex. 1000000"
              className="mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des clients…
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <User className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun client</p>
          <p className="mt-1 text-sm text-gray-text">
            Convertissez un lead signé depuis{" "}
            <Link href="/admin/crm/leads" className="text-primary hover:underline">
              Leads
            </Link>{" "}
            ou créez une fiche manuellement.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} onOpen={() => setSelected(client)} />
            ))}
          </div>
          <CrmPagination
            page={page}
            totalPages={totalPages}
            total={total}
            label="client(s)"
            onPageChange={setPage}
          />
        </>
      )}

      {selected && (
        <ClientDetailPanel
          client={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelected(updated);
          }}
          onDeleted={() => {
            setClients((prev) => prev.filter((c) => c.id !== selected.id));
            setSelected(null);
          }}
        />
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(client) => {
            setClients((prev) => [client, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {showDuplicates && (
        <ClientDuplicatesModal
          onClose={() => setShowDuplicates(false)}
          onMerged={() => {
            void loadClients();
            void loadDuplicateCount();
          }}
        />
      )}
    </div>
  );
}

function ClientCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  return (
    <article className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-foreground">{client.company || client.name}</h3>
          <p className="truncate text-sm text-gray-text">{client.name}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", statusStyles[client.status])}>
          {CLIENT_STATUS_LABELS[client.status]}
        </span>
      </div>
      <p className="mt-3 truncate text-sm text-gray-text">{client.email}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {client.sector && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
            {client.sector}
          </span>
        )}
        {client.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-medium text-gray-text">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-text">
        <span>{formatClientRevenue(client.revenueTotal)}</span>
        <span>{client.interactionCount} échange(s)</span>
        {client.accountManager && (
          <span className="font-medium text-primary">{client.accountManager}</span>
        )}
        {client.portalClientId && (
          <span className="rounded-full bg-primary-light px-2 py-0.5 font-medium text-primary">
            Espace client
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 w-full rounded-xl border border-gray/60 py-2 text-sm font-medium text-foreground hover:bg-gray-light"
      >
        Voir la fiche
      </button>
    </article>
  );
}

function ClientDetailPanel({
  client,
  onClose,
  onUpdated,
  onDeleted,
}: {
  client: Client;
  onClose: () => void;
  onUpdated: (client: Client) => void;
  onDeleted: () => void;
}) {
  const { confirm } = useDialog();
  const assignees = useCrmAssignees();
  const [interactions, setInteractions] = useState<ClientInteraction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [tagsInput, setTagsInput] = useState(client.tags.join(", "));

  useEffect(() => {
    setTagsInput(client.tags.join(", "));
  }, [client.id, client.tags]);

  const loadInteractions = useCallback(async () => {
    setLoadingInteractions(true);
    try {
      const data = await fetchClientInteractions(client.id);
      setInteractions(data);
    } finally {
      setLoadingInteractions(false);
    }
  }, [client.id]);

  useEffect(() => {
    void loadInteractions();
  }, [loadInteractions]);

  async function handleStatusChange(status: ClientStatus) {
    setSaving(true);
    try {
      const updated = await updateCrmClient(client.id, { status });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAccountManagerChange(accountManager: string | null) {
    setSaving(true);
    try {
      const updated = await updateCrmClient(client.id, { accountManager });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleSectorChange(sector: string | null) {
    setSaving(true);
    try {
      const updated = await updateCrmClient(client.id, { sector: sector || null });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTags() {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
    setSaving(true);
    try {
      const updated = await updateCrmClient(client.id, { tags });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addClientInteractionApi(client.id, { type: "note", content: note.trim() });
      setNote("");
      await loadInteractions();
      onUpdated({ ...client, interactionCount: client.interactionCount + 1 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer le client",
      message: "Supprimer ce client et tout son historique ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteCrmClient(client.id);
      onDeleted();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
          <div>
            <h2 className="font-bold text-foreground">{client.company || client.name}</h2>
            <p className="text-sm text-gray-text">{client.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-light" aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Statut</span>
            <select
              value={client.status}
              disabled={saving}
              onChange={(e) => void handleStatusChange(e.target.value as ClientStatus)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Account manager</span>
            <select
              value={client.accountManager ?? ""}
              disabled={saving}
              onChange={(e) => void handleAccountManagerChange(e.target.value || null)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              <option value="">Non assigné</option>
              {assignees.map((member) => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Secteur</span>
            <select
              value={client.sector ?? ""}
              disabled={saving}
              onChange={(e) => void handleSectorChange(e.target.value || null)}
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
            >
              <option value="">Non renseigné</option>
              {CLIENT_SECTORS.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Tags (séparés par des virgules)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={saving}
                placeholder="VIP, BTP, récurrent…"
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveTags()}
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                OK
              </button>
            </div>
            {client.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-medium text-gray-text">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <DetailRow label="CA encaissé" value={formatClientRevenue(client.revenueTotal)} />

          <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} href={`mailto:${client.email}`} />
          {client.phone && <DetailRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={client.phone} href={`tel:${client.phone}`} />}
          {client.address && <DetailRow label="Adresse" value={client.address} />}
          <ClientPortalAccessPanel client={client} onUpdated={onUpdated} />
          {client.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Notes</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-light/70 p-3">{client.notes}</p>
            </div>
          )}

          <ClientOverviewSection client={client} />

          <MailLinkedThreadsSection clientId={client.id} />
          <ThreeCxLinkedEventsSection clientId={client.id} />

          <div>
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
              Historique des échanges
            </h3>
            {loadingInteractions ? (
              <p className="mt-3 flex items-center gap-2 text-gray-text">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Chargement…
              </p>
            ) : interactions.length === 0 ? (
              <p className="mt-3 text-gray-text">Aucun échange enregistré.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {interactions.map((item) => (
                  <li key={item.id} className="rounded-xl border border-gray/30 bg-gray-light/50 p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-gray-text">
                      <span className="font-semibold text-primary">
                        {INTERACTION_TYPE_LABELS[item.type]}
                      </span>
                      <span>{formatClientDate(item.createdAt)}</span>
                    </div>
                    {item.subject && <p className="mt-1 font-medium text-foreground">{item.subject}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{item.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleAddNote} className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Ajouter une note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className={fieldClass}
              placeholder="Compte-rendu d'appel, email, réunion…"
            />
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Enregistrer
            </button>
          </form>
        </div>

        <div className="flex gap-2 border-t border-gray/40 px-5 py-4">
          <Link
            href={
              client.portalClientId
                ? `/admin/crm/documents?client=${encodeURIComponent(client.portalClientId)}`
                : "/admin/crm/documents"
            }
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light"
          >
            Documents
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleDelete()}
            aria-label="Supprimer le client"
            className="inline-flex items-center justify-center rounded-xl border border-accent/30 px-4 py-2.5 text-accent hover:bg-accent/5"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientOverviewSection({ client }: { client: Client }) {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      fetchClientOverview(client.id),
      client.portalClientId
        ? fetchDocuments(client.portalClientId).then((docs) => docs.length)
        : Promise.resolve(0),
    ])
      .then(([data, count]) => {
        setOverview(data);
        setDocCount(count);
      })
      .catch(() => {
        setOverview(null);
        setDocCount(null);
      })
      .finally(() => setLoading(false));
  }, [client.id, client.portalClientId]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement vue 360°…
      </p>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary-light/10 p-4">
      <h3 className="font-bold text-foreground">Vue 360° client</h3>

      <OverviewBlock
        icon={FolderKanban}
        title="Projets"
        empty="Aucun projet"
        href="/admin/crm/projets"
        count={overview.projects.length}
      >
        {overview.projects.map((p) => (
          <li key={p.id} className="text-sm">
            <span className="font-medium text-foreground">{p.name}</span>
            <span className="ml-2 text-xs text-gray-text">
              {PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] ?? p.status} · {p.progress}%
            </span>
          </li>
        ))}
      </OverviewBlock>

      <OverviewBlock
        icon={FileText}
        title="Devis"
        empty="Aucun devis"
        href="/admin/crm/devis"
        count={overview.quotes.length}
      >
        {overview.quotes.map((q) => (
          <li key={q.id} className="text-sm">
            <span className="font-medium text-foreground">{q.reference}</span>
            <span className="ml-2 text-xs text-gray-text">
              {q.projectLabel} · {QUOTE_STATUS_LABELS[q.status as keyof typeof QUOTE_STATUS_LABELS] ?? q.status}
            </span>
          </li>
        ))}
      </OverviewBlock>

      <OverviewBlock
        icon={LifeBuoy}
        title="Tickets"
        empty="Aucun ticket"
        href="/admin/crm/tickets"
        count={overview.tickets.length}
      >
        {overview.tickets.map((t) => (
          <li key={t.id} className="text-sm">
            <span className="font-medium text-foreground">{t.reference}</span>
            <span className="ml-2 text-xs text-gray-text">
              {t.subject} · {TICKET_STATUS_LABELS[t.status as keyof typeof TICKET_STATUS_LABELS] ?? t.status}
            </span>
          </li>
        ))}
      </OverviewBlock>

      <OverviewBlock
        icon={CheckSquare}
        title="Tâches ouvertes"
        empty="Aucune tâche en cours"
        href="/admin/crm/taches"
        count={overview.tasks.length}
      >
        {overview.tasks.map((t) => (
          <li key={t.id} className="text-sm">
            <span className="font-medium text-foreground">{t.title}</span>
            <span className="ml-2 text-xs text-gray-text">
              {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS] ?? t.status}
              {t.dueDate ? ` · ${t.dueDate}` : ""}
            </span>
          </li>
        ))}
      </OverviewBlock>

      {client.portalClientId && docCount !== null && (
        <Link
          href={`/admin/crm/documents?client=${encodeURIComponent(client.portalClientId)}`}
          className="flex items-center justify-between rounded-xl border border-gray/30 bg-white px-3 py-2.5 text-sm hover:bg-gray-light/50"
        >
          <span className="font-medium text-foreground">Documents S3</span>
          <span className="text-xs font-semibold text-primary">{docCount} fichier(s)</span>
        </Link>
      )}
    </div>
  );
}

function OverviewBlock({
  icon: Icon,
  title,
  empty,
  href,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  empty: string;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray/25 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-text">
          <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {title}
          <span className="rounded-full bg-gray-light px-1.5 py-0.5 text-[10px] text-foreground">
            {count}
          </span>
        </h4>
        <Link href={href} className="text-[10px] font-semibold text-primary hover:underline">
          Voir tout →
        </Link>
      </div>
      {count === 0 ? (
        <p className="text-xs text-gray-text">{empty}</p>
      ) : (
        <ul className="space-y-1.5">{children}</ul>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <span className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
      {icon}
      {value}
    </span>
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      {href ? (
        <a href={href} className="hover:text-primary">{content}</a>
      ) : (
        content
      )}
    </div>
  );
}

function CreateClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
  const assignees = useCrmAssignees();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    try {
      const client = await createCrmClient({
        name: String(data.get("name")),
        email: String(data.get("email")),
        phone: String(data.get("phone") || "") || null,
        company: String(data.get("company") || "") || null,
        address: String(data.get("address") || "") || null,
        portalClientId: String(data.get("portalClientId") || "") || null,
        status: String(data.get("status") || "active"),
        accountManager: String(data.get("accountManager") || "") || null,
        sector: String(data.get("sector") || "") || null,
        tags: String(data.get("tags") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: String(data.get("notes") || "") || null,
      });
      onCreated(client);
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
          <h2 className="text-lg font-bold text-foreground">Nouveau client</h2>
          <button type="button" onClick={onClose} aria-label="Fermer la fenêtre">
            <X className="h-5 w-5 text-gray-text" aria-hidden />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Nom *" className={fieldClass} />
          <input name="email" type="email" required placeholder="Email *" className={fieldClass} />
          <input name="phone" placeholder="Téléphone" className={fieldClass} />
          <input name="company" placeholder="Entreprise" className={fieldClass} />
          <input name="portalClientId" placeholder="ID espace client (slug)" className={`${fieldClass} sm:col-span-2`} />
          <select name="status" defaultValue="active" className={fieldClass} aria-label="Statut">
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="accountManager" defaultValue="" className={fieldClass} aria-label="Account manager">
            <option value="">Account manager</option>
            {assignees.map((member) => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
          <select name="sector" defaultValue="" className={fieldClass} aria-label="Secteur">
            <option value="">Secteur</option>
            {CLIENT_SECTORS.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
          <input name="tags" placeholder="Tags (VIP, BTP…)" className={`${fieldClass} sm:col-span-2`} />
        </div>
        <textarea name="address" placeholder="Adresse" rows={2} className={`${fieldClass} mt-3`} />
        <textarea name="notes" placeholder="Notes internes" rows={3} className={`${fieldClass} mt-3`} />
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}

function ClientDuplicatesModal({
  onClose,
  onMerged,
}: {
  onClose: () => void;
  onMerged: () => void;
}) {
  const { confirm } = useDialog();
  const [groups, setGroups] = useState<DuplicateClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchDuplicateClientGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleMerge(sourceId: string, targetId: string) {
    const ok = await confirm({
      title: "Fusionner les fiches",
      message:
        "Fusionner ces fiches ? La fiche source sera supprimée et ses données rattachées à la fiche conservée.",
      confirmLabel: "Fusionner",
      variant: "danger",
    });
    if (!ok) return;
    setMerging(sourceId);
    setError("");
    try {
      await mergeClientsApi(sourceId, targetId);
      const next = await fetchDuplicateClientGroups();
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
            <p className="text-sm text-gray-text">Email ou entreprise identiques</p>
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
                    {group.reason === "email" ? "Email identique" : "Entreprise identique"} — {group.key}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {group.clients.map((client) => (
                      <li
                        key={client.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-light/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-foreground">{client.company || client.name}</p>
                          <p className="text-xs text-gray-text">{client.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.clients
                            .filter((other) => other.id !== client.id)
                            .map((other) => (
                              <button
                                key={other.id}
                                type="button"
                                disabled={merging !== null}
                                onClick={() => void handleMerge(client.id, other.id)}
                                className="rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary-light disabled:opacity-50"
                              >
                                {merging === client.id ? "Fusion…" : `Fusionner → ${other.company || other.name}`}
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
