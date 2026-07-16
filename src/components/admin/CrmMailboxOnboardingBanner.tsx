"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountMailboxState = {
  mailboxOnboardingPending: boolean;
  webmailUrl: string;
  email: string;
};

export function CrmMailboxOnboardingBanner() {
  const [state, setState] = useState<AccountMailboxState | null>(null);
  const [dismissing, setDismissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/account", { credentials: "include" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        account?: {
          email: string;
          mailboxOnboardingPending?: boolean;
          webmailUrl?: string;
        };
      };
      if (!json.account?.mailboxOnboardingPending) {
        setState(null);
        return;
      }
      setState({
        email: json.account.email,
        mailboxOnboardingPending: true,
        webmailUrl: json.account.webmailUrl ?? "https://webmail.hostinger.com",
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch("/api/admin/account/mailbox-onboarding", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setState(null);
    } finally {
      setDismissing(false);
    }
  }

  if (!state?.mailboxOnboardingPending) return null;

  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-4 text-sm text-sky-950 shadow-sm sm:flex-row sm:items-start sm:justify-between",
      )}
      role="status"
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <Mail className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-sky-950">Votre boîte mail professionnelle</p>
          <p className="mt-1 leading-relaxed text-sky-900/90">
            Un email a été envoyé à votre adresse personnelle avec vos accès (
            <span className="font-medium">{state.email}</span> et mot de passe temporaire).
            Consultez aussi votre webmail pour les futurs codes de connexion.
          </p>
          <a
            href={state.webmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            Ouvrir le webmail Hostinger
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button
          type="button"
          disabled={dismissing}
          onClick={() => void handleDismiss()}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          J&apos;ai accédé à ma boîte
        </button>
        <button
          type="button"
          disabled={dismissing}
          onClick={() => void handleDismiss()}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-200 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-white/60"
          aria-label="Masquer ce message"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Masquer
        </button>
      </div>
    </div>
  );
}
