"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TICKET_STATUS_LABELS,
  formatTicketDate,
  statusStyles,
} from "@/content/tickets-labels";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { Ticket } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { LifeBuoy, Loader2 } from "lucide-react";
import {
  ClientTicketThreadPanel,
  CreateClientTicketModal,
  NewConversationButton,
} from "@/components/espace-client/ClientPortalTicketParts";

type Props = {
  profile: ClientProfileData;
  openCreateOnMount?: boolean;
  onCreateClosed?: () => void;
  onTicketsChange?: () => void;
};

export function ClientPortalSupportView({
  profile,
  openCreateOnMount = false,
  onCreateClosed,
  onTicketsChange,
}: Props) {
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
      setTickets(json.tickets);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (openCreateOnMount) {
      setShowCreate(true);
      onCreateClosed?.();
    }
  }, [openCreateOnMount, onCreateClosed]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Support & tickets</h2>
          <p className="text-sm text-gray-text">Ouvrez une demande et suivez l&apos;historique du support.</p>
        </div>
        <NewConversationButton onClick={() => setShowCreate(true)} label="Ouvrir un ticket" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-gray/40 bg-white p-10 text-center shadow-sm">
          <LifeBuoy className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium">Aucun ticket ouvert</p>
          <p className="mt-1 text-sm text-gray-text">Notre équipe répond sous 24 à 48 h ouvrées.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => setSelected(ticket)}
                className="w-full rounded-2xl border border-gray/40 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">{ticket.reference}</p>
                    <p className="mt-1 font-semibold text-foreground">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-gray-text">
                      {formatTicketDate(ticket.createdAt)} · {ticket.messageCount} message(s)
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      statusStyles[ticket.status],
                    )}
                  >
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateClientTicketModal
          profile={profile}
          defaultCategory="technical"
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => {
            setTickets((prev) => [ticket, ...prev]);
            setShowCreate(false);
            setSelected(ticket);
            onTicketsChange?.();
          }}
        />
      )}

      {selected && (
        <ClientTicketThreadPanel
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            setSelected(updated);
            onTicketsChange?.();
          }}
        />
      )}
    </div>
  );
}
