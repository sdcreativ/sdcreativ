"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  DocumentsPanel,
  type DocumentStats,
} from "@/components/documents/DocumentsPanel";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/documents-labels";
import { fetchAdminClients } from "@/lib/documents-api";
import type { DocumentCategory } from "@/lib/s3";
import { cn } from "@/lib/utils";

const emptyStats = (): DocumentStats => ({
  total: 0,
  byCategory: {
    invoices: 0,
    contracts: 0,
    deliverables: 0,
    uploads: 0,
    misc: 0,
    archive: 0,
  },
});

export function CrmDocumentsView() {
  const [clients, setClients] = useState<Array<{ id: string; label: string; company: string }>>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<DocumentStats>(emptyStats());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const list = await fetchAdminClients();
      setClients(list);
      setSelectedClient((current) => {
        if (current && list.some((c) => c.id === current)) return current;
        return list[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les clients.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = clients.filter((client) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      client.label.toLowerCase().includes(q) ||
      client.company.toLowerCase().includes(q) ||
      client.id.toLowerCase().includes(q)
    );
  });

  const selected = clients.find((c) => c.id === selectedClient);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement…
      </div>
    );
  }

  if (error && clients.length === 0) {
    return (
      <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
        {error}
      </p>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-gray/40 bg-white p-10 text-center shadow-sm">
        <Users className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
        <p className="mt-4 font-semibold text-foreground">Aucun client configuré</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-text">
          Créez un client dans le CRM pour publier des documents dans l&apos;espace client.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin/crm/clients"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Gérer les clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-text">
            Publiez factures, contrats et livrables — visibles instantanément dans l&apos;espace client.
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-text">
            <Cloud className="h-3.5 w-3.5" aria-hidden />
            Stockage sécurisé AWS S3
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadClients()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualiser
        </button>
      </div>

      {selectedClient && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          {(
            ["invoices", "contracts", "deliverables", "uploads", "misc"] as DocumentCategory[]
          ).map((cat) => (
            <StatCard
              key={cat}
              label={DOCUMENT_CATEGORY_LABELS[cat] ?? cat}
              value={stats.byCategory[cat] ?? 0}
              muted
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <label className="relative block">
            <span className="sr-only">Rechercher un client</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-xl border border-gray/60 py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <li className="rounded-xl border border-dashed border-gray/40 px-3 py-8 text-center text-xs text-gray-text">
                Aucun client ne correspond à « {search.trim()} ».
              </li>
            ) : (
              filteredClients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(client.id)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      selectedClient === client.id
                        ? "bg-primary-light font-semibold text-primary"
                        : "text-foreground hover:bg-gray-light/70",
                    )}
                  >
                    <span className="block truncate">{client.label}</span>
                    <span className="block truncate font-mono text-[10px] text-gray-text">
                      {client.id}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <div className="min-w-0 space-y-4">
          {selected && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray/40 bg-white px-5 py-4 shadow-sm">
              <div>
                <h2 className="font-bold text-foreground">{selected.label}</h2>
                <p className="text-xs text-gray-text">
                  Espace client : <span className="font-mono">{selected.id}</span>
                </p>
              </div>
              <Link
                href="/espace-client"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 px-3 py-2 text-sm font-medium hover:bg-gray-light"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Aperçu portail
              </Link>
            </div>
          )}

          {selectedClient ? (
            <DocumentsPanel
              key={selectedClient}
              mode="admin"
              clientId={selectedClient}
              onStatsChange={setStats}
            />
          ) : (
            <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
              <p className="mt-4 text-sm text-gray-text">Sélectionnez un client.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray/40 bg-white p-4 shadow-sm",
        muted && "bg-gray-light/30",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
