"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Client } from "@/lib/clients";
import {
  fetchClientPortalAccessStatus,
  generateClientPortalAccessApi,
  resendClientPortalAccessApi,
  revokeClientPortalAccessApi,
  type PortalAccessStatus,
} from "@/lib/client-portal-access-api";
import { formatClientDate } from "@/content/clients-labels";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

type Props = {
  client: Client;
  onUpdated: (client: Client) => void;
};

export function ClientPortalAccessPanel({ client, onUpdated }: Props) {
  const { confirm } = useDialog();
  const [status, setStatus] = useState<PortalAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchClientPortalAccessStatus(client.id);
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleGenerate(sendEmail: boolean) {
    setActing(true);
    setError("");
    setMessage("");
    setRevealedToken(null);
    try {
      const result = await generateClientPortalAccessApi(client.id, { sendEmail });
      setStatus(result.status);
      onUpdated(result.client);
      setRevealedToken(result.plainToken);
      setMessage(
        result.emailSent
          ? "Accès générés et envoyés par email au client."
          : sendEmail
            ? "Accès générés (email non envoyé — vérifiez Resend)."
            : "Accès générés — communiquez le code au client de façon sécurisée.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération impossible.");
    } finally {
      setActing(false);
    }
  }

  async function handleResend() {
    const ok = await confirm({
      title: "Renvoyer un nouveau code",
      message:
        "Un nouveau code sera généré et l'ancien sera invalidé. Le client le recevra par email.",
      confirmLabel: "Renvoyer",
    });
    if (!ok) return;

    setActing(true);
    setError("");
    setMessage("");
    setRevealedToken(null);
    try {
      const result = await resendClientPortalAccessApi(client.id);
      setStatus(result.status);
      onUpdated(result.client);
      setRevealedToken(result.plainToken);
      setMessage(
        result.emailSent
          ? "Nouveau code généré et envoyé par email."
          : "Nouveau code généré (email non envoyé).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renvoi impossible.");
    } finally {
      setActing(false);
    }
  }

  async function handleRevoke() {
    const ok = await confirm({
      title: "Révoquer l'accès",
      message: "Le client ne pourra plus se connecter avec son code actuel.",
      confirmLabel: "Révoquer",
      variant: "danger",
    });
    if (!ok) return;

    setActing(true);
    setError("");
    setMessage("");
    setRevealedToken(null);
    try {
      const result = await revokeClientPortalAccessApi(client.id);
      setStatus(result.status);
      onUpdated(result.client);
      setMessage("Accès espace client révoqué.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Révocation impossible.");
    } finally {
      setActing(false);
    }
  }

  async function copyToken() {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      setMessage("Code copié dans le presse-papiers.");
    } catch {
      setError("Copie impossible.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light/30 p-4 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement accès espace client…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary-light/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <KeyRound className="h-4 w-4" aria-hidden />
            Espace client
          </p>
          {status?.portalClientId ? (
            <p className="mt-1 font-mono text-sm text-foreground">{status.portalClientId}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-text">Identifiant non encore créé</p>
          )}
        </div>
        {status?.hasAccess ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-light px-2.5 py-0.5 text-[10px] font-bold uppercase text-gray-text">
            Inactif
          </span>
        )}
      </div>

      {status?.hasEnvToken && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Un code legacy existe encore dans <code className="text-xs">CLIENT_PORTAL_TOKENS</code> (env).
          Les codes CRM en base priment à terme — migrez en régénérant ici.
        </p>
      )}

      {(status?.createdAt || status?.lastSentAt) && (
        <dl className="grid grid-cols-2 gap-2 text-[11px] text-gray-text">
          {status.createdAt && (
            <div>
              <dt className="font-semibold uppercase tracking-wide">Créé le</dt>
              <dd>{formatClientDate(status.createdAt)}</dd>
            </div>
          )}
          {status.lastSentAt && (
            <div>
              <dt className="font-semibold uppercase tracking-wide">Envoyé le</dt>
              <dd>{formatClientDate(status.lastSentAt)}</dd>
            </div>
          )}
        </dl>
      )}

      {revealedToken && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Code d&apos;accès (affiché une seule fois)</p>
          <p className="mt-2 break-all font-mono text-sm font-bold text-foreground">{revealedToken}</p>
          <button
            type="button"
            onClick={() => void copyToken()}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Copier le code
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 text-xs text-accent">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {message && <p className="text-xs text-emerald-800">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {!status?.hasDatabaseToken ? (
          <>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleGenerate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Générer et envoyer par email
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleGenerate(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-light/40 disabled:opacity-50"
            >
              Générer sans email
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleResend()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              Nouveau code + email
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleRevoke()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50",
              )}
            >
              Révoquer
            </button>
          </>
        )}
      </div>

      {status?.portalClientId && (
        <Link
          href="/espace-client"
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Ouvrir le portail
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      )}

      <p className="text-[11px] text-gray-text leading-relaxed">
        Identifiants personnels — ne pas partager. En cas de perte, le client contacte{" "}
        <a href="mailto:contact@sdcreativ.com" className="text-primary hover:underline">
          contact@sdcreativ.com
        </a>{" "}
        avec son email pro et le nom de l&apos;entreprise pour obtenir un nouveau code.
      </p>
    </div>
  );
}
