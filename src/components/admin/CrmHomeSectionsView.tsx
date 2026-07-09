"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, RotateCcw } from "lucide-react";
import type { SiteMethodSettings } from "@/lib/site-method-types";
import type { SiteWhyUsSettings } from "@/lib/site-why-us-types";
import { LUCIDE_ICON_NAMES, type LucideIconName } from "@/lib/lucide-icon-map";
import { parseFetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmHomeSectionsView() {
  const { confirm } = useDialog();
  const [whyUs, setWhyUs] = useState<SiteWhyUsSettings | null>(null);
  const [method, setMethod] = useState<SiteMethodSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [whyRes, methodRes] = await Promise.all([
        fetch("/api/admin/site-why-us", { credentials: "include" }),
        fetch("/api/admin/site-method", { credentials: "include" }),
      ]);
      const whyJson = await parseFetchJson<{ whyUs: SiteWhyUsSettings }>(whyRes);
      const methodJson = await parseFetchJson<{ method: SiteMethodSettings }>(methodRes);
      setWhyUs(whyJson.whyUs);
      setMethod(methodJson.method);
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
    if (!whyUs || !method) return;
    setSaving(true);
    setMessage("");
    try {
      const [whyRes, methodRes] = await Promise.all([
        fetch("/api/admin/site-why-us", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(whyUs),
        }),
        fetch("/api/admin/site-method", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(method),
        }),
      ]);
      const whyJson = await parseFetchJson<{ whyUs: SiteWhyUsSettings }>(whyRes);
      const methodJson = await parseFetchJson<{ method: SiteMethodSettings }>(methodRes);
      setWhyUs(whyJson.whyUs);
      setMethod(methodJson.method);
      setMessage("Sections accueil enregistrées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser ?",
      message: "Les textes par défaut seront restaurés pour « Pourquoi nous » et « Méthode ».",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/admin/site-why-us/reset", { method: "POST", credentials: "include" }),
        fetch("/api/admin/site-method/reset", { method: "POST", credentials: "include" }),
      ]);
      await load();
      setMessage("Sections réinitialisées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !whyUs || !method) {
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
            <Heart className="h-6 w-6 text-primary" aria-hidden />
            Pourquoi nous & Méthode
          </h1>
          <p className="mt-1 text-sm text-gray-text">Sections de la page d&apos;accueil et aperçu méthode.</p>
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

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-4xl space-y-10">
        <fieldset className="space-y-4 rounded-2xl border border-gray/40 bg-white p-6">
          <legend className="px-2 text-lg font-semibold text-foreground">Pourquoi nous choisir</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surtitre</span>
              <input value={whyUs.eyebrow} onChange={(e) => setWhyUs({ ...whyUs, eyebrow: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre</span>
              <input value={whyUs.title} onChange={(e) => setWhyUs({ ...whyUs, title: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surbrillance</span>
              <input value={whyUs.highlight} onChange={(e) => setWhyUs({ ...whyUs, highlight: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Intro</span>
              <textarea value={whyUs.intro} onChange={(e) => setWhyUs({ ...whyUs, intro: e.target.value })} className={fieldClass} rows={3} required />
            </label>
          </div>
          {whyUs.items.map((item, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-gray/30 p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-gray-text">Icône</span>
                <select
                  value={item.icon}
                  onChange={(e) => {
                    const items = [...whyUs.items];
                    items[i] = { ...items[i]!, icon: e.target.value as LucideIconName };
                    setWhyUs({ ...whyUs, items });
                  }}
                  className={fieldClass}
                >
                  {LUCIDE_ICON_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-text">Titre</span>
                <input
                  value={item.title}
                  onChange={(e) => {
                    const items = [...whyUs.items];
                    items[i] = { ...items[i]!, title: e.target.value };
                    setWhyUs({ ...whyUs, items });
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-gray-text">Description</span>
                <textarea
                  value={item.description}
                  onChange={(e) => {
                    const items = [...whyUs.items];
                    items[i] = { ...items[i]!, description: e.target.value };
                    setWhyUs({ ...whyUs, items });
                  }}
                  className={fieldClass}
                  rows={2}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-gray/40 bg-white p-6">
          <legend className="px-2 text-lg font-semibold text-foreground">Notre méthode</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surtitre</span>
              <input value={method.eyebrow} onChange={(e) => setMethod({ ...method, eyebrow: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre</span>
              <input value={method.title} onChange={(e) => setMethod({ ...method, title: e.target.value })} className={fieldClass} required />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Surbrillance</span>
              <input value={method.highlight} onChange={(e) => setMethod({ ...method, highlight: e.target.value })} className={fieldClass} required />
            </label>
          </div>
          {method.steps.map((step, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-gray/30 p-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-gray-text">N°</span>
                <input
                  value={step.number}
                  onChange={(e) => {
                    const steps = [...method.steps];
                    steps[i] = { ...steps[i]!, number: e.target.value };
                    setMethod({ ...method, steps });
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-text">Icône</span>
                <select
                  value={step.icon}
                  onChange={(e) => {
                    const steps = [...method.steps];
                    steps[i] = { ...steps[i]!, icon: e.target.value as LucideIconName };
                    setMethod({ ...method, steps });
                  }}
                  className={fieldClass}
                >
                  {LUCIDE_ICON_NAMES.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-gray-text">Titre</span>
                <input
                  value={step.title}
                  onChange={(e) => {
                    const steps = [...method.steps];
                    steps[i] = { ...steps[i]!, title: e.target.value };
                    setMethod({ ...method, steps });
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="block sm:col-span-4">
                <span className="mb-1 block text-xs text-gray-text">Description</span>
                <textarea
                  value={step.description}
                  onChange={(e) => {
                    const steps = [...method.steps];
                    steps[i] = { ...steps[i]!, description: e.target.value };
                    setMethod({ ...method, steps });
                  }}
                  className={fieldClass}
                  rows={2}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
