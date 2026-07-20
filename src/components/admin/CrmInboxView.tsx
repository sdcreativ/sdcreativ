"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { InboxItem } from "@/lib/inbox";
import {
  fetchInboxItems,
  markAllInboxReadApi,
  markInboxReadApi,
} from "@/lib/operations-api";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, Mail, MessageSquare, Target, CheckSquare } from "lucide-react";

const TYPE_LABELS: Record<InboxItem["type"], string> = {
  ticket: "Ticket",
  lead_activity: "Lead",
  portal_message: "Portail",
  task_comment: "Tâche",
  mail_thread: "Email",
};

const TYPE_ICONS: Record<InboxItem["type"], typeof Inbox> = {
  ticket: Inbox,
  lead_activity: Target,
  portal_message: MessageSquare,
  task_comment: CheckSquare,
  mail_thread: Mail,
};

export function CrmInboxView() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchInboxItems({
        type: typeFilter || undefined,
        unreadOnly: filter === "unread",
      });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'inbox.");
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOpen(item: InboxItem) {
    if (item.read) return;
    setActionError("");
    try {
      await markInboxReadApi(item.key);
      setItems((prev) =>
        prev.map((i) => (i.key === item.key ? { ...i, read: true } : i)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de marquer comme lu.");
    }
  }

  async function handleMarkAll() {
    const keys = items.filter((i) => !i.read).map((i) => i.key);
    if (keys.length === 0) return;
    setActionError("");
    try {
      await markAllInboxReadApi(keys);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Impossible de tout marquer comme lu.");
    }
  }

  const emptyMessage =
    filter === "unread" || typeFilter
      ? "Aucun élément ne correspond à ces filtres."
      : "Votre inbox est vide — tickets, emails, leads et messages portail apparaîtront ici.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Inbox className="h-5 w-5 text-primary" aria-hidden />
            Inbox unifiée
          </h2>
          <p className="text-sm text-gray-text">
            Tickets, emails messagerie, leads, portail et tâches — {unreadCount} non lu(s).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAll()}
          disabled={unreadCount === 0}
          className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Tout marquer lu
        </button>
      </div>

      {(error || actionError) && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error || actionError}
          {error && (
            <button
              type="button"
              onClick={() => void load()}
              className="ml-3 font-semibold underline"
            >
              Réessayer
            </button>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              filter === f ? "bg-primary text-white" : "bg-gray/30 text-gray-text",
            )}
          >
            {f === "all" ? "Tous" : "Non lus"}
          </button>
        ))}
        <select
          className="rounded-lg border border-gray/60 px-3 py-1.5 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/40 bg-white px-6 py-14 text-center shadow-sm">
          <Inbox className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-semibold text-foreground">Inbox vide</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-text">{emptyMessage}</p>
          {(filter !== "all" || typeFilter) && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setTypeFilter("");
              }}
              className="mt-6 text-sm font-semibold text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => void handleOpen(item)}
                className={cn(
                  "flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:border-primary/40",
                  !item.read && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="rounded-xl bg-gray/30 p-2.5">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-gray-text">
                      {TYPE_LABELS[item.type]}
                    </span>
                    {!item.read && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 truncate text-sm text-gray-text">{item.preview}</p>
                  <p className="mt-2 text-xs text-gray-text">
                    {item.clientName && `${item.clientName} · `}
                    {new Date(item.createdAt).toLocaleString("fr-FR")}
                    {item.assigneeName && ` · ${item.assigneeName}`}
                  </p>
                </div>
                <MessageSquare className="h-4 w-4 shrink-0 text-gray-text/50" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
