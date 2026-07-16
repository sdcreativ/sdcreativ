"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Forward,
  Reply,
  ReplyAll,
  AlertCircle,
  ExternalLink,
  Loader2,
  Mail,
  Paperclip,
  PenSquare,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";
import { MailThreadLinkControls } from "@/components/admin/MailThreadLinkControls";
import { MailComposeModal, filesToAttachmentDrafts } from "@/components/admin/MailComposeModal";
import { MailRichEditor } from "@/components/admin/MailRichEditor";
import {
  bulkDeleteMailMessagesApi,
  bulkDeleteMailThreadsApi,
  connectMailMailboxApi,
  deleteMailMessageApi,
  deleteMailThreadApi,
  fetchMailMailboxes,
  fetchMailThreadDetail,
  fetchMailThreads,
  mailAttachmentDownloadUrl,
  replyMailThreadApi,
  saveMailDraftApi,
  syncMailMailbox,
  type MailThreadDetail,
  type MailThreadMessage,
} from "@/lib/mail-api";
import { MAIL_V1_SHARED_MAILBOX } from "@/lib/mail/config";
import type { CrmMailAttachment, CrmMailThread, CrmMailbox } from "@/lib/mail/types";
import { cn } from "@/lib/utils";
import type { OutgoingAttachmentDraft } from "@/components/admin/MailComposeModal";

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
  const { confirm } = useDialog();
  const [mailboxes, setMailboxes] = useState<CrmMailbox[]>([]);
  const [threads, setThreads] = useState<CrmMailThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [deletingThreads, setDeletingThreads] = useState(false);
  const [filter, setFilter] = useState<"open" | "unread" | "archived">("open");
  const [mailboxScope, setMailboxScope] = useState<"all" | "shared" | "mine" | string>("all");
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [forwardDraft, setForwardDraft] = useState<{
    to: string;
    subject: string;
    bodyHtml: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rotatePassword, setRotatePassword] = useState("");
  const [rotating, setRotating] = useState(false);
  const [canManageMail, setCanManageMail] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/account", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/admin/settings/session", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(
        ([accountJson, sessionJson]: [
          { account?: { userId?: string; email?: string } } | null,
          { session?: { permissions?: string[] } } | null,
        ]) => {
          if (accountJson?.account?.userId) setAccountUserId(accountJson.account.userId);
          if (accountJson?.account?.email) setAccountEmail(accountJson.account.email);
          setCanManageMail(
            Boolean(sessionJson?.session?.permissions?.includes("mail.manage")),
          );
        },
      )
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

  const composeMailbox = selectedMailbox ?? myMailbox ?? sharedMailbox;

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
      const [boxes, list] = await Promise.all([
        fetchMailMailboxes(),
        fetchMailThreads({
          status: filter === "archived" ? "archived" : "open",
          unreadOnly: filter === "unread",
          search: search || undefined,
          mailboxId: threadsMailboxId,
          limit: 80,
        }),
      ]);
      setMailboxes(boxes);
      setThreads(list.threads);
      setUnreadCount(list.unreadCount);
      setSelectedThreadIds((prev) =>
        prev.filter((id) => list.threads.some((t) => t.id === id)),
      );    } catch (err) {
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
      setSettingsOpen(false);
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

  function toggleThreadSelection(threadId: string) {
    setSelectedThreadIds((prev) =>
      prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId],
    );
  }

  function toggleSelectAllThreads() {
    setSelectedThreadIds((prev) =>
      prev.length === threads.length ? [] : threads.map((t) => t.id),
    );
  }

  async function handleBulkDeleteThreads() {
    if (selectedThreadIds.length === 0 || deletingThreads) return;
    const count = selectedThreadIds.length;
    const ok = await confirm({
      title: "Supprimer les conversations",
      message:
        count === 1
          ? "Cette conversation et ses messages seront retirés de la messagerie CRM (ils ne réapparaîtront pas au Sync)."
          : `${count} conversations et leurs messages seront retirés de la messagerie CRM (ils ne réapparaîtront pas au Sync).`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingThreads(true);
    setError(null);
    try {
      await bulkDeleteMailThreadsApi(selectedThreadIds);
      if (selectedId && selectedThreadIds.includes(selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
      setSelectedThreadIds([]);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingThreads(false);
    }
  }

  async function handleDeleteThread(threadId: string) {
    const ok = await confirm({
      title: "Supprimer la conversation",
      message:
        "Cette conversation et ses messages seront retirés de la messagerie CRM (ils ne réapparaîtront pas au Sync).",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteMailThreadApi(threadId);
      if (selectedId === threadId) {
        setSelectedId(null);
        setDetail(null);
      }
      setSelectedThreadIds((prev) => prev.filter((id) => id !== threadId));
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function handleMessagesDeleted(messageIds: string[], threadsDeleted: string[]) {
    setDetail((prev) => {
      if (!prev) return prev;
      const nextMessages = prev.messages.filter((m) => !messageIds.includes(m.id));
      return { ...prev, messages: nextMessages };
    });
    if (threadsDeleted.length > 0) {
      if (selectedId && threadsDeleted.includes(selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
      setThreads((prev) => prev.filter((t) => !threadsDeleted.includes(t.id)));
      setSelectedThreadIds((prev) => prev.filter((id) => !threadsDeleted.includes(id)));
      await loadList();
    } else {
      await loadList();
    }
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

  const mailboxFilters = (
    [
      { id: "all" as const, label: "Toutes", show: true },
      { id: "shared" as const, label: "contact@", show: Boolean(sharedMailbox) },
      { id: "mine" as const, label: "Ma boîte", show: Boolean(myMailbox) },
    ] as const
  ).filter((f) => f.show);

  const otherMailboxes = mailboxes.filter(
    (m) =>
      m.email !== "contact@sdcreativ.com" &&
      m.userId !== accountUserId &&
      m.email.toLowerCase() !== accountEmail?.toLowerCase(),
  );

  const composeFromOptions = useMemo(() => {
    const list = [
      ...(myMailbox ? [myMailbox] : []),
      ...(sharedMailbox && sharedMailbox.id !== myMailbox?.id ? [sharedMailbox] : []),
      ...otherMailboxes,
    ];
    return list.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
  }, [myMailbox, sharedMailbox, otherMailboxes]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Communication
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Messagerie</h2>
          <p className="mt-1 text-sm text-gray-text">
            {selectedMailbox ? selectedMailbox.email : "Aucune boîte active"}
            {unreadCount > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="ml-2 text-xs text-gray-text">· boîte à jour</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            disabled={mailboxes.length === 0}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray/40 bg-white text-gray-text transition hover:border-primary/30 hover:text-primary disabled:opacity-40"
            aria-label="Paramètres boîte"
            title={
              mailboxes.length === 0
                ? "Connectez d’abord une boîte ci-dessous"
                : "Paramètres boîte"
            }
          >
            <Settings2 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing || !selectedMailbox}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray/40 bg-white px-3 text-sm font-medium text-foreground transition hover:border-primary/30 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            Sync
          </button>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            disabled={!composeMailbox}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
          >
            <PenSquare className="h-4 w-4" aria-hidden />
            Nouveau message
          </button>
        </div>
      </header>

      {(error || selectedMailbox?.lastError) && (
        <div className="flex items-start gap-2 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-accent">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            {error && <p>{error}</p>}
            {!error && selectedMailbox?.lastError && (
              <p>Dernière erreur sync : {selectedMailbox.lastError}</p>
            )}
          </div>
        </div>
      )}

      {mailboxes.length === 0 && !loading && (
        <ConnectMailboxPanel
          accountEmail={accountEmail}
          canManageShared={canManageMail}
          onConnected={async () => {
            await loadList();
          }}
        />
      )}

      {settingsOpen && selectedMailbox && (
        <form
          onSubmit={(e) => void handleRotatePassword(e)}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray/30 bg-gradient-to-br from-white to-primary-light/40 px-4 py-3 text-sm"
        >
          <label className="min-w-[220px] flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Mot de passe Hostinger — {selectedMailbox.email}
            </span>
            <input
              type="password"
              autoComplete="off"
              value={rotatePassword}
              onChange={(e) => setRotatePassword(e.target.value)}
              disabled={rotating}
              placeholder="Nouveau mot de passe"
              className="mt-1.5 w-full rounded-xl border border-gray/50 bg-white px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={rotating || !rotatePassword.trim()}
            className="rounded-xl bg-foreground px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {rotating ? "…" : "Mettre à jour"}
          </button>
          {selectedMailbox.lastSyncAt && (
            <p className="w-full text-xs text-gray-text">
              Dernière sync : {formatMailDate(selectedMailbox.lastSyncAt)}
            </p>
          )}
        </form>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-gray/35 bg-white shadow-[0_12px_40px_-24px_rgba(0,60,100,0.35)] lg:grid-cols-[minmax(280px,380px)_1fr]">
        <aside className="flex min-h-[420px] flex-col border-b border-gray/30 lg:border-b-0 lg:border-r lg:border-gray/30">
          <div className="space-y-3 border-b border-gray/25 bg-[linear-gradient(180deg,var(--primary-light)_0%,white_70%)] px-3 py-3">
            <div className="flex flex-wrap gap-1">
              {mailboxFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMailboxScope(f.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    mailboxScope === f.id
                      ? "bg-primary text-white"
                      : "bg-white/80 text-gray-text hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
              {otherMailboxes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMailboxScope(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    mailboxScope === m.id
                      ? "bg-primary text-white"
                      : "bg-white/80 text-gray-text hover:text-foreground",
                  )}
                >
                  {m.email.split("@")[0]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-gray/25">
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
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                    filter === f.id
                      ? "bg-foreground text-white"
                      : "text-gray-text hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-text"
                aria-hidden
              />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-xl border-0 bg-white/90 py-2 pl-9 pr-3 text-sm shadow-sm ring-1 ring-gray/25 outline-none focus:ring-primary/40"
              />
            </form>
          </div>

          {selectedThreadIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-b border-accent/20 bg-accent/5 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">
                {selectedThreadIds.length} sélectionnée
                {selectedThreadIds.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedThreadIds([])}
                  className="text-xs font-medium text-gray-text hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDeleteThreads()}
                  disabled={deletingThreads}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {deletingThreads ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Supprimer
                </button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-gray-text">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                Chargement…
              </div>
            ) : threads.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                  <Mail className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <p className="mt-4 font-semibold text-foreground">Aucune conversation</p>
                <p className="mt-1 text-sm text-gray-text">
                  {composeMailbox
                    ? "Cliquez Sync pour importer les emails Hostinger, ou écrivez un message."
                    : "Connectez d’abord une boîte Hostinger (formulaire ci-dessus)."}
                </p>
                {composeMailbox && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSync()}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-white px-4 py-2 text-sm font-semibold text-primary"
                    >
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="h-4 w-4" aria-hidden />
                      )}
                      Synchroniser
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      <PenSquare className="h-4 w-4" aria-hidden />
                      Nouveau message
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-gray/20 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={threads.length > 0 && selectedThreadIds.length === threads.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedThreadIds.length > 0 &&
                          selectedThreadIds.length < threads.length;
                      }
                    }}
                    onChange={toggleSelectAllThreads}
                    aria-label="Tout sélectionner"
                    className="h-3.5 w-3.5 rounded border-gray/50"
                  />
                  <span className="text-[11px] font-medium text-gray-text">Tout sélectionner</span>
                </div>
              <ul>
                {threads.map((thread) => {
                  const unread = thread.unreadCount > 0;
                  const active = selectedId === thread.id;
                  const checked = selectedThreadIds.includes(thread.id);
                  return (
                    <li key={thread.id} className="border-b border-gray/20 last:border-0">
                      <div
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-3.5 transition",
                          active
                            ? "bg-primary-light/70"
                            : unread
                              ? "bg-primary-light/25 hover:bg-primary-light/40"
                              : "hover:bg-gray-light/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleThreadSelection(thread.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Sélectionner ${thread.subject || "conversation"}`}
                          className="mt-2 h-3.5 w-3.5 shrink-0 rounded border-gray/50"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedId(thread.id)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
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
                              <span className="shrink-0 text-[11px] tabular-nums text-gray-text">
                                {formatMailDate(thread.lastMessageAt)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-gray-text">
                              {participantsLabel(thread.participants)}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-text/90">{thread.snippet}</p>
                          </div>
                          {unread && (
                            <span className="mt-1 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {thread.unreadCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--primary-light)_0%,_transparent_55%)]">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <div className="relative">
                <div className="absolute -inset-6 rounded-full bg-primary/5 blur-2xl" aria-hidden />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/15 bg-white shadow-sm">
                  <Mail className="h-9 w-9 text-primary" aria-hidden />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-bold text-foreground">Sélectionnez une conversation</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-text">
                Lisez, répondez, ou créez un nouveau message depuis votre boîte Hostinger.
              </p>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                disabled={!composeMailbox}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-50"
              >
                <PenSquare className="h-4 w-4" aria-hidden />
                Écrire un message
              </button>
            </div>
          ) : (
            <ThreadPane
              loading={detailLoading}
              detail={detail}
              attachmentsByMessage={attachmentsByMessage}
              onClose={() => setSelectedId(null)}
              onDetailPatch={(next) => setDetail(next)}
              onDeleteThread={() => {
                if (detail?.thread.id) void handleDeleteThread(detail.thread.id);
              }}
              onMessagesDeleted={(ids, threadsDeleted) => {
                void handleMessagesDeleted(ids, threadsDeleted);
              }}
              onForward={(draft) => {
                setForwardDraft(draft);
                setComposeOpen(true);
              }}
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
        </section>
      </div>

      {composeOpen && composeMailbox && (
        <MailComposeModal
          mailbox={composeMailbox}
          mailboxes={composeFromOptions.length > 0 ? composeFromOptions : [composeMailbox]}
          initialTo={forwardDraft?.to ?? ""}
          initialSubject={forwardDraft?.subject ?? ""}
          initialBodyHtml={forwardDraft?.bodyHtml ?? ""}
          title={forwardDraft ? "Transférer" : "Nouveau message"}
          onClose={() => {
            setComposeOpen(false);
            setForwardDraft(null);
          }}
          onSent={(thread) => {
            setComposeOpen(false);
            setForwardDraft(null);
            setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
            setSelectedId(thread.id);
            setFilter("open");
          }}
        />
      )}
    </div>
  );
}

function ConnectMailboxPanel({
  accountEmail,
  canManageShared,
  onConnected,
}: {
  accountEmail: string | null;
  canManageShared: boolean;
  onConnected: () => Promise<void>;
}) {
  const options = useMemo(() => {
    const emails: string[] = [];
    if (canManageShared) emails.push(MAIL_V1_SHARED_MAILBOX);
    if (accountEmail && accountEmail.toLowerCase() !== MAIL_V1_SHARED_MAILBOX) {
      emails.push(accountEmail.toLowerCase());
    }
    return emails;
  }, [accountEmail, canManageShared]);

  const [email, setEmail] = useState(options[0] ?? MAIL_V1_SHARED_MAILBOX);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (options.length > 0 && !options.includes(email)) {
      setEmail(options[0]!);
    }
  }, [options, email]);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    if (!password.trim() || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      const mailbox = await connectMailMailboxApi({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      setPassword("");
      await onConnected();
      try {
        await syncMailMailbox(mailbox.id);
        await onConnected();
      } catch {
        /* sync optionnelle — la boîte est déjà connectée */
      }
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Impossible de connecter la boîte. Vérifiez le mot de passe Hostinger et MAIL_CREDENTIALS_SECRET.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary-light/50 px-5 py-4 text-sm">
        <p className="font-semibold text-foreground">Aucune boîte à connecter</p>
        <p className="mt-1 text-gray-text">
          Votre compte CRM n’a pas encore d’email professionnel @domaine, et vous n’avez pas
          mail.manage pour configurer contact@.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleConnect(e)}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-light/70 via-white to-white px-5 py-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Première connexion
          </p>
          <h3 className="mt-1 text-base font-bold text-foreground">
            Brancher Hostinger au CRM
          </h3>
          <p className="mt-1 max-w-xl text-sm text-gray-text">
            Les emails du webmail n’apparaissent ici qu’après connexion IMAP (mot de passe de la
            boîte Hostinger, chiffré en base) puis synchronisation.
          </p>
        </div>
        <a
          href="https://webmail.hostinger.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Ouvrir le webmail
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      {localError && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-accent">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {localError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
            Boîte
          </span>
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || options.length < 2}
            className="mt-1.5 w-full rounded-xl border border-gray/50 bg-white px-3 py-2.5 outline-none focus:border-primary"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
                {opt === MAIL_V1_SHARED_MAILBOX ? " (partagée)" : " (ma boîte)"}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[200px] flex-[1.2] text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
            Mot de passe Hostinger
          </span>
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
            placeholder="Mot de passe de la boîte"
            className="mt-1.5 w-full rounded-xl border border-gray/50 bg-white px-3 py-2.5 outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !password.trim()}
          className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Mail className="h-4 w-4" aria-hidden />
          )}
          Connecter &amp; synchroniser
        </button>
      </div>
    </form>
  );
}


function buildForwardDraft(detail: MailThreadDetail): {
  to: string;
  subject: string;
  bodyHtml: string;
} {
  const last = detail.messages[detail.messages.length - 1];
  const subject = detail.thread.subject.trim() || "(sans objet)";
  const fwSubject = /^(fw|fwd|tr)\s*:/i.test(subject) ? subject : `Fw: ${subject}`;
  if (!last) {
    return { to: "", subject: fwSubject, bodyHtml: "" };
  }
  const quoted =
    last.bodyHtml?.trim() ||
    `<pre style="white-space:pre-wrap;font-family:inherit">${(last.bodyText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`;
  return {
    to: "",
    subject: fwSubject,
    bodyHtml: `<p></p><p><br/></p><blockquote style="border-left:3px solid #cbd5e1;margin:12px 0;padding-left:12px;color:#475569"><p><strong>---------- Message transféré ----------</strong><br/>De : ${last.fromAddress}<br/>Date : ${formatMailDate(last.receivedAt)}<br/>Objet : ${last.subject}</p>${quoted}</blockquote>`,
  };
}

function ThreadPane({
  loading,
  detail,
  attachmentsByMessage,
  onClose,
  onReplied,
  onDetailPatch,
  onForward,
  onDeleteThread,
  onMessagesDeleted,
}: {
  loading: boolean;
  detail: MailThreadDetail | null;
  attachmentsByMessage: Map<string, CrmMailAttachment[]>;
  onClose: () => void;
  onReplied: (message: MailThreadMessage) => void;
  onDetailPatch: (detail: MailThreadDetail) => void;
  onForward: (draft: { to: string; subject: string; bodyHtml: string }) => void;
  onDeleteThread: () => void;
  onMessagesDeleted: (messageIds: string[], threadsDeleted: string[]) => void;
}) {
  const { confirm } = useDialog();
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll">("reply");
  const [replyHtml, setReplyHtml] = useState("");
  const [replyText, setReplyText] = useState("");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<OutgoingAttachmentDraft[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftLoadedFor, setDraftLoadedFor] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!detail?.thread.id) return;
    if (draftLoadedFor === detail.thread.id) return;
    const draft = detail.draft;
    skipNextSave.current = true;
    const html =
      draft?.bodyHtml ??
      (draft?.bodyText ? `<p>${draft.bodyText.replace(/\n/g, "<br/>")}</p>` : "");
    setReplyHtml(html);
    setReplyText(draft?.bodyText ?? "");
    setIncludeSignature(draft?.includeSignature ?? true);
    setAttachments([]);
    setReplyMode("reply");
    setSelectedMessageIds([]);
    setEditorKey((k) => k + 1);
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
            bodyText: replyText,
            bodyHtml: replyHtml || null,
            includeSignature,
          });
          setDraftStatus(replyText.trim() || replyHtml.trim() ? "saved" : "idle");
        } catch {
          setDraftStatus("error");
        }
      })();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [replyText, replyHtml, includeSignature, detail?.thread.id, draftLoadedFor]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const drafts = await filesToAttachmentDrafts(files);
      setAttachments((prev) => [...prev, ...drafts].slice(0, 8));
    } catch {
      setSendError("Impossible de lire une pièce jointe.");
    }
  }

  function toggleMessageSelection(messageId: string) {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    );
  }

  async function handleDeleteOneMessage(messageId: string) {
    const ok = await confirm({
      title: "Supprimer le message",
      message:
        "Ce message sera retiré de la conversation CRM. Il ne réapparaîtra pas au Sync.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingMessages(true);
    setSendError(null);
    try {
      const result = await deleteMailMessageApi(messageId);
      setSelectedMessageIds((prev) => prev.filter((id) => id !== messageId));
      onMessagesDeleted([messageId], result.threadsDeleted);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingMessages(false);
    }
  }

  async function handleBulkDeleteMessages() {
    if (selectedMessageIds.length === 0 || deletingMessages) return;
    const count = selectedMessageIds.length;
    const ok = await confirm({
      title: "Supprimer les messages",
      message:
        count === 1
          ? "Ce message sera retiré de la conversation CRM."
          : `${count} messages seront retirés de la conversation CRM.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingMessages(true);
    setSendError(null);
    try {
      const ids = [...selectedMessageIds];
      const result = await bulkDeleteMailMessagesApi(ids);
      setSelectedMessageIds([]);
      onMessagesDeleted(ids, result.threadsDeleted);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingMessages(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!detail || (!replyText.trim() && !replyHtml.trim()) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await replyMailThreadApi(detail.thread.id, {
        bodyText: replyText.trim() || replyHtml.replace(/<[^>]+>/g, " ").trim(),
        bodyHtml: replyHtml.trim() || null,
        includeSignature,
        mode: replyMode,
        attachments: attachments.map(({ filename, contentType, contentBase64 }) => ({
          filename,
          contentType,
          contentBase64,
        })),
      });
      onReplied(result.message);
      skipNextSave.current = true;
      setReplyHtml("");
      setReplyText("");
      setAttachments([]);
      setEditorKey((k) => k + 1);
      setDraftStatus("idle");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Échec de l’envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-gray/25 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Conversation
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              {detail?.thread.subject || (loading ? "Chargement…" : "(sans objet)")}
            </h3>
            {detail && (
              <p className="mt-1 truncate text-sm text-gray-text">
                {participantsLabel(detail.thread.participants)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-gray-text hover:bg-white/80 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {detail && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReplyMode("reply")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  replyMode === "reply"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-text ring-1 ring-gray/40 hover:ring-primary/40",
                )}
              >
                <Reply className="h-3.5 w-3.5" aria-hidden />
                Répondre
              </button>
              <button
                type="button"
                onClick={() => setReplyMode("replyAll")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  replyMode === "replyAll"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-text ring-1 ring-gray/40 hover:ring-primary/40",
                )}
              >
                <ReplyAll className="h-3.5 w-3.5" aria-hidden />
                Répondre à tous
              </button>
              <button
                type="button"
                onClick={() => onForward(buildForwardDraft(detail))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-text ring-1 ring-gray/40 hover:ring-primary/40"
              >
                <Forward className="h-3.5 w-3.5" aria-hidden />
                Transférer
              </button>
              <button
                type="button"
                onClick={onDeleteThread}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/30 hover:bg-accent/5"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Supprimer
              </button>
            </div>
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
              }}
            />
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading && !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          </div>
        ) : (
          <>
            {selectedMessageIds.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
                <p className="text-xs font-semibold text-foreground">
                  {selectedMessageIds.length} message
                  {selectedMessageIds.length > 1 ? "s" : ""} sélectionné
                  {selectedMessageIds.length > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMessageIds([])}
                    className="text-xs font-medium text-gray-text hover:text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkDeleteMessages()}
                    disabled={deletingMessages}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {deletingMessages ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Supprimer
                  </button>
                </div>
              </div>
            )}
            <ul className="space-y-3">
              {(detail?.messages ?? []).map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  attachments={attachmentsByMessage.get(msg.id) ?? []}
                  selected={selectedMessageIds.includes(msg.id)}
                  onToggleSelect={() => toggleMessageSelection(msg.id)}
                  onDelete={() => void handleDeleteOneMessage(msg.id)}
                  deleting={deletingMessages}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <form onSubmit={(e) => void handleSend(e)} className="border-t border-gray/25 bg-white/80 p-4 backdrop-blur-sm">
        {sendError && (
          <p className="mb-2 flex items-start gap-1.5 text-xs text-accent">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {sendError}
          </p>
        )}
        <p className="mb-2 text-[11px] font-medium text-gray-text">
          {replyMode === "replyAll" ? "Réponse à tous" : "Réponse"}
        </p>
        <MailRichEditor
          valueHtml={replyHtml}
          editorKey={`${detail?.thread.id ?? "none"}-${editorKey}`}
          disabled={!detail || sending}
          placeholder="Votre réponse…"
          onChange={(html, text) => {
            setReplyHtml(html);
            setReplyText(text);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray/40 px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            Joindre
            <input
              type="file"
              multiple
              className="hidden"
              disabled={!detail || sending}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {attachments.map((att) => (
            <span
              key={`${att.filename}-${att.sizeBytes}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray/20 px-2 py-1 text-[11px]"
            >
              {att.filename}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((a) => a !== att))}
                aria-label={`Retirer ${att.filename}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs text-gray-text">
              <input
                type="checkbox"
                checked={includeSignature}
                onChange={(e) => setIncludeSignature(e.target.checked)}
                disabled={sending}
              />
              Signature branding
            </label>
            <p className="text-[11px] text-gray-text">
              {draftStatus === "saving" && "Enregistrement…"}
              {draftStatus === "saved" && "Brouillon enregistré"}
              {draftStatus === "error" && "Échec brouillon"}
              {draftStatus === "idle" && "\u00a0"}
            </p>
          </div>
          <button
            type="submit"
            disabled={!detail || sending || (!replyText.trim() && !replyHtml.trim())}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  attachments,
  selected,
  onToggleSelect,
  onDelete,
  deleting,
}: {
  message: MailThreadMessage;
  attachments: CrmMailAttachment[];
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  deleting: boolean;
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
        "rounded-2xl px-4 py-3 text-sm shadow-sm",
        outbound
          ? "ml-6 border border-primary/15 bg-primary-light/60"
          : "mr-6 border border-gray/25 bg-white",
        selected && "ring-2 ring-accent/40",
      )}
    >
      <div className="flex justify-between gap-2 text-[11px] text-gray-text">
        <label className="flex min-w-0 items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 shrink-0 rounded border-gray/50"
            aria-label="Sélectionner le message"
          />
          <span className="truncate font-semibold text-foreground">{message.fromAddress}</span>
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums">{formatMailDate(message.receivedAt)}</span>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Supprimer le message"
            className="rounded-md p-1 text-gray-text hover:bg-accent/10 hover:text-accent disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap wrap-break-word leading-relaxed">{body}</p>
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attachments.map((att) => (
            <li key={att.id}>
              <a
                href={mailAttachmentDownloadUrl(att.id)}
                className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                download={att.filename}
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{att.filename}</span>
                <span className="shrink-0 text-gray-text">({formatBytes(att.sizeBytes)})</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
