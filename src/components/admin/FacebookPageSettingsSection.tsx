"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Share2, Unplug } from "lucide-react";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { hasCrmPermission } from "@/lib/crm-access";
import type { FacebookPageConnectionPublic } from "@/lib/facebook-page";
import { cn } from "@/lib/utils";

export function FacebookPageSettingsSection() {
  const { permissions } = useCrmPermissions();
  const canManage = hasCrmPermission(permissions, "settings.manage");
  const [status, setStatus] = useState<FacebookPageConnectionPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/facebook/status", { credentials: "include" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Chargement impossible.");
      }
      setStatus((await res.json()) as FacebookPageConnectionPublic);
    } catch (err) {
      setStatus(null);
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const flag = new URLSearchParams(window.location.search).get("facebook");
    if (!flag) return;
    if (flag === "connected") setMessage("Page Facebook connectée.");
    else if (flag === "choose") {
      setMessage("Plusieurs Pages disponibles — sélectionnez celle de SD CREATIV.");
    } else if (flag === "no_pages") {
      setMessage("Aucune Page Facebook trouvée sur ce compte.");
    } else if (flag === "state" || flag === "error") {
      setMessage("Connexion Facebook interrompue. Réessayez.");
    }
  }, []);

  async function disconnect() {
    if (!canManage) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/facebook/oauth", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Déconnexion impossible.");
      }
      setMessage("Page Facebook déconnectée.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function selectPage(pageId: string) {
    if (!canManage) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/facebook/select-page", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const json = (await res.json()) as FacebookPageConnectionPublic & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Sélection impossible.");
      setStatus(json);
      setMessage(`Page active : ${json.pageName}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Share2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Connectez la Page Facebook SD CREATIV pour publier les articles blog depuis le CRM.
          Nécessite <code className="text-xs">META_APP_ID</code> /{" "}
          <code className="text-xs">META_APP_SECRET</code> dans{" "}
          <code className="text-xs">.env.docker</code>, puis redémarrage du conteneur{" "}
          <code className="text-xs">app</code>.
        </span>
      </p>

      {!status?.configured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          OAuth Meta non configuré sur le serveur.
        </p>
      ) : null}

      {status?.connected ? (
        <div className="rounded-xl border border-gray/40 bg-white px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Connecté — {status.pageName ?? "Page"}
          </p>
          <p className="mt-1 text-xs text-gray-text">
            ID {status.pageId}
            {status.connectedAt
              ? ` · depuis ${new Date(status.connectedAt).toLocaleString("fr-FR")}`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-text">Aucune Page connectée.</p>
      )}

      {status?.connected && status.availablePages.length > 1 ? (
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Page active
          </span>
          <select
            title="Page Facebook"
            disabled={!canManage || busy}
            value={status.pageId ?? ""}
            onChange={(e) => void selectPage(e.target.value)}
            className="w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {status.availablePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canManage && status?.configured ? (
          <a
            href="/api/admin/facebook/oauth/start"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-2 text-xs font-medium text-white hover:bg-[#166fe5]",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {status.connected ? "Reconnecter" : "Connecter Facebook"}
          </a>
        ) : null}
        {canManage && status?.connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Unplug className="h-3.5 w-3.5" aria-hidden />
            )}
            Déconnecter
          </button>
        ) : null}
      </div>

      {message ? <p className="text-xs text-gray-text">{message}</p> : null}
    </div>
  );
}
