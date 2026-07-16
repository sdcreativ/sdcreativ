"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Loader2, Mail, X } from "lucide-react";
import { connectMailMailboxApi } from "@/lib/mail-api";
import { cn } from "@/lib/utils";

type AccountMailboxState = {
  mailboxOnboardingPending: boolean;
  webmailUrl: string;
  email: string;
};

export function CrmMailboxOnboardingBanner() {
  const [state, setState] = useState<AccountMailboxState | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectOk, setConnectOk] = useState(false);

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

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    if (!state || !password.trim() || connecting) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await connectMailMailboxApi({
        email: state.email,
        password: password.trim(),
      });
      setPassword("");
      setConnectOk(true);
      await handleDismiss();
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : "Connexion IMAP impossible.",
      );
    } finally {
      setConnecting(false);
    }
  }

  if (!state?.mailboxOnboardingPending) return null;

  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-4 text-sm text-sky-950 shadow-sm",
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-sky-950">Votre boîte mail professionnelle</p>
            <p className="mt-1 leading-relaxed text-sky-900/90">
              Accédez au webmail, puis connectez{" "}
              <span className="font-medium">{state.email}</span> au CRM (messagerie) avec le mot de
              passe Hostinger — il sera chiffré, jamais stocké en clair.
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
        <button
          type="button"
          disabled={dismissing || connecting}
          onClick={() => void handleDismiss()}
          className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-xl border border-sky-200 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-white/60"
          aria-label="Masquer ce message"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Plus tard
        </button>
      </div>

      <form
        onSubmit={(e) => void handleConnect(e)}
        className="rounded-xl border border-sky-200/80 bg-white/70 p-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
          Connecter au CRM
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="mailbox-imap-password">
            Mot de passe boîte Hostinger
          </label>
          <input
            id="mailbox-imap-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={connecting}
            placeholder="Mot de passe de la boîte Hostinger"
            className="min-w-0 flex-1 rounded-xl border border-sky-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={connecting || !password.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            Connecter
          </button>
        </div>
        {connectError && <p className="mt-2 text-xs text-accent">{connectError}</p>}
        {connectOk && (
          <p className="mt-2 text-xs font-medium text-emerald-700">
            Boîte connectée — visible dans Messagerie.
          </p>
        )}
        <p className="mt-2 text-[11px] text-sky-800/80">
          Rotation du mot de passe : resaisissez-le ici (ou via Messagerie / admin) pour mettre à
          jour le CRM.
        </p>
      </form>
    </div>
  );
}
