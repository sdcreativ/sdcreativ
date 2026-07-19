"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Loader2, Phone } from "lucide-react";
import { fetchCommunications } from "@/lib/communications-api";
import type { CommunicationListItem } from "@/lib/communications";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelLabel(channel: string): string {
  if (channel === "call") return "Appel";
  if (channel === "chat") return "Chat";
  if (channel === "meeting") return "Réunion";
  return channel;
}

export function ThreeCxLinkedEventsSection({
  clientId,
  leadId,
}: {
  clientId?: string;
  leadId?: string;
}) {
  const [items, setItems] = useState<CommunicationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCommunications({
        clientId,
        leadId,
        pageSize: 20,
      });
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <Headphones className="h-4 w-4 text-primary" aria-hidden />
        Communications 3CX
      </h3>
      <p className="mt-1 text-xs text-gray-text">
        Chat et appels journalisés depuis 3CX.
      </p>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-text">
          Aucune communication liée. Voir l’historique global dans{" "}
          <Link
            href="/admin/crm/communications"
            className="font-medium text-primary hover:underline"
          >
            Communications
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((ev) => (
            <li key={ev.id}>
              <Link
                href="/admin/crm/communications"
                className={cn(
                  "block rounded-xl border border-gray/30 bg-gray-light/50 px-3 py-2 transition hover:border-primary/40 hover:bg-primary-light/30",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {ev.channel === "call" ? (
                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <Headphones className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    )}
                    {channelLabel(ev.channel)}
                    {ev.agentExtension ? (
                      <span className="font-normal text-gray-text">
                        · ext. {ev.agentExtension}
                      </span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-text">
                    {formatWhen(ev.startedAt ?? ev.createdAt)}
                  </span>
                </div>
                {ev.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-text">{ev.summary}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
