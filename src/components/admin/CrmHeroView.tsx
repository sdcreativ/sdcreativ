"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, Loader2, RotateCcw } from "lucide-react";
import type { SiteHeroSettings } from "@/lib/site-hero-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

async function fetchHeroAdmin(): Promise<SiteHeroSettings> {
  const res = await fetch("/api/admin/site-hero", { credentials: "include" });
  const json = await parseFetchJson<{ hero: SiteHeroSettings }>(res);
  return json.hero;
}

async function saveHeroAdmin(hero: SiteHeroSettings): Promise<SiteHeroSettings> {
  const res = await fetch("/api/admin/site-hero", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(hero),
  });
  const json = await parseFetchJson<{ hero: SiteHeroSettings }>(res);
  return json.hero;
}

async function resetHeroAdmin(): Promise<SiteHeroSettings> {
  const res = await fetch("/api/admin/site-hero/reset", { method: "POST", credentials: "include" });
  const json = await parseFetchJson<{ hero: SiteHeroSettings }>(res);
  return json.hero;
}

export function CrmHeroView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteHeroSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(await fetchHeroAdmin());
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
      const updated = await saveHeroAdmin(form);
      setForm(updated);
      setMessage("Hero enregistré — l'accueil sera mis à jour sous quelques secondes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser le hero ?",
      message: "Les textes par défaut du code seront restaurés.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      setForm(await resetHeroAdmin());
      setMessage("Hero réinitialisé.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <LayoutTemplate className="h-6 w-6 text-primary" aria-hidden />
            Hero accueil
          </h1>
          <p className="mt-1 text-sm text-gray-text">Bannière principale de la page d&apos;accueil.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Réinitialiser
        </button>
      </div>

      {message && (
        <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">
          {message}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-3xl space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surtitre</span>
            <input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre (avant surbrillance)</span>
            <input value={form.titleBefore} onChange={(e) => setForm({ ...form, titleBefore: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Mot en surbrillance</span>
            <input value={form.titleHighlight} onChange={(e) => setForm({ ...form, titleHighlight: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre (après surbrillance)</span>
            <input value={form.titleAfter} onChange={(e) => setForm({ ...form, titleAfter: e.target.value })} className={fieldClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Description</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} rows={3} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Image de fond (URL)</span>
            <input value={form.backgroundImage} onChange={(e) => setForm({ ...form, backgroundImage: e.target.value })} className={fieldClass} required />
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Badges services (liste)</legend>
          <textarea
            value={form.features.join("\n")}
            onChange={(e) => setForm({ ...form, features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            className={fieldClass}
            rows={5}
            placeholder="Un service par ligne"
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Encarts latéraux (label + description, une paire par bloc)</legend>
          {form.highlights.map((h, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <input
                value={h.label}
                onChange={(e) => {
                  const highlights = [...form.highlights];
                  highlights[i] = { ...highlights[i]!, label: e.target.value };
                  setForm({ ...form, highlights });
                }}
                className={fieldClass}
                placeholder="Label"
              />
              <input
                value={h.description}
                onChange={(e) => {
                  const highlights = [...form.highlights];
                  highlights[i] = { ...highlights[i]!, description: e.target.value };
                  setForm({ ...form, highlights });
                }}
                className={fieldClass}
                placeholder="Description"
              />
            </div>
          ))}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Bouton principal</span>
            <input value={form.ctaPrimaryLabel} onChange={(e) => setForm({ ...form, ctaPrimaryLabel: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Lien bouton principal</span>
            <input value={form.ctaPrimaryHref} onChange={(e) => setForm({ ...form, ctaPrimaryHref: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Bouton secondaire</span>
            <input value={form.ctaSecondaryLabel} onChange={(e) => setForm({ ...form, ctaSecondaryLabel: e.target.value })} className={fieldClass} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Lien bouton secondaire</span>
            <input value={form.ctaSecondaryHref} onChange={(e) => setForm({ ...form, ctaSecondaryHref: e.target.value })} className={fieldClass} required />
          </label>
        </fieldset>

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
