"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { MailThreadLinkControls } from "@/components/admin/MailThreadLinkControls";
import {
  fetchMailMailboxes,
  fetchMailPhase1Validation,
  fetchMailThreadDetail,
  fetchMailThreads,
  replyMailThreadApi,
  saveMailDraftApi,
  syncMailMailbox,
  connectMailMailboxApi,
  type MailPhase1ValidationResponse,
  type MailThreadDetail,
  type MailThreadMessage,
} from "@/lib/mail-api";
import type { CrmMailAttachment, CrmMailThread, CrmMailbox } from "@/lib/mail/types";
import { cn } from "@/lib/utils";

function formatMailDate(iso: string | null): string {
  if (!iso) return "—";
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
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function participantsLabel(participants: string[]): string {
  if (participants.length === 0) return "Sans destinataire";
  if (participants.length === 1) return participants[0]!;
  if (participants.length === 2) return participants.join(", ");
  return `${participants[0]}, +${participants.length - 1}`;
}

export function CrmMessagerieView() {
  const [mailboxes, setMailboxes] = useState<CrmMailbox[]>([]);
  const [threads, setThreads] = useState<CrmMailThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "unread" | "archived">("open");
  const [mailboxScope, setMailboxScope] = useState<"all" | "shared" | "mine" | string>("all");
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [validation, setValidation] = useState<MailPhase1ValidationResponse | null>(null);
  const [rotatePassword, setRotatePassword] = useState("");
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/account", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { account?: { userId?: string; email?: string } } | null) => {
        if (json?.account?.userId) setAccountUserId(json.account.userId);
        if (json?.account?.email) setAccountEmail(json.account.email);
      })
      .catch(() => undefined);
  }, []);

  const sharedMailbox = useMemo(
    () => mailboxes.find((m) => m.email === "contact@sdcreativ.com") ?? null,
    [mailboxes],
  );

  const myMailbox = useMemo(() => {
    if (!accountUserId && !accountEmail) return null;
    return (
      mailboxes.find(
        (m) =>
          (accountUserId && m.userId === accountUserId) ||
          (accountEmail && m.email.toLowerCase() === accountEmail.toLowerCase()),
      ) ?? null
    );
  }, [mailboxes, accountUserId, accountEmail]);

  const selectedMailbox = useMemo(() => {
    if (mailboxScope === "shared") return sharedMailbox;
    if (mailboxScope === "mine") return myMailbox;
    if (mailboxScope === "all") {
      return myMailbox ?? sharedMailbox ?? mailboxes.find((m) => m.active) ?? mailboxes[0] ?? null;
    }
    return mailboxes.find((m) => m.id === mailboxScope) ?? null;
  }, [mailboxScope, sharedMailbox, myMailbox, mailboxes]);

  const threadsMailboxId = useMemo(() => {
    if (mailboxScope === "all") return undefined;
    if (mailboxScope === "shared") return sharedMailbox?.id;
    if (mailboxScope === "mine") return myMailbox?.id;
    return mailboxScope;
  }, [mailboxScope, sharedMailbox, myMailbox]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boxes, list, phase1] = await Promise.all([
        fetchMailMailboxes(),
        fetchMailThreads({
          status: filter === "archived" ? "archived" : "open",
          unreadOnly: filter === "unread",
          search: search || undefined,
          mailboxId: threadsMailboxId,
          limit: 80,
        }),
        fetchMailPhase1Validation().catch(() => null),
      ]);
      setMailboxes(boxes);
      setThreads(list.threads);
      setUnreadCount(list.unreadCount);
      if (phase1) setValidation(phase1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger la messagerie.");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search, threadsMailboxId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchMailThreadDetail(selectedId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setThreads((prev) => {
          const before = prev.find((t) => t.id === data.thread.id);
          if (before && before.unreadCount > 0 && data.thread.unreadCount === 0) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.map((t) =>
            t.id === data.thread.id
              ? { ...t, unreadCount: data.thread.unreadCount }
              : t,
          );
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Conversation introuvable.");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleSync() {
    if (!selectedMailbox) {
      setError(
        "Aucune boîte à synchroniser. Connectez votre boîte ou sélectionnez contact@.",
      );
      return;
    }
    setSyncing(true);
    setError(null);
    try {
      const result = await syncMailMailbox(selectedMailbox.id);
      if (result.error) {
        setError(result.error);
      }
      await loadList();
      setMailboxes((prev) =>
        prev.map((m) =>
          m.id === selectedMailbox.id
            ? {
                ...m,
                lastError: result.error ?? null,
                lastSyncAt: new Date().toISOString(),
                lastUid: result.lastUid,
              }
            : m,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleRotatePassword(e: FormEvent) {
    e.preventDefault();
    if (!selectedMailbox || !rotatePassword.trim()) return;
    setRotating(true);
    setError(null);
    try {
      await connectMailMailboxApi({
        email: selectedMailbox.email,
        password: rotatePassword.trim(),
        userId: selectedMailbox.userId,
      });
      setRotatePassword("");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour du mot de passe impossible.");
    } finally {
      setRotating(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
  }

  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, CrmMailAttachment[]>();
    for (const att of detail?.attachments ?? []) {
      const list = map.get(att.messageId) ?? [];
      list.push(att);
      map.set(att.messageId, list);
    }
    return map;
  }, [detail?.attachments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Mail className="h-5 w-5 text-primary" aria-hidden />
            Messagerie
          </h2>
          <p className="text-sm text-gray-text">
            Emails Hostinger {selectedMailbox ? `(${selectedMailbox.email})` : ""} —{" "}
            {unreadCount} non lu(s).
          </p>
          {selectedMailbox?.lastSyncAt && (
            <p className="mt-1 text-xs text-gray-text">
              Dernière sync : {formatMailDate(selectedMailbox.lastSyncAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing || !selectedMailbox}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Synchroniser
        </button>
      </div>

      {(error || selectedMailbox?.lastError) && (
        <div className="flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            {error && <p>{error}</p>}
            {!error && selectedMailbox?.lastError && (
              <p>Dernière erreur sync : {selectedMailbox.lastError}</p>
            )}
          </div>
        </div>
      )}

      {validation && !validation.go && (
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-foreground">Validation Phase 1</h3>
          <p className="mt-1 text-xs text-gray-text">
            Checklist pour valider la lecture seule sur {validation.sharedMailbox}.
          </p>
          <ul className="mt-3 space-y-2">
            {validation.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-sm">
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Circle
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      check.required ? "text-accent" : "text-gray-text",
                    )}
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <p className={cn("font-medium", check.ok ? "text-foreground" : "text-foreground")}>
                    {check.label}
                    {!check.required && (
                      <span className="ml-1 text-xs font-normal text-gray-text">(info)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-text">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation?.go && (
        <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>
            Phase 1 validée — {validation.messageCount} message(s),{" "}
            {validation.threadCount} conversation(s)
            {validation.attachmentCount > 0
              ? `, ${validation.attachmentCount} pièce(s) jointe(s)`
              : ""}
            .
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all" as const, label: "Toutes", show: true },
            { id: "shared" as const, label: "contact@", show: Boolean(sharedMailbox) },
            { id: "mine" as const, label: "Ma boîte", show: Boolean(myMailbox) },
          ] as const
        )
          .filter((f) => f.show)
          .map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setMailboxScope(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                mailboxScope === f.id ? "bg-primary text-white" : "bg-gray/30 text-gray-text",
              )}
            >
              {f.label}
            </button>
          ))}
        {mailboxes
          .filter(
            (m) =>
              m.email !== "contact@sdcreativ.com" &&
              m.userId !== accountUserId &&
              m.email.toLowerCase() !== accountEmail?.toLowerCase(),
          )
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMailboxScope(m.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                mailboxScope === m.id ? "bg-primary text-white" : "bg-gray/30 text-gray-text",
              )}
            >
              {m.email.split("@")[0]}
            </button>
          ))}
      </div>

      {selectedMailbox && (
        <form
          onSubmit={(e) => void handleRotatePassword(e)}
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray/30 bg-white px-4 py-3 text-sm shadow-sm"
        >
          <label className="min-w-[200px] flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Rotation MDP — {selectedMailbox.email}
            </span>
            <input
              type="password"
              autoComplete="off"
              value={rotatePassword}
              onChange={(e) => setRotatePassword(e.target.value)}
              disabled={rotating}
              placeholder="Nouveau mot de passe Hostinger"
              className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={rotating || !rotatePassword.trim()}
            className="rounded-xl border border-gray/60 px-4 py-2 font-medium disabled:opacity-50"
          >
            {rotating ? "…" : "Mettre à jour"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "open", label: "Ouverts" },
            { id: "unread", label: "Non lus" },
            { id: "archived", label: "Archivés" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              filter === f.id ? "bg-primary text-white" : "bg-gray/30 text-gray-text",
            )}
          >
            {f.label}
          </button>
        ))}
        <form onSubmit={handleSearchSubmit} className="ml-auto flex min-w-[200px] flex-1 max-w-sm gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" aria-hidden />
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Sujet, destinataire…"
              className="w-full rounded-xl border border-gray/60 py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl border border-gray/60 px-3 py-2 text-sm font-medium"
          >
            OK
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement…
          </div>
        ) : threads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Mail className="mx-auto h-10 w-10 text-gray/60" aria-hidden />
            <p className="mt-3 font-semibold text-foreground">Aucune conversation</p>
            <p className="mt-1 text-sm text-gray-text">
              {selectedMailbox
                ? "Lancez une synchronisation pour importer les emails."
                : "Connectez votre boîte pro (bandeau d’accueil) ou configurez contact@ (mail.manage)."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray/30">
            {threads.map((thread) => {
              const unread = thread.unreadCount > 0;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-light/50",
                      selectedId === thread.id && "bg-primary-light/40",
                      unread && "bg-primary-light/20",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-2 h-2 w-2 shrink-0 rounded-full",
                        unread ? "bg-primary" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            unread ? "font-bold text-foreground" : "font-medium text-foreground",
                          )}
                        >
                          {thread.subject || "(sans objet)"}
                        </p>
                        <span className="shrink-0 text-[11px] text-gray-text">
                          {formatMailDate(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-gray-text">
                        {participantsLabel(thread.participants)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-text">{thread.snippet}</p>
                    </div>
                    {unread && (
                      <span className="mt-1 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedId && (
        <ThreadDrawer
          loading={detailLoading}
          detail={detail}
          attachmentsByMessage={attachmentsByMessage}
          onClose={() => setSelectedId(null)}
          onDetailPatch={(next) => setDetail(next)}
          onReplied={(message) => {
            setDetail((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [...prev.messages, message],
                    thread: {
                      ...prev.thread,
                      snippet: message.bodyText.slice(0, 180),
                      lastMessageAt: message.receivedAt,
                    },
                  }
                : prev,
            );
            setThreads((prev) =>
              prev.map((t) =>
                t.id === message.threadId
                  ? {
                      ...t,
                      snippet: message.bodyText.slice(0, 180),
                      lastMessageAt: message.receivedAt,
                    }
                  : t,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

function ThreadDrawer({
  loading,
  detail,
  attachmentsByMessage,
  onClose,
  onReplied,
  onDetailPatch,
}: {
  loading: boolean;
  detail: MailThreadDetail | null;
  attachmentsByMessage: Map<string, CrmMailAttachment[]>;
  onClose: () => void;
  onReplied: (message: MailThreadMessage) => void;
  onDetailPatch: (detail: MailThreadDetail) => void;
}) {
  const [reply, setReply] = useState("");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftLoadedFor, setDraftLoadedFor] = useState<string | null>(null);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!detail?.thread.id) return;
    if (draftLoadedFor === detail.thread.id) return;
    const draft = detail.draft;
    skipNextSave.current = true;
    setReply(draft?.bodyText ?? "");
    setIncludeSignature(draft?.includeSignature ?? true);
    setDraftLoadedFor(detail.thread.id);
    setDraftStatus(draft ? "saved" : "idle");
  }, [detail, draftLoadedFor]);

  useEffect(() => {
    if (!detail?.thread.id || draftLoadedFor !== detail.thread.id) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setDraftStatus("saving");
        try {
          await saveMailDraftApi(detail.thread.id, {
            bodyText: reply,
            includeSignature,
          });
          setDraftStatus(reply.trim() ? "saved" : "idle");
        } catch {
          setDraftStatus("error");
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [reply, includeSignature, detail?.thread.id, draftLoadedFor]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!detail || !reply.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await replyMailThreadApi(detail.thread.id, {
        bodyText: reply.trim(),
        includeSignature,
      });
      onReplied(result.message);
      skipNextSave.current = true;
      setReply("");
      setDraftStatus("idle");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Échec de l’envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray/40 px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Conversation
              </p>
              <h2 className="mt-1 font-bold text-foreground">
                {detail?.thread.subject || (loading ? "Chargement…" : "(sans objet)")}
              </h2>
              {detail && (
                <p className="mt-1 truncate text-sm text-gray-text">
                  {participantsLabel(detail.thread.participants)}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {detail && (
            <MailThreadLinkControls
              thread={detail.thread}
              linkedClient={detail.linkedClient ?? null}
              linkedLead={detail.linkedLead ?? null}
              onLinked={(thread, client, lead) => {
                onDetailPatch({
                  ...detail,
                  thread,
                  linkedClient: client,
                  linkedLead: lead,
                });
                // sync list badges via thread fields
              }}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            </div>
          ) : (
            <ul className="space-y-3">
              {(detail?.messages ?? []).map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  attachments={attachmentsByMessage.get(msg.id) ?? []}
                />
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={(e) => void handleSend(e)} className="border-t border-gray/40 p-4">
          {sendError && (
            <p className="mb-2 flex items-start gap-1.5 text-xs text-accent">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {sendError}
            </p>
          )}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            disabled={!detail || sending}
            placeholder="Votre réponse…"
            className="w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm disabled:opacity-50"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-xs text-gray-text">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  disabled={sending}
                />
                Inclure la signature (branding)
              </label>
              <p className="text-[11px] text-gray-text">
                {draftStatus === "saving" && "Enregistrement du brouillon…"}
                {draftStatus === "saved" && "Brouillon enregistré"}
                {draftStatus === "error" && "Échec enregistrement brouillon"}
                {draftStatus === "idle" && "\u00a0"}
              </p>
            </div>
            <button
              type="submit"
              disabled={!detail || sending || !reply.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  attachments,
}: {
  message: MailThreadMessage;
  attachments: CrmMailAttachment[];
}) {
  const outbound = message.direction === "outbound";
  const body =
    message.bodyText?.trim() ||
    (message.bodyHtml
      ? message.bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : "(message vide)");

  return (
    <li
      className={cn(
        "rounded-xl p-3 text-sm",
        outbound ? "ml-4 bg-primary-light/50" : "mr-4 bg-gray-light/70",
      )}
    >
      <div className="flex justify-between gap-2 text-[11px] text-gray-text">
        <span className="font-semibold text-foreground">{message.fromAddress}</span>
        <span>{formatMailDate(message.receivedAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap wrap-break-word">{body}</p>
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-1.5 text-xs text-gray-text"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{att.filename}</span>
              <span className="shrink-0">({formatBytes(att.sizeBytes)})</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
