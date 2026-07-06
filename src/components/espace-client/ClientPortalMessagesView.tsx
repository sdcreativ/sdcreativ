"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTicketDate, statusStyles, TICKET_STATUS_LABELS } from "@/content/tickets-labels";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { Ticket } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare } from "lucide-react";
import {
  ClientTicketThreadPanel,
  CreateClientTicketModal,
  NewConversationButton,
} from "@/components/espace-client/ClientPortalTicketParts";

type Props = {
  profile: ClientProfileData;
  onTicketsChange?: () => void;
};

export function ClientPortalMessagesView({ profile, onTicketsChange }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/espace-client/tickets", { credentials: "include" });
      const json = (await res.json()) as { tickets: Ticket[]; error?: string };
      if (!res.ok) throw new Error(json.error);
      const projectTickets = json.tickets.filter((t) => t.category === "project");
      setTickets(projectTickets);
      setSelected((prev) => {
        if (!prev) return projectTickets[0] ?? null;
        return projectTickets.find((t) => t.id === prev.id) ?? projectTickets[0] ?? null;
      });
    } catch {
      setTickets([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const aDate = a.lastMessageAt ?? a.updatedAt;
        const bDate = b.lastMessageAt ?? b.updatedAt;
        return bDate.localeCompare(aDate);
      }),
    [tickets],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Messages</h2>
          <p className="text-sm text-gray-text">
            Échangez avec votre chef de projet — fils liés au projet.
          </p>
        </div>
        <NewConversationButton onClick={() => setShowCreate(true)} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement des conversations…
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-12 text-center shadow-sm">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium">Aucune conversation</p>
          <p className="mt-1 text-sm text-gray-text">
            Lancez un échange avec l&apos;équipe SD CREATIV sur votre projet.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Écrire au chef de projet
          </button>
        </div>
      ) : (
        <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <aside className="rounded-2xl border border-gray/40 bg-white shadow-sm">
            <p className="border-b border-gray/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-text">
              Conversations ({sortedTickets.length})
            </p>
            <ul className="max-h-[28rem] overflow-y-auto p-2">
              {sortedTickets.map((ticket) => {
                const active = selected?.id === ticket.id;
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(ticket)}
                      className={cn(
                        "w-full rounded-xl px-3 py-3 text-left transition-colors",
                        active ? "bg-primary-light/50" : "hover:bg-gray-light/60",
                      )}
                    >
                      <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
                      <p className="mt-1 text-[11px] text-gray-text">
                        {formatTicketDate(ticket.lastMessageAt ?? ticket.updatedAt)} · {ticket.messageCount} msg
                      </p>
                      <span
                        className={cn(
                          "mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold",
                          statusStyles[ticket.status],
                        )}
                      >
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {selected ? (
            <ClientTicketThreadPanel
              ticket={selected}
              variant="inline"
              onUpdated={(updated) => {
                setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                setSelected(updated);
                onTicketsChange?.();
              }}
            />
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray/50 bg-white p-8 text-sm text-gray-text">
              Sélectionnez une conversation.
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateClientTicketModal
          profile={profile}
          defaultCategory="project"
          title="Nouveau message"
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setSelected(ticket);
            setShowCreate(false);
            onTicketsChange?.();
          }}
        />
      )}
    </div>
  );
}
