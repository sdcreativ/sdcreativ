"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmSecuritySettings } from "@/lib/crm-security-settings";
import type { LoginLogEntry } from "@/lib/crm-login-logs";
import { Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmSecuritySection() {
  const [security, setSecurity] = useState<CrmSecuritySettings | null>(null);
  const [logs, setLogs] = useState<LoginLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, logsRes] = await Promise.all([
        fetch("/api/admin/settings/security", { credentials: "include" }),
        fetch("/api/admin/login-logs?limit=30", { credentials: "include" }),
      ]);
      if (secRes.ok) {
        const json = (await secRes.json()) as { security: CrmSecuritySettings };
        setSecurity(json.security);
      }
      if (logsRes.ok) {
        const json = (await logsRes.json()) as { logs: LoginLogEntry[] };
        setLogs(json.logs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(partial: Partial<CrmSecuritySettings>) {
    if (!security) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings/security", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = (await res.json()) as { security?: CrmSecuritySettings; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible.");
      setSecurity(json.security ?? security);
      setMessage("Paramètres enregistrés.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement sécurité…
      </div>
    );
  }

  if (!security) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-foreground">Durée session admin (heures)</span>
          <input
            type="number"
            min={1}
            max={720}
            value={security.sessionMaxHours}
            onChange={(e) => setSecurity({ ...security, sessionMaxHours: Number(e.target.value) })}
            onBlur={() => void save({ sessionMaxHours: security.sessionMaxHours })}
            className={`${fieldClass} mt-1`}
            disabled={saving}
          />
          <span className="mt-1 block text-xs text-gray-text">
            Surchargeable via <code className="rounded bg-gray-light px-1">ADMIN_SESSION_MAX_HOURS</code> sur le VPS.
          </span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Webhooks (Slack / Discord / Zapier)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="URL webhook générique (Zapier / Make)"
            value={security.webhooks.genericUrl}
            onChange={(e) =>
              setSecurity({
                ...security,
                webhooks: { ...security.webhooks, genericUrl: e.target.value },
              })
            }
            onBlur={() => void save({ webhooks: security.webhooks })}
            className={fieldClass}
          />
          <input
            placeholder="URL Slack incoming webhook"
            value={security.webhooks.slackUrl}
            onChange={(e) =>
              setSecurity({
                ...security,
                webhooks: { ...security.webhooks, slackUrl: e.target.value },
              })
            }
            onBlur={() => void save({ webhooks: security.webhooks })}
            className={fieldClass}
          />
          <input
            placeholder="URL Discord webhook"
            value={security.webhooks.discordUrl}
            onChange={(e) =>
              setSecurity({
                ...security,
                webhooks: { ...security.webhooks, discordUrl: e.target.value },
              })
            }
            onBlur={() => void save({ webhooks: security.webhooks })}
            className={fieldClass}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={security.webhooks.notifyLeadCreated}
              onChange={(e) => {
                const webhooks = { ...security.webhooks, notifyLeadCreated: e.target.checked };
                setSecurity({ ...security, webhooks });
                void save({ webhooks });
              }}
            />
            Nouveau lead
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={security.webhooks.notifyTicketSla}
              onChange={(e) => {
                const webhooks = { ...security.webhooks, notifyTicketSla: e.target.checked };
                setSecurity({ ...security, webhooks });
                void save({ webhooks });
              }}
            />
            SLA ticket dépassé
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-text">
          Cal.com entrant : POST <code className="rounded bg-gray-light px-1">/api/webhooks/calcom</code> avec{" "}
          <code className="rounded bg-gray-light px-1">Authorization: Bearer CALCOM_WEBHOOK_SECRET</code>
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Double authentification équipe</p>
        <p className="rounded-xl border border-gray/20 bg-gray-light/30 px-4 py-3 text-sm text-gray-text">
          Chaque membre gère son TOTP depuis{" "}
          <a href="/admin/crm/compte" className="font-medium text-primary hover:underline">
            Mon profil → Sécurité
          </a>
          . Sans TOTP activé, un code email est envoyé à chaque connexion.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Journal connexions admin</p>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-text">Aucune connexion enregistrée.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-gray/30 bg-gray-light/20 p-3 text-xs">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap justify-between gap-2 border-b border-gray/10 py-1 last:border-0">
                <span className={log.success ? "text-foreground" : "text-accent"}>
                  {log.success ? "✓" : "✗"} {log.email} {log.name ? `(${log.name})` : ""}
                </span>
                <span className="text-gray-text">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                    new Date(log.createdAt),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <p className="text-xs text-gray-text">{message}</p>}
    </div>
  );
}
