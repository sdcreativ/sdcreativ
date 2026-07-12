"use client";

import { useCallback, useEffect, useState } from "react";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type { LegalEntity } from "@/lib/legal-entities";
import { Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmLegalEntitiesSection() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("XOF");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/legal-entities", { credentials: "include" });
      if (res.ok) {
        const json = (await res.json()) as { entities: LegalEntity[] };
        setEntities(json.entities);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/legal-entities", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, currency }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Création impossible.");
      setName("");
      setSlug("");
      setCurrency("XOF");
      setMessage("Entité juridique ajoutée.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement entités juridiques…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray/30 bg-white p-5">
      <h3 className="text-sm font-semibold text-foreground">Entités juridiques & devises</h3>
      <p className="mt-1 text-xs text-gray-text">
        Associez devis et factures à une structure (multi-entités, hors XOF).
      </p>

      {entities.length === 0 ? (
        <p className="mt-3 text-sm text-gray-text">Aucune entité — la structure par défaut sera créée au prochain démarrage.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {entities.map((entity) => (
            <li
              key={entity.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray/20 bg-gray-light/20 px-3 py-2"
            >
              <span className="font-medium text-foreground">{entity.name}</span>
              <span className="text-xs text-gray-text">
                {entity.slug} · {CURRENCY_LABELS[entity.currency]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Raison sociale"
          required
          className={fieldClass}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="slug (ex: sd-creativ-eu)"
          required
          pattern="^[a-z0-9-]+$"
          className={fieldClass}
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className={fieldClass}
          aria-label="Devise par défaut"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Ajouter une entité"}
        </button>
      </form>

      {message && <p className="mt-2 text-xs text-gray-text">{message}</p>}
    </div>
  );
}
