"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import type { NewsletterSubscriber, WaitlistEntry } from "@/lib/marketing-subscribers";
import {
  deleteWaitlistEntryApi,
  fetchNewsletterSubscribers,
  fetchWaitlistEntries,
  patchNewsletterSubscriberApi,
} from "@/lib/marketing-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { CrmMarketingSequencesPanel } from "@/components/admin/CrmMarketingSequencesPanel";
import { cn } from "@/lib/utils";

const INTEREST_LABELS: Record<string, string> = {
  "espace-client": "Espace client",
  crm: "CRM interne",
  general: "Intérêt général",
};

type Tab = "newsletter" | "waitlist" | "sequences";

export function CrmMarketingView() {
  const [tab, setTab] = useState<Tab>("newsletter");
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { confirm } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [subs, entries] = await Promise.all([
        fetchNewsletterSubscribers(),
        fetchWaitlistEntries(),
      ]);
      setSubscribers(subs);
      setWaitlist(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSubs = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-sky-50/40 px-4 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Newsletter</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{activeSubs}</p>
          <p className="text-xs text-gray-text">abonné(s) actifs</p>
        </div>
        <div className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-violet-50/40 px-4 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Waitlist</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{waitlist.length}</p>
          <p className="text-xs text-gray-text">inscription(s) Phase 2</p>
        </div>
      </div>

      <nav className="flex gap-1 rounded-2xl border border-gray/30 bg-gray-light/30 p-1.5">
        {(
          [
            { id: "newsletter" as const, label: "Newsletter", icon: Mail },
            { id: "waitlist" as const, label: "Waitlist", icon: UserPlus },
            { id: "sequences" as const, label: "Séquences", icon: Mail },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              tab === id ? "bg-white text-foreground shadow-sm" : "text-gray-text hover:bg-white/70",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : tab === "newsletter" ? (
        subscribers.length === 0 ? (
          <EmptyState>Aucun abonné newsletter pour le moment.</EmptyState>
        ) : (
          <ul className="divide-y divide-gray/20 overflow-hidden rounded-2xl border border-gray/30 bg-white">
            {subscribers.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div>
                  <p className="font-medium text-foreground">{sub.email}</p>
                  <p className="text-xs text-gray-text">
                    Inscrit le {new Date(sub.createdAt).toLocaleDateString("fr-FR")} · {sub.source}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                      sub.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-light text-gray-text",
                    )}
                  >
                    {sub.status === "active" ? "Actif" : "Désabonné"}
                  </span>
                  {sub.status === "active" && (
                    <button
                      type="button"
                      onClick={() =>
                        void patchNewsletterSubscriberApi(sub.id, "unsubscribe")
                          .then(load)
                          .catch((err) =>
                            setError(
                              err instanceof Error ? err.message : "Désabonnement impossible.",
                            ),
                          )
                      }
                      className="rounded-lg px-2 py-1 text-xs font-medium text-gray-text hover:bg-gray-light/60"
                    >
                      Désabonner
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer l'abonné",
                        message: `Supprimer ${sub.email} ?`,
                        confirmLabel: "Supprimer",
                        variant: "danger",
                      });
                      if (!ok) return;
                      try {
                        await patchNewsletterSubscriberApi(sub.id, "delete");
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Suppression impossible.");
                      }
                    }}
                    className="rounded-lg p-1.5 text-accent hover:bg-accent/5"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : tab === "sequences" ? (
        <CrmMarketingSequencesPanel />
      ) : waitlist.length === 0 ? (
        <EmptyState>Aucune inscription waitlist.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {waitlist.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-gray/25 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">{entry.name}</p>
                  <p className="text-sm text-gray-text">{entry.email}</p>
                  {entry.company && (
                    <p className="mt-1 text-xs text-gray-text">{entry.company}</p>
                  )}
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700">
                  {INTEREST_LABELS[entry.interest] ?? entry.interest}
                </span>
              </div>
              {entry.message && (
                <p className="mt-3 text-sm leading-relaxed text-gray-text">{entry.message}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-gray/15 pt-3">
                <p className="text-xs text-gray-text">
                  {new Date(entry.createdAt).toLocaleString("fr-FR")}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Supprimer",
                      message: "Supprimer cette inscription ?",
                      confirmLabel: "Supprimer",
                      variant: "danger",
                    });
                    if (!ok) return;
                    try {
                      await deleteWaitlistEntryApi(entry.id);
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Suppression impossible.");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/5"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray/40 bg-gray-light/20 px-4 py-12 text-center">
      <Mail className="mx-auto h-9 w-9 text-gray-text/40" aria-hidden />
      <p className="mt-3 text-sm font-medium text-foreground">{children}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-gray-text">
        Les inscriptions du site public apparaîtront ici automatiquement.
      </p>
    </div>
  );
}
