"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type TotpStatus = { enabled: boolean; pendingSetup: boolean };

type SetupPayload = {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
};

export function CrmTotpSection() {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/2fa", { credentials: "include" });
      if (!res.ok) {
        setStatus(null);
        return;
      }
      const json = (await res.json()) as { status: TotpStatus };
      setStatus(json.status);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function post(action: string, extra?: Record<string, string>) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/2fa", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = (await res.json()) as {
        error?: string;
        setup?: SetupPayload;
        status?: TotpStatus;
      };
      if (!res.ok) throw new Error(json.error ?? "Action impossible.");
      if (json.setup) setSetup(json.setup);
      if (json.status) setStatus(json.status);
      return json;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement 2FA…
      </div>
    );
  }

  if (!status) {
    return (
      <p className="text-sm text-gray-text">
        Connectez-vous avec un compte CRM (email + mot de passe) pour gérer la 2FA.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-gray/20 bg-white/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Authentification à deux facteurs (TOTP)</p>
          <p className="mt-0.5 text-xs text-gray-text">
            Compatible Google Authenticator, Authy, 1Password, etc. Sans TOTP, un code{" "}
            <span className="font-medium">SD-XXXXXX</span> est envoyé par email à chaque connexion.
          </p>

          <p className="mt-2 text-sm">
            Statut :{" "}
            <span className={status.enabled ? "font-semibold text-emerald-700" : "text-gray-text"}>
              {status.enabled ? "Activée" : status.pendingSetup ? "Configuration en cours" : "Désactivée"}
            </span>
          </p>

          {!status.enabled && !setup && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void post(status.pendingSetup ? "resume" : "setup")}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {status.pendingSetup ? "Reprendre la configuration" : "Activer la 2FA"}
            </button>
          )}

          {!status.enabled && setup && (
            <div className="mt-4 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={setup.qrCodeUrl}
                alt="QR code TOTP"
                width={180}
                height={180}
                className="rounded-lg border border-gray/20 bg-white p-2"
              />
              <p className="text-xs text-gray-text">
                Secret manuel : <code className="rounded bg-gray-light px-1">{setup.secret}</code>
              </p>
              <label className="block text-xs">
                <span className="font-medium text-foreground">Code à 6 chiffres</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${fieldClass} mt-1 max-w-[10rem] tracking-widest`}
                  placeholder="000000"
                />
              </label>
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={async () => {
                  const result = await post("enable", { code });
                  if (result?.status?.enabled) {
                    setSetup(null);
                    setCode("");
                    setMessage("2FA activée avec succès.");
                  }
                }}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Confirmer et activer
              </button>
            </div>
          )}

          {status.enabled && (
            <div className="mt-4 space-y-3">
              <label className="block text-xs">
                <span className="font-medium text-foreground">Mot de passe actuel</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} mt-1 max-w-xs`}
                />
              </label>
              <label className="block text-xs">
                <span className="font-medium text-foreground">Code TOTP actuel</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${fieldClass} mt-1 max-w-[10rem] tracking-widest`}
                  placeholder="000000"
                />
              </label>
              <button
                type="button"
                disabled={busy || !password || code.length !== 6}
                onClick={async () => {
                  const result = await post("disable", { password, code });
                  if (result?.status && !result.status.enabled) {
                    setPassword("");
                    setCode("");
                    setSetup(null);
                    setMessage("2FA désactivée.");
                  }
                }}
                className="rounded-lg border border-accent/40 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50"
              >
                Désactiver la 2FA
              </button>
            </div>
          )}

          {message && <p className="mt-3 text-xs text-gray-text">{message}</p>}
        </div>
      </div>
    </div>
  );
}
