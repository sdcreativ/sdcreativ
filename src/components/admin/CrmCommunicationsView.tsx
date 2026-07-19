"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Loader2, Phone, ExternalLink } from "lucide-react";
import {
  fetchCommunications,
  fetchThreeCxWebClientUrl,
} from "@/lib/communications-api";
import { CrmCommunicationsStatsPanel } from "@/components/admin/CrmCommunicationsStatsPanel";
import type { CommunicationListItem } from "@/lib/communications";
import type { CommunicationChannel } from "@/lib/threecx/journal";
import { cn } from "@/lib/utils";
import { hasCrmPermission } from "@/lib/crm-access";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";

const CHANNELS: Array<{ id: CommunicationChannel | "all"; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "call", label: "Appels" },
  { id: "chat", label: "Chats" },
  { id: "meeting", label: "Réunions" },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function entityHref(item: CommunicationListItem): string | null {
  if (item.clientId) return `/admin/crm/clients?id=${item.clientId}`;
  if (item.leadId) return `/admin/crm/leads?id=${item.leadId}`;
  return null;
}

function entityLabel(item: CommunicationListItem): string {
  return item.clientName || item.leadName || "Sans fiche";
}

export function CrmCommunicationsView() {
  const { permissions } = useCrmPermissions();
  const canStats = hasCrmPermission(permissions, ["reports.view", "communications.read"]);
  const [channel, setChannel] = useState<CommunicationChannel | "all">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CommunicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [webClientUrl, setWebClientUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetchThreeCxWebClientUrl().then(setWebClientUrl);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCommunications({
        channel,
        q: q.trim() || undefined,
        page,
        pageSize: 20,
      });
      setItems(data.items);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [channel, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {canStats ? <CrmCommunicationsStatsPanel /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Communications 3CX</h2>
          <p className="mt-1 text-sm text-gray-text">
            Historique des chats et appels journalisés. Réunions équipe : WebMeeting dans le
            Web Client 3CX.
          </p>
        </div>
        {webClientUrl ? (
          <a
            href={webClientUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Ouvrir Web Client 3CX
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        ) : (
          <p className="text-xs text-gray-text">
            Configurez <code className="text-[11px]">THREE_CX_PBX_FQDN</code> pour le lien Web
            Client.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setChannel(c.id);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                channel === c.id
                  ? "bg-primary text-white"
                  : "border border-gray/50 bg-white text-gray-text hover:border-primary/40",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher (résumé, agent, fiche…)"
          className="w-full rounded-xl border border-gray/50 bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/50 bg-white px-6 py-12 text-center">
          <Headphones className="mx-auto h-8 w-8 text-gray-text" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Aucune communication</p>
          <p className="mt-1 text-sm text-gray-text">
            Les événements apparaissent après journalisation 3CX (template PRO) ou création manuelle
            via l’API.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const href = entityHref(item);
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                        {item.channel === "call" ? (
                          <Phone className="h-3 w-3" aria-hidden />
                        ) : (
                          <Headphones className="h-3 w-3" aria-hidden />
                        )}
                        {item.channel}
                      </span>
                      <span className="text-xs text-gray-text">{item.direction}</span>
                      {item.agentExtension ? (
                        <span className="rounded-full border border-gray/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                          Ext. {item.agentExtension}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {item.summary || "Sans résumé"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-text">
                      <span>{formatWhen(item.startedAt ?? item.createdAt)}</span>
                      <span>Durée {formatDuration(item.durationSec)}</span>
                      {href ? (
                        <Link
                          href={href}
                          className="font-semibold text-primary hover:underline"
                        >
                          {entityLabel(item)} →
                        </Link>
                      ) : (
                        <span>{entityLabel(item)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-gray-text">
            {total} résultat{total > 1 ? "s" : ""} — page {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray/50 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray/50 px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
