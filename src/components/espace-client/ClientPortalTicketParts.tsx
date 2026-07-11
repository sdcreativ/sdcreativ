"use client";

import { useEffect, useRef, useState } from "react";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  formatTicketDate,
  statusStyles,
} from "@/content/tickets-labels";
import type { ClientProfileData } from "@/lib/client-portal-config";
import type { Ticket, TicketMessage } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Send, X } from "lucide-react";

export const ticketFieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CreateClientTicketModal({
  profile,
  defaultCategory = "technical",
  title = "Nouveau ticket",
  onClose,
  onCreated,
}: {
  profile: ClientProfileData;
  defaultCategory?: "technical" | "billing" | "project" | "other";
  title?: string;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/espace-client/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: String(data.get("subject")),
          category: String(data.get("category")),
          priority: String(data.get("priority")),
          clientEmail: String(data.get("email") || `${profile.clientId}@client.sdcreativ.ci`),
          initialMessage: String(data.get("message")),
        }),
      });
      const json = (await res.json()) as { ticket: Ticket; error?: string };
      if (!res.ok) throw new Error(json.error);
      onCreated(json.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-foreground">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="space-y-3">
          <input name="subject" required placeholder="Sujet *" className={ticketFieldClass} />
          <input name="email" type="email" placeholder="Votre email (optionnel)" className={ticketFieldClass} />
          <select name="category" defaultValue={defaultCategory} className={ticketFieldClass} aria-label="Catégorie">
            {Object.entries(TICKET_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue="normal" className={ticketFieldClass} aria-label="Priorité">
            {Object.entries(TICKET_PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <textarea name="message" required rows={4} placeholder="Votre message *" className={ticketFieldClass} />
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}

export function ClientTicketThreadPanel({
  ticket,
  onClose,
  onUpdated,
  variant = "drawer",
}: {
  ticket: Ticket;
  onClose?: () => void;
  onUpdated: (ticket: Ticket) => void;
  variant?: "drawer" | "inline";
}) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetch(`/api/espace-client/tickets/${ticket.id}/messages`, { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as {
          messages?: TicketMessage[];
          ticket?: Ticket;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Chargement impossible.");
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setMessages(json.messages ?? []);
        if (json.ticket) onUpdatedRef.current(json.ticket);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/espace-client/tickets/${ticket.id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      const json = (await res.json()) as { message: TicketMessage; ticket: Ticket };
      if (!res.ok) throw new Error();
      setMessages((prev) => [...prev, json.message]);
      setReply("");
      onUpdated(json.ticket);
    } finally {
      setSending(false);
    }
  }

  const canReply = ticket.status !== "closed" && ticket.status !== "resolved";

  const header = (
    <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
      <div>
        <p className="font-mono text-xs text-primary">{ticket.reference}</p>
        <h3 className="font-bold text-foreground">{ticket.subject}</h3>
        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", statusStyles[ticket.status])}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </span>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer">
          <X className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );

  const body = (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-text">Aucun message pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "rounded-xl p-3 text-sm",
                msg.authorType === "client" ? "ml-4 bg-primary-light/40" : "mr-4 bg-gray-light/70",
              )}
            >
              <p className="text-[11px] font-semibold text-gray-text">
                {msg.authorName} · {formatTicketDate(msg.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const footer = canReply ? (
    <form onSubmit={handleReply} className="border-t border-gray/40 p-4">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={3}
        placeholder="Votre message…"
        className={ticketFieldClass}
      />
      <button
        type="submit"
        disabled={sending || !reply.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden />
        Envoyer
      </button>
    </form>
  ) : (
    <div className="border-t border-gray/40 px-5 py-3 text-center text-xs text-gray-text">
      Conversation clôturée.
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-gray/40 bg-white shadow-sm">
        {header}
        {body}
        {footer}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        {header}
        {body}
        {footer}
      </div>
    </div>
  );
}

export function NewConversationButton({
  onClick,
  label = "Nouveau message",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
