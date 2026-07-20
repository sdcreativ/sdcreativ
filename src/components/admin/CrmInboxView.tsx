"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { InboxItem } from "@/lib/inbox";
import {
  fetchInboxItems,
  markAllInboxReadApi,
  markInboxReadApi,
} from "@/lib/operations-api";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Target,
} from "lucide-react";

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

function formatInboxWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Hier";
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "autre";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Autres";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Aujourd’hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Hier";
  }
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

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

  const groups = useMemo(() => {
    const map = new Map<string, InboxItem[]>();
    for (const item of items) {
      const key = dayKey(item.createdAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, groupItems]) => ({
      key,
      label: dayLabel(groupItems[0]!.createdAt),
      items: groupItems,
    }));
  }, [items]);

  const emptyMessage =
    filter === "unread" || typeFilter
      ? "Aucun élément ne correspond à ces filtres."
      : "Tickets, emails, leads et messages portail apparaîtront ici.";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray/30 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Inbox</h2>
            {unreadCount > 0 && (
              <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-text">
            Flux unifié — messagerie, tickets, leads et portail
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAll()}
          disabled={unreadCount === 0}
          className="text-sm font-medium text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:text-gray-text/40"
        >
          Tout marquer comme lu
        </button>
      </div>

      {(error || actionError) && (
        <p className="rounded-lg border border-accent/25 bg-accent/5 px-3.5 py-2.5 text-sm text-accent">
          {error || actionError}
          {error && (
            <button
              type="button"
              onClick={() => void load()}
              className="ml-2 font-semibold underline underline-offset-2"
            >
              Réessayer
            </button>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg bg-gray/20 p-0.5"
          role="tablist"
          aria-label="Filtre lecture"
        >
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                filter === f
                  ? "bg-white text-foreground shadow-sm"
                  : "text-gray-text hover:text-foreground",
              )}
            >
              {f === "all" ? "Tous" : "Non lus"}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="inbox-type-filter">
          Type
        </label>
        <select
          id="inbox-type-filter"
          className="rounded-lg border-0 bg-transparent py-1.5 pl-2 pr-8 text-sm text-gray-text focus:outline-none focus:ring-2 focus:ring-primary/20"
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
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary/70" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray/20">
            <Inbox className="h-5 w-5 text-gray-text/50" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Rien pour le moment</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-text">{emptyMessage}</p>
          {(filter !== "all" || typeFilter) && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setTypeFilter("");
              }}
              className="mt-5 text-sm font-medium text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-text/70">
                {group.label}
              </h3>
              <ul className="divide-y divide-gray/25 border-y border-gray/25">
                {group.items.map((item) => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={() => void handleOpen(item)}
                        className={cn(
                          "group relative flex items-start gap-3 py-3 pl-3 pr-2 transition-colors hover:bg-primary/[0.03]",
                          !item.read && "bg-primary/[0.02]",
                        )}
                      >
                        {!item.read && (
                          <span
                            className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            item.read ? "bg-gray/15 text-gray-text" : "bg-primary/10 text-primary",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p
                              className={cn(
                                "min-w-0 flex-1 truncate text-[15px] leading-snug text-foreground",
                                !item.read ? "font-semibold" : "font-medium",
                              )}
                            >
                              {item.title}
                            </p>
                            <time
                              dateTime={item.createdAt}
                              className="shrink-0 text-[11px] tabular-nums text-gray-text/80"
                            >
                              {formatInboxWhen(item.createdAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 truncate text-[13px] leading-snug text-gray-text">
                            {item.preview}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-text/75">
                            <span className="font-medium uppercase tracking-wide">
                              {TYPE_LABELS[item.type]}
                            </span>
                            {item.clientName && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{item.clientName}</span>
                              </>
                            )}
                            {item.assigneeName && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{item.assigneeName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          className="mt-1.5 h-4 w-4 shrink-0 text-gray-text/0 transition group-hover:text-gray-text/50"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
