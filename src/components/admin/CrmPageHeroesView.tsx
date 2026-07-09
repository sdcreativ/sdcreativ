"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, Loader2, RotateCcw } from "lucide-react";
import type { PageHeroKey, SitePageHeroesSettings } from "@/lib/site-page-heroes-types";
import { PAGE_HERO_GROUPS, PAGE_HERO_LABELS } from "@/lib/site-page-heroes-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmGroupedTabs,
  CrmHeroPreview,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

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
      <CrmFormHeader
        icon={LayoutTemplate}
        title="Heroes des pages"
        description="Bannières des pages internes (hors accueil et fiches service). Les modifications s'appliquent à toutes les pages en une seule sauvegarde."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <CrmGroupedTabs
        groups={PAGE_HERO_GROUPS}
        labels={PAGE_HERO_LABELS}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />

      <form id="crm-page-heroes-form" onSubmit={(e) => void handleSubmit(e)} className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <CrmFormSection
          title={`Page : ${PAGE_HERO_LABELS[activeKey]}`}
          description="Textes et visuel du bandeau en tête de page."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CrmFormField label="Surtitre" className="sm:col-span-2">
              <input
                value={hero.eyebrow ?? ""}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, eyebrow: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Titre">
              <input
                value={hero.title}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, title: e.target.value } })}
                className={crmFieldClass}
                required
              />
            </CrmFormField>
            <CrmFormField label="Mot en surbrillance">
              <input
                value={hero.highlight ?? ""}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, highlight: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Description" className="sm:col-span-2">
              <textarea
                value={hero.description ?? ""}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, description: e.target.value } })}
                className={crmFieldClass}
                rows={3}
              />
            </CrmFormField>
            <CrmFormField label="Image de fond (URL)" hint="Chemin relatif depuis /public." className="sm:col-span-2">
              <input
                value={hero.backgroundImage ?? ""}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, backgroundImage: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Texte alternatif de l'image" hint="Description pour l'accessibilité et le référencement." className="sm:col-span-2">
              <input
                value={hero.backgroundAlt ?? ""}
                onChange={(e) => setForm({ ...form, [activeKey]: { ...hero, backgroundAlt: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
          </div>
        </CrmFormSection>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <CrmHeroPreview
            eyebrow={hero.eyebrow}
            title={hero.title}
            highlight={hero.highlight}
            description={hero.description}
          />
        </aside>

        <div className="xl:col-span-2">
          <CrmFormActions saving={saving} label="Enregistrer toutes les pages" formId="crm-page-heroes-form" />
        </div>
      </form>
    </div>
  );
}
