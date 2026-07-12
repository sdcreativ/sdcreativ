"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import type { ClientProfile, ProjectStep } from "@/content/client-portal-types";
import { fetchDocuments, fetchDownloadUrl } from "@/lib/documents-api";
import {
  messagesFromTickets,
  resolvePortalProjectSteps,
  ticketsToActivities,
} from "@/lib/client-portal-utils";
import { formatFcfaShort } from "@/lib/format";
import type { StoredDocument } from "@/lib/s3";
import { formatFileSize } from "@/lib/documents-labels";
import type { Ticket, TicketMessage } from "@/lib/tickets";
import { cn } from "@/lib/utils";

type Props = {
  profile: ClientProfile;
  tickets: Ticket[];
  projectSteps?: ProjectStep[] | null;
  onOpenFiles: () => void;
  onOpenProject: () => void;
  onOpenPayments: () => void;
  onOpenMessages: () => void;
  onOpenSupport: () => void;
};

export function ClientPortalDashboard({
  profile,
  tickets,
  projectSteps,
  onOpenFiles,
  onOpenProject,
  onOpenPayments,
  onOpenMessages,
  onOpenSupport,
}: Props) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [ticketMessages, setTicketMessages] = useState<Map<string, TicketMessage[]>>(new Map());

  const paidPercent = useMemo(() => {
    if (profile.totalAmount <= 0) return 0;
    return Math.round((profile.paidAmount / profile.totalAmount) * 100);
  }, [profile.paidAmount, profile.totalAmount]);

  const remaining = Math.max(0, profile.totalAmount - profile.paidAmount);
  const steps = resolvePortalProjectSteps(profile.progress, projectSteps ?? null);
  const activities = ticketsToActivities(tickets);
  const messages = messagesFromTickets(tickets, ticketMessages);

  const loadTicketMessages = useCallback(async (ticketList: Ticket[]) => {
    if (ticketList.length === 0) {
      setTicketMessages(new Map());
      return;
    }

    setMessagesLoading(true);
    try {
      const recent = [...ticketList]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 2);

      const entries: [string, TicketMessage[]][] = await Promise.all(
        recent.map(async (ticket) => {
          const res = await fetch(`/api/espace-client/tickets/${ticket.id}/messages`, {
            credentials: "include",
          });
          if (!res.ok) return [ticket.id, [] as TicketMessage[]];
          const json = (await res.json()) as { messages: TicketMessage[] };
          return [ticket.id, json.messages ?? []] as [string, TicketMessage[]];
        }),
      );

      setTicketMessages(new Map(entries));
    } catch {
      setTicketMessages(new Map());
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments(profile.clientId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [profile.clientId]);

  useEffect(() => {
    void loadTicketMessages(tickets);
  }, [tickets, loadTicketMessages]);

  const previewDocs = documents.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm xl:col-span-3">
          <button
            type="button"
            onClick={onOpenProject}
            className="block w-full text-left transition-opacity hover:opacity-95"
          >
            <div className="relative h-40 bg-gradient-to-br from-[#0a3d6b] via-primary to-[#38bdf8]" />
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                    {profile.projectStatus}
                  </span>
                  {profile.linkedToCrm && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Sync CRM
                    </span>
                  )}
                  <h2 className="mt-3 text-lg font-bold text-foreground">{profile.projectTitle}</h2>
                  <p className="mt-1 text-sm text-gray-text">
                    Début : {profile.startDate} · Livraison estimée : {profile.endDate}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-medium text-gray-text">
                  <span>Progression globale</span>
                  <span>{profile.progress} %</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-light">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${profile.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        </section>

        <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="font-bold text-foreground">Étapes du projet</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step.status === "done" && "bg-emerald-100 text-emerald-700",
                    step.status === "current" && "bg-primary text-white ring-4 ring-primary/20",
                    step.status === "upcoming" && "bg-gray-light text-gray-text",
                  )}
                >
                  {step.status === "done" ? "✓" : step.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.status === "upcoming" ? "text-gray-text" : "text-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-gray-text">
                    {step.status === "done" && "Terminé"}
                    {step.status === "current" && "En cours"}
                    {step.status === "upcoming" && "À venir"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="font-bold text-foreground">Dernières activités</h2>
          {activities.length === 0 ? (
            <EmptyHint className="mt-4">
              Les mises à jour de vos tickets apparaîtront ici.
            </EmptyHint>
          ) : (
            <ul className="mt-4 space-y-3">
              {activities.map((activity) => (
                <li key={activity.id} className="border-b border-gray/30 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="mt-1 text-[11px] text-gray-text">{activity.time}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Messages récents</h2>
            <button
              type="button"
              onClick={onOpenMessages}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tout
            </button>
          </div>
          {messagesLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </div>
          ) : messages.length === 0 ? (
            <EmptyHint>
              Aucun message pour le moment.{" "}
              <button
                type="button"
                onClick={onOpenMessages}
                className="font-semibold text-primary hover:underline"
              >
                Envoyer un message
              </button>
            </EmptyHint>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm",
                    msg.isClient ? "bg-primary-light text-foreground" : "bg-gray-light/70",
                  )}
                >
                  <p className="text-[11px] font-semibold text-gray-text">
                    {msg.author} · {msg.time}
                  </p>
                  <p className="mt-1 line-clamp-3 leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <button type="button" onClick={onOpenPayments} className="w-full text-left">
            <h2 className="font-bold text-foreground">Paiements</h2>
            {profile.totalAmount <= 0 ? (
              <EmptyHint className="mt-4">Échéancier non renseigné pour ce projet.</EmptyHint>
            ) : (
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) ${paidPercent * 3.6}deg, var(--gray-light) 0deg)`,
                  }}
                >
                  <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="text-lg font-bold text-primary">{paidPercent} %</span>
                    <span className="text-[9px] font-medium text-gray-text">Payé</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between gap-4">
                    <span className="text-gray-text">Montant total</span>
                    <span className="font-semibold">{formatFcfaShort(profile.totalAmount)} FCFA</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span className="text-gray-text">Payé</span>
                    <span className="font-semibold text-emerald-600">
                      {formatFcfaShort(profile.paidAmount)} FCFA
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span className="text-gray-text">Reste à payer</span>
                    <span className="font-semibold text-foreground">
                      {formatFcfaShort(remaining)} FCFA
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </button>
        </section>

        <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Documents</h2>
            <button
              type="button"
              onClick={onOpenFiles}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tout
            </button>
          </div>
          {docsLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </div>
          ) : previewDocs.length > 0 ? (
            <DocumentQuickList documents={previewDocs} />
          ) : (
            <EmptyHint>
              Aucun document publié.{" "}
              <button
                type="button"
                onClick={onOpenFiles}
                className="font-semibold text-primary hover:underline"
              >
                Voir les fichiers
              </button>
            </EmptyHint>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-light/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">Besoin d&apos;aide ?</p>
        <button
          type="button"
          onClick={onOpenSupport}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Ouvrir un ticket
        </button>
      </div>
    </div>
  );
}

function EmptyHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("py-4 text-center text-sm text-gray-text", className)}>{children}</p>
  );
}

function DocumentQuickList({ documents }: { documents: StoredDocument[] }) {
  async function download(key: string, name: string) {
    const url = await fetchDownloadUrl(key);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  }

  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.key}
          className="flex items-center gap-3 rounded-lg border border-gray/30 bg-gray-light/40 px-3 py-2.5"
        >
          <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
            <p className="text-[11px] text-gray-text">{formatFileSize(doc.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => void download(doc.key, doc.name)}
            className="rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-primary"
            aria-label={`Télécharger ${doc.name}`}
          >
            <Download className="h-4 w-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
