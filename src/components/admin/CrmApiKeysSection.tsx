"use client";

import { useCallback, useEffect, useState } from "react";
import { API_KEY_SCOPE_LABELS, type ApiKeyScope } from "@/content/priority3-labels";
import {
  createApiKeyApi,
  fetchApiKeys,
  revokeApiKeyApi,
  type ApiKeyRow,
} from "@/lib/api-keys-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { Loader2, Plus, Trash2 } from "lucide-react";

export function CrmApiKeysSection() {
  const { confirm } = useDialog();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("Zapier / Make");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["leads:write"]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setKeys(await fetchApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setError("");
    try {
      const created = await createApiKeyApi({ name, scopes });
      setNewKey(created.plainKey);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  async function handleRevoke(id: string) {
    const ok = await confirm({
      title: "Révoquer la clé ?",
      message: "Cette clé API ne pourra plus être utilisée.",
      confirmLabel: "Révoquer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await revokeApiKeyApi(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Révocation impossible.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        API REST : <code className="text-xs">POST /api/v1/leads</code>,{" "}
        <code className="text-xs">GET /api/v1/invoices</code> — header{" "}
        <code className="text-xs">Authorization: Bearer sk_...</code>
      </p>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {newKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Clé créée (copiez-la maintenant) :</p>
          <code className="mt-2 block break-all text-xs">{newKey}</code>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <input
          className="w-full rounded-xl border px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la clé"
        />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(API_KEY_SCOPE_LABELS) as ApiKeyScope[]).map((scope) => (
            <label key={scope} className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={(e) =>
                  setScopes((prev) =>
                    e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope),
                  )
                }
              />
              {API_KEY_SCOPE_LABELS[scope]}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => void handleCreate()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden />
          Générer une clé
        </button>
      </div>

      <ul className="space-y-2">
        {keys.filter((k) => !k.revokedAt).map((k) => (
          <li key={k.id} className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{k.name}</p>
              <p className="text-xs text-gray-text">{k.keyPrefix}… · {k.scopes.join(", ")}</p>
            </div>
            <button type="button" onClick={() => void handleRevoke(k.id)} className="text-red-600" aria-label="Révoquer">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
