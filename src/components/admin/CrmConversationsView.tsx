"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Loader2, MessagesSquare, Target, User } from "lucide-react";
import { CHANNEL_LABELS, type AcquisitionChannel } from "@/lib/attribution";
import { CHAT_INTENT_LABELS } from "@/lib/chat-contact-intent";
import type { ChatConversationSummary, ChatMessageRecord, ConversationFilter } from "@/lib/chat-conversations";
import { parseFetchJson } from "@/lib/fetch-json";
import { useAssistantName } from "@/hooks/useAssistantName";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ id: ConversationFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "intent", label: "Intention commerciale" },
  { id: "next_step", label: "Rendez-vous / WhatsApp" },
  { id: "lead", label: "Devenues prospects" },
];

function formatBooking(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Abidjan",
  });
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function channelLabel(c: ChatConversationSummary): string {
  const channel = c.acquisitionChannel as AcquisitionChannel | null;
  return channel && channel in CHANNEL_LABELS ? CHANNEL_LABELS[channel] : "Origine inconnue";
}

/** CRM → Conversations (assistante) : ce que les visiteurs demandent à l'assistance virtuelle, et ceux devenus prospects. */
export function CrmConversationsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assistantName = useAssistantName();
  const selectedId = searchParams.get("id");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [list, setList] = useState<ChatConversationSummary[] | null>(null);
  const [detail, setDetail] = useState<{ conversation: ChatConversationSummary; messages: ChatMessageRecord[] } | null>(null);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");

  const loadList = useCallback(async () => {
    try {
      const query = new URLSearchParams({ filter });
      if (ref.trim()) query.set("ref", ref.trim());
      const res = await fetch(`/api/admin/chat-conversations?${query}`, { credentials: "include" });
      setList((await parseFetchJson<{ conversations: ChatConversationSummary[] }>(res)).conversations);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, [filter, ref]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/admin/chat-conversations/${selectedId}`, { credentials: "include" })
      .then((res) => parseFetchJson<{ conversation: ChatConversationSummary; messages: ChatMessageRecord[] }>(res))
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        // Lue : mise à jour de la liste sans la recharger.
        setList((prev) => prev?.map((c) => (c.id === data.conversation.id ? { ...c, readAt: new Date().toISOString() } : c)) ?? prev);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Conversation introuvable.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const open = (id: string) => router.replace(`/admin/crm/conversations?id=${id}`, { scroll: false });
  const shown = detail && detail.conversation.id === selectedId ? detail : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <MessagesSquare className="h-6 w-6 text-primary" aria-hidden />
          Conversations {assistantName}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-text">
          Questions posées à l&apos;assistance virtuelle du site, avec leur provenance. Quand un visiteur demande à être
          recontacté, un prospect est créé et vous êtes alerté par e-mail. Conservation : 90 jours (sauf conversations
          devenues prospects).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray/30 bg-gray-light/30 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              filter === f.id ? "bg-white text-foreground shadow-sm" : "text-gray-text hover:bg-white/70",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-text">Réf.</span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="ex. 3F2A9C1B (citée sur WhatsApp)"
            className="w-64 rounded-xl border border-gray/60 bg-white px-3 py-2 font-mono text-sm uppercase"
          />
        </label>
      </div>

      {error && <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray/25 bg-white shadow-sm" aria-label="Liste des conversations">
          {!list ? (
            <p className="flex items-center gap-2 p-6 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </p>
          ) : list.length === 0 ? (
            <p className="p-6 text-sm text-gray-text">Aucune conversation pour ce filtre.</p>
          ) : (
            <ul className="divide-y divide-gray/15">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-gray-light/50",
                      c.id === selectedId && "bg-primary-light/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs text-gray-text">
                        {!c.readAt && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Non lue" />}
                        {formatWhen(c.lastMessageAt)} · {channelLabel(c)}
                      </span>
                      <span className="text-xs text-gray-text">{c.messageCount} msg</span>
                    </div>
                    <p className={cn("mt-1 line-clamp-2 text-sm", c.readAt ? "text-foreground/80" : "font-semibold text-foreground")}>
                      {c.firstQuestion ?? "—"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.intent && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          {CHAT_INTENT_LABELS[c.intent]}
                        </span>
                      )}
                      {c.bookingStart && (
                        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
                          RDV {formatBooking(c.bookingStart)}
                        </span>
                      )}
                      {c.whatsappClickedAt && (
                        <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[11px] font-semibold text-[#128C4A]">
                          Passé sur WhatsApp
                        </span>
                      )}
                      {c.leadId && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Prospect : {c.leadName ?? "créé"}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-h-[300px] rounded-2xl border border-gray/25 bg-white shadow-sm" aria-label="Conversation">
          {!selectedId ? (
            <p className="p-6 text-sm text-gray-text">Sélectionnez une conversation.</p>
          ) : !shown ? (
            <p className="flex items-center gap-2 p-6 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </p>
          ) : (
            <div>
              <header className="space-y-1 border-b border-gray/20 px-5 py-4 text-sm">
                <p className="font-mono text-xs text-gray-text">Réf. {shown.conversation.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-semibold text-foreground">
                  {formatWhen(shown.conversation.createdAt)} · {channelLabel(shown.conversation)}
                  {shown.conversation.attribution?.last?.campaign ? ` · campagne ${shown.conversation.attribution.last.campaign}` : ""}
                </p>
                <p className="text-gray-text">
                  Arrivée sur {shown.conversation.firstPage ?? "—"}
                  {shown.conversation.lastPage && shown.conversation.lastPage !== shown.conversation.firstPage
                    ? ` · dernière page ${shown.conversation.lastPage}`
                    : ""}
                  {shown.conversation.locale === "en" ? " · en anglais" : ""}
                </p>
                {shown.conversation.bookingStart && (
                  <p className="font-semibold text-primary">
                    Rendez-vous réservé : {formatBooking(shown.conversation.bookingStart)} (heure d&apos;Abidjan)
                  </p>
                )}
                {shown.conversation.whatsappClickedAt && (
                  <p className="font-semibold text-[#128C4A]">
                    Le visiteur a poursuivi sur WhatsApp le {formatWhen(shown.conversation.whatsappClickedAt)} — son message cite la
                    réf. {shown.conversation.id.slice(0, 8).toUpperCase()}.
                  </p>
                )}
                {shown.conversation.leadId ? (
                  <Link
                    href={`/admin/crm/leads?id=${shown.conversation.leadId}`}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 hover:underline"
                  >
                    <Target className="h-4 w-4" aria-hidden />
                    Voir le prospect {shown.conversation.leadName ?? ""}
                  </Link>
                ) : (
                  <p className="text-xs text-gray-text">Le visiteur n&apos;a pas laissé ses coordonnées.</p>
                )}
              </header>
              <ol className="space-y-3 px-5 py-4">
                {shown.messages.map((m) => (
                  <li key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0 text-gray-text" aria-label={assistantName} />}
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                        m.role === "user" ? "bg-primary text-white" : "bg-gray-light text-foreground",
                      )}
                    >
                      {m.content}
                      <span className={cn("mt-1 block text-[10px]", m.role === "user" ? "text-white/70" : "text-gray-text")}>
                        {formatWhen(m.createdAt)}
                      </span>
                    </div>
                    {m.role === "user" && <User className="mt-1 h-4 w-4 shrink-0 text-gray-text" aria-label="Visiteur" />}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
