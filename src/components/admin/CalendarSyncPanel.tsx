"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarPlus,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";
import type { CalendarOAuthConnection } from "@/lib/calendar-oauth";
import {
  disconnectCalendarOAuth,
  fetchCalendarOAuthStatus,
  triggerCalendarOAuthSync,
} from "@/lib/calendar-api";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { hasCrmPermission } from "@/lib/crm-access";

const providerLabels: Record<CalendarOAuthProvider, string> = {
  google: "Google Calendar",
  microsoft: "Outlook / Microsoft 365",
};

type AgencyAccount = {
  userId: string;
  accountEmail: string | null;
  userName: string | null;
  userEmail: string | null;
  isAgency: boolean;
};

function CalendarAgencyMeetPanel() {
  const { permissions } = useCrmPermissions();
  const canManage = hasCrmPermission(permissions, "settings.manage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [meetAgencyUserId, setMeetAgencyUserId] = useState<string | null>(null);
  const [teamsAgencyUserId, setTeamsAgencyUserId] = useState<string | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<AgencyAccount[]>([]);
  const [microsoftAccounts, setMicrosoftAccounts] = useState<AgencyAccount[]>([]);
  const [zoomConfigured, setZoomConfigured] = useState(false);
  const [zoomHost, setZoomHost] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calendar/agency-settings", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Chargement impossible.");
      const json = (await res.json()) as {
        settings: { meetAgencyUserId: string | null; teamsAgencyUserId: string | null };
        googleAccounts: AgencyAccount[];
        microsoftAccounts: AgencyAccount[];
        zoomConfigured?: boolean;
        zoomHost?: string | null;
      };
      setMeetAgencyUserId(json.settings.meetAgencyUserId);
      setTeamsAgencyUserId(json.settings.teamsAgencyUserId);
      setGoogleAccounts(json.googleAccounts);
      setMicrosoftAccounts(json.microsoftAccounts);
      setZoomConfigured(Boolean(json.zoomConfigured));
      setZoomHost(json.zoomHost ?? null);
    } catch {
      setGoogleAccounts([]);
      setMicrosoftAccounts([]);
      setZoomConfigured(false);
      setZoomHost(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: {
    meetAgencyUserId?: string | null;
    teamsAgencyUserId?: string | null;
  }) {
    if (!canManage) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/calendar/agency-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Enregistrement impossible.");
      }
      const json = (await res.json()) as {
        settings: { meetAgencyUserId: string | null; teamsAgencyUserId: string | null };
      };
      setMeetAgencyUserId(json.settings.meetAgencyUserId);
      setTeamsAgencyUserId(json.settings.teamsAgencyUserId);
      setMessage("Compte agence enregistré.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  function label(account: AgencyAccount): string {
    const who = account.userName || account.userEmail || "Collaborateur";
    const mail = account.accountEmail || account.userEmail;
    return mail ? `${who} — ${mail}` : who;
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
          <Building2 className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Comptes agence Meet / Teams / Zoom</p>
          <p className="mt-0.5 text-sm text-gray-text">
            Un collaborateur connecte Google ou Outlook, puis un admin désigne ce compte comme
            générateur partagé. Zoom utilise l’API Server-to-Server (compte agence dans
            .env.docker).
          </p>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement…
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-text">
                  Google Meet (agence)
                </span>
                <select
                  value={meetAgencyUserId ?? ""}
                  disabled={!canManage || saving}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setMeetAgencyUserId(value);
                    void save({ meetAgencyUserId: value });
                  }}
                  className="w-full rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">— Aucun (fallback individuel) —</option>
                  {googleAccounts.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {label(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-text">
                  Microsoft Teams (agence)
                </span>
                <select
                  value={teamsAgencyUserId ?? ""}
                  disabled={!canManage || saving}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setTeamsAgencyUserId(value);
                    void save({ teamsAgencyUserId: value });
                  }}
                  className="w-full rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">— Aucun (fallback individuel) —</option>
                  {microsoftAccounts.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {label(a)}
                    </option>
                  ))}
                </select>
              </label>
              </div>
              <div className="rounded-xl border border-gray/20 bg-white/80 px-4 py-3">
                <p className="text-sm font-medium text-foreground">Zoom (agence)</p>
                <p className="mt-0.5 text-xs text-gray-text">
                  {zoomConfigured
                    ? `API configurée${zoomHost ? ` — hôte ${zoomHost}` : ""}. Les liens Join sont créés automatiquement.`
                    : "Non configuré. Dans .env.docker : ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_HOST_EMAIL puis restart du conteneur app."}
                </p>
              </div>
            </div>
          )}

          {!canManage && (
            <p className="mt-2 text-xs text-gray-text">
              Seuls les administrateurs (paramètres) peuvent désigner le compte agence.
            </p>
          )}
          {message && <p className="mt-2 text-xs text-gray-text">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export function CalendarSyncPanel() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connections, setConnections] = useState<CalendarOAuthConnection[]>([]);
  const [providers, setProviders] = useState<
    Record<CalendarOAuthProvider, { configured: boolean; connected: boolean }>
  >({
    google: { configured: false, connected: false },
    microsoft: { configured: false, connected: false },
  });
  const [requiresCrmAccount, setRequiresCrmAccount] = useState(false);
  const [message, setMessage] = useState("");

  const feedUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/feed?token=VOTRE_ICAL_FEED_TOKEN`
      : "/api/calendar/feed?token=ICAL_FEED_TOKEN";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await fetchCalendarOAuthStatus();
      setConnections(status.connections);
      setProviders(status.providers);
      setRequiresCrmAccount(status.requiresCrmAccount);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleSync(provider?: CalendarOAuthProvider) {
    setSyncing(true);
    setMessage("");
    try {
      const result = await triggerCalendarOAuthSync(provider);
      setMessage(`Sync OK — ${result.created} créé(s), ${result.updated} mis à jour.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync impossible.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect(provider: CalendarOAuthProvider) {
    setMessage("");
    try {
      await disconnectCalendarOAuth(provider);
      setMessage(`${providerLabels[provider]} déconnecté.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Déconnexion impossible.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Sync OAuth bidirectionnelle</p>
            <p className="mt-0.5 text-sm text-gray-text">
              Connectez Google Calendar ou Outlook pour importer et pousser les événements CRM.
            </p>

            {requiresCrmAccount && (
              <p className="mt-2 text-xs text-amber-700">
                Connectez-vous avec un compte CRM (email + mot de passe) pour activer OAuth.
              </p>
            )}

            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-text">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Chargement…
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(["google", "microsoft"] as CalendarOAuthProvider[]).map((provider) => {
                  const connection = connections.find((c) => c.provider === provider);
                  const meta = providers[provider];

                  return (
                    <div
                      key={provider}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray/20 bg-white/80 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{providerLabels[provider]}</p>
                        <p className="text-xs text-gray-text">
                          {!meta.configured
                            ? "Non configuré sur le serveur"
                            : connection
                              ? `Connecté${connection.accountEmail ? ` — ${connection.accountEmail}` : ""}`
                              : "Non connecté"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {connection ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSync(provider)}
                              disabled={syncing}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray/40 px-3 py-1.5 text-xs font-medium hover:bg-gray-light disabled:opacity-50"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden />
                              Sync
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDisconnect(provider)}
                              className="inline-flex items-center gap-1 rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/5"
                            >
                              <Unplug className="h-3.5 w-3.5" aria-hidden />
                              Déconnecter
                            </button>
                          </>
                        ) : meta.configured && !requiresCrmAccount ? (
                          <a
                            href={`/api/admin/calendar/oauth/${provider}/start`}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                          >
                            Connecter
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {message && <p className="mt-3 text-xs text-gray-text">{message}</p>}
          </div>
        </div>
      </div>

      <CalendarAgencyMeetPanel />

      <div className="rounded-2xl border border-gray/30 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <Link2 className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Flux iCal (lecture seule)</p>
            <p className="mt-0.5 text-sm text-gray-text">
              Abonnez-vous au flux iCal pour afficher les événements CRM et les échéances dans votre
              agenda externe.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="block max-w-full truncate rounded-lg bg-gray-light/80 px-3 py-2 text-xs text-foreground">
                {feedUrl}
              </code>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1 rounded-lg border border-gray/40 px-3 py-2 text-xs font-medium hover:bg-gray-light"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>

            <ul className="mt-4 space-y-2 text-xs text-gray-text">
              <li className="flex items-start gap-2">
                <CalendarPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <strong>Google Calendar :</strong> Autres agendas → S&apos;abonner à partir de l&apos;URL.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <strong>Outlook :</strong> Ajouter un calendrier → Abonnement Internet.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span>
                  <strong>Pièces jointes :</strong> les fichiers restent dans le CRM et les e-mails
                  d’invitation — Google / Outlook ne synchronisent pas les PJ d’événements CRM.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
