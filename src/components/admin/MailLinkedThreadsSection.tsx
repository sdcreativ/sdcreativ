"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { fetchMailThreads } from "@/lib/mail-api";
import type { CrmMailThread } from "@/lib/mail/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MailLinkedThreadsSection({
  clientId,
  leadId,
}: {
  clientId?: string;
  leadId?: string;
}) {
  const [threads, setThreads] = useState<CrmMailThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMailThreads({
        clientId,
        leadId,
        limit: 30,
      });
      setThreads(data.threads);
    } catch {
      setThreads([]);
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
        <Mail className="h-4 w-4 text-primary" aria-hidden />
        Emails (messagerie)
      </h3>
      <p className="mt-1 text-xs text-gray-text">
        Conversations Hostinger liées à cette fiche.
      </p>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : threads.length === 0 ? (
        <p className="mt-3 text-sm text-gray-text">
          Aucun email lié. Associez une conversation depuis{" "}
          <Link href="/admin/crm/messagerie" className="font-medium text-primary hover:underline">
            Messagerie
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/admin/crm/messagerie?thread=${thread.id}`}
                className={cn(
                  "block rounded-xl border border-gray/30 bg-gray-light/50 px-3 py-2 transition hover:border-primary/40 hover:bg-primary-light/30",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {thread.subject || "(sans objet)"}
                  </p>
                  <span className="shrink-0 text-[11px] text-gray-text">
                    {formatDate(thread.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-text">{thread.snippet}</p>
                {thread.unreadCount > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                    {thread.unreadCount} non lu(s)
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
