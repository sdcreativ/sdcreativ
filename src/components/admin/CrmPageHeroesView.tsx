"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, Loader2, RotateCcw } from "lucide-react";
import type { PageHeroKey, SitePageHeroesSettings } from "@/lib/site-page-heroes-types";
import { PAGE_HERO_KEYS, PAGE_HERO_LABELS } from "@/lib/site-page-heroes-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmPageHeroesView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SitePageHeroesSettings | null>(null);
  const [activeKey, setActiveKey] = useState<PageHeroKey>("contact");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-page-heroes", { credentials: "include" });
      const json = await parseFetchJson<{ heroes: SitePageHeroesSettings }>(res);
      setForm(json.heroes);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/site-page-heroes", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseFetchJson<{ heroes: SitePageHeroesSettings }>(res);
      setForm(json.heroes);
      setMessage("Heroes enregistrés — les pages internes seront mises à jour.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser tous les heroes ?",
      message: "Les textes par défaut seront restaurés pour toutes les pages.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-page-heroes/reset", { method: "POST", credentials: "include" });
      const json = await parseFetchJson<{ heroes: SitePageHeroesSettings }>(res);
      setForm(json.heroes);
      setMessage("Heroes réinitialisés.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement…
      </p>
    );
  }

  const hero = form[activeKey];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <LayoutTemplate className="h-6 w-6 text-primary" aria-hidden />
            Heroes des pages
          </h1>
          <p className="mt-1 text-sm text-gray-text">Bannières des pages internes (hors accueil et fiches service).</p>
        </div>
        <button type="button" onClick={() => void handleReset()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
          <RotateCcw className="h-4 w-4" aria-hidden />
          Réinitialiser
        </button>
      </div>

      {message && (
        <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {PAGE_HERO_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKey(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeKey === key ? "bg-primary text-white" : "bg-gray-light text-gray-text hover:bg-gray/20",
            )}
          >
            {PAGE_HERO_LABELS[key]}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold text-foreground">Page : {PAGE_HERO_LABELS[activeKey]}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surtitre</span>
            <input
              value={hero.eyebrow ?? ""}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, eyebrow: e.target.value } })}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre</span>
            <input
              value={hero.title}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, title: e.target.value } })}
              className={fieldClass}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surbrillance</span>
            <input
              value={hero.highlight ?? ""}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, highlight: e.target.value } })}
              className={fieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Description</span>
            <textarea
              value={hero.description ?? ""}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, description: e.target.value } })}
              className={fieldClass}
              rows={3}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Image de fond (URL)</span>
            <input
              value={hero.backgroundImage ?? ""}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, backgroundImage: e.target.value } })}
              className={fieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Alt image</span>
            <input
              value={hero.backgroundAlt ?? ""}
              onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, backgroundAlt: e.target.value } })}
              className={fieldClass}
            />
          </label>
        </div>

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer toutes les pages
        </button>
      </form>
    </div>
  );
}
