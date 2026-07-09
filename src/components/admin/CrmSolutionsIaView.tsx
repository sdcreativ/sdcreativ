"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, RotateCcw } from "lucide-react";
import type { SiteSolutionsIaSettings } from "@/lib/site-solutions-ia-types";
import { LUCIDE_ICON_NAMES, type LucideIconName } from "@/lib/lucide-icon-map";
import { parseFetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmSolutionsIaView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteSolutionsIaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-solutions-ia", { credentials: "include" });
      const json = await parseFetchJson<{ content: SiteSolutionsIaSettings }>(res);
      setForm(json.content);
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
      const res = await fetch("/api/admin/site-solutions-ia", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseFetchJson<{ content: SiteSolutionsIaSettings }>(res);
      setForm(json.content);
      setMessage("Page Solutions IA enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser Solutions IA ?",
      message: "Le contenu par défaut sera restauré.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-solutions-ia/reset", { method: "POST", credentials: "include" });
      const json = await parseFetchJson<{ content: SiteSolutionsIaSettings }>(res);
      setForm(json.content);
      setMessage("Contenu réinitialisé.");
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
            <Bot className="h-6 w-6 text-primary" aria-hidden />
            Solutions IA
          </h1>
          <p className="mt-1 text-sm text-gray-text">Contenu complet de la page /solutions-ia.</p>
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

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-4xl space-y-8">
        <fieldset className="space-y-3 rounded-2xl border border-gray/40 p-6">
          <legend className="px-2 font-semibold">Section démo</legend>
          <input value={form.demoSection.title} onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, title: e.target.value } })} className={fieldClass} placeholder="Titre" />
          <textarea value={form.demoSection.description} onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, description: e.target.value } })} className={fieldClass} rows={2} title="Description" />
          <input value={form.demoSection.hint} onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, hint: e.target.value } })} className={fieldClass} placeholder="Indication" />
        </fieldset>

        {form.packs.map((pack, i) => (
          <fieldset key={pack.id} className="space-y-3 rounded-2xl border border-gray/40 p-6">
            <legend className="px-2 font-semibold">Pack {pack.name}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={pack.name} onChange={(e) => { const packs = [...form.packs]; packs[i] = { ...packs[i]!, name: e.target.value }; setForm({ ...form, packs }); }} className={fieldClass} title="Nom" />
              <input type="number" value={pack.priceFrom} onChange={(e) => { const packs = [...form.packs]; packs[i] = { ...packs[i]!, priceFrom: Number(e.target.value) }; setForm({ ...form, packs }); }} className={fieldClass} title="Prix" />
              <input value={pack.tagline} onChange={(e) => { const packs = [...form.packs]; packs[i] = { ...packs[i]!, tagline: e.target.value }; setForm({ ...form, packs }); }} className={fieldClass} placeholder="Tagline" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pack.highlighted ?? false} onChange={(e) => { const packs = [...form.packs]; packs[i] = { ...packs[i]!, highlighted: e.target.checked }; setForm({ ...form, packs }); }} />
                Mis en avant
              </label>
            </div>
            <textarea
              value={pack.features.join("\n")}
              onChange={(e) => { const packs = [...form.packs]; packs[i] = { ...packs[i]!, features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }; setForm({ ...form, packs }); }}
              className={fieldClass}
              rows={4}
              placeholder="Fonctionnalités (une par ligne)"
            />
          </fieldset>
        ))}

        <fieldset className="space-y-3 rounded-2xl border border-gray/40 p-6">
          <legend className="px-2 font-semibold">FAQ IA</legend>
          {form.faq.map((item, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-gray/30 p-3">
              <input value={item.question} onChange={(e) => { const faq = [...form.faq]; faq[i] = { ...faq[i]!, question: e.target.value }; setForm({ ...form, faq }); }} className={fieldClass} placeholder="Question" />
              <textarea value={item.answer} onChange={(e) => { const faq = [...form.faq]; faq[i] = { ...faq[i]!, answer: e.target.value }; setForm({ ...form, faq }); }} className={fieldClass} rows={2} placeholder="Réponse" />
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-gray/40 p-6">
          <legend className="px-2 font-semibold">Cas d&apos;usage</legend>
          {form.useCases.map((useCase, i) => (
            <div key={useCase.id} className="space-y-2 rounded-xl border border-gray/30 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={useCase.title} onChange={(e) => { const useCases = [...form.useCases]; useCases[i] = { ...useCases[i]!, title: e.target.value }; setForm({ ...form, useCases }); }} className={fieldClass} title="Titre" />
                <select title="Icône" value={useCase.icon} onChange={(e) => { const useCases = [...form.useCases]; useCases[i] = { ...useCases[i]!, icon: e.target.value as LucideIconName }; setForm({ ...form, useCases }); }} className={fieldClass}>
                  {LUCIDE_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <textarea value={useCase.description} onChange={(e) => { const useCases = [...form.useCases]; useCases[i] = { ...useCases[i]!, description: e.target.value }; setForm({ ...form, useCases }); }} className={fieldClass} rows={2} title="Description" />
              <textarea value={useCase.benefits.join("\n")} onChange={(e) => { const useCases = [...form.useCases]; useCases[i] = { ...useCases[i]!, benefits: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }; setForm({ ...form, useCases }); }} className={fieldClass} rows={3} placeholder="Bénéfices" />
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-gray/40 p-6">
          <legend className="px-2 font-semibold">CTA bas de page</legend>
          <input title="Titre" value={form.ctaSection.title} onChange={(e) => setForm({ ...form, ctaSection: { ...form.ctaSection, title: e.target.value } })} className={fieldClass} />
          <textarea title="Description" value={form.ctaSection.description} onChange={(e) => setForm({ ...form, ctaSection: { ...form.ctaSection, description: e.target.value } })} className={fieldClass} rows={2} />
        </fieldset>

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
