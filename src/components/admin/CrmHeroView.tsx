"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, Loader2, Plus, RotateCcw } from "lucide-react";
import type { SiteHeroSettings } from "@/lib/site-hero-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmHeroPreview,
  CrmLineListEditor,
  CrmRepeaterCard,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

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
      <CrmFormHeader
        icon={LayoutTemplate}
        title="Hero accueil"
        description="Bannière principale de la page d'accueil."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-hero-form" onSubmit={(e) => void handleSubmit(e)} className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <CrmFormSection title="Textes principaux" description="Surtitre, titre et description affichés en haut de l'accueil.">
            <div className="grid gap-4 sm:grid-cols-2">
              <CrmFormField label="Surtitre" className="sm:col-span-2">
                <input
                  title="Surtitre"
                  value={form.eyebrow}
                  onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Titre (avant surbrillance)">
                <input
                  title="Titre (avant surbrillance)"
                  value={form.titleBefore}
                  onChange={(e) => setForm({ ...form, titleBefore: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Mot en surbrillance">
                <input
                  title="Mot en surbrillance"
                  value={form.titleHighlight}
                  onChange={(e) => setForm({ ...form, titleHighlight: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Titre (après surbrillance)" className="sm:col-span-2">
                <input
                  title="Titre (après surbrillance)"
                  value={form.titleAfter}
                  onChange={(e) => setForm({ ...form, titleAfter: e.target.value })}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <CrmFormField label="Description" className="sm:col-span-2">
                <textarea
                  title="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={crmFieldClass}
                  rows={3}
                  required
                />
              </CrmFormField>
            </div>
          </CrmFormSection>

          <CrmFormSection title="Média & badges" description="Image de fond et liste des services mis en avant.">
            <CrmFormField label="Image de fond (URL)" hint="Chemin relatif depuis /public, ex. /images/services/services-hero-bg.png">
              <input
                title="Image de fond (URL)"
                value={form.backgroundImage}
                onChange={(e) => setForm({ ...form, backgroundImage: e.target.value })}
                className={crmFieldClass}
                required
              />
            </CrmFormField>
            <CrmLineListEditor
              label="Badges services"
              hint="Chaque ligne apparaît comme un badge sous le hero."
              values={form.features}
              onChange={(features) => setForm({ ...form, features: features.filter(Boolean) })}
              placeholder="Ex. Sites vitrines"
              addLabel="Ajouter un badge"
            />
          </CrmFormSection>

          <CrmFormSection title="Encarts latéraux" description="Points forts affichés à droite du hero sur grand écran.">
            <div className="space-y-3">
              {form.highlights.map((h, i) => (
                <CrmRepeaterCard
                  key={i}
                  title="Encart"
                  index={i}
                  onRemove={
                    form.highlights.length > 1
                      ? () => setForm({ ...form, highlights: form.highlights.filter((_, idx) => idx !== i) })
                      : undefined
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Label">
                      <input
                        title="Label"
                        value={h.label}
                        onChange={(e) => {
                          const highlights = [...form.highlights];
                          highlights[i] = { ...highlights[i]!, label: e.target.value };
                          setForm({ ...form, highlights });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Description">
                      <input
                        title="Description"
                        value={h.description}
                        onChange={(e) => {
                          const highlights = [...form.highlights];
                          highlights[i] = { ...highlights[i]!, description: e.target.value };
                          setForm({ ...form, highlights });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                  </div>
                </CrmRepeaterCard>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, highlights: [...form.highlights, { label: "", description: "" }] })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray/60 px-3 py-2 text-sm font-medium text-gray-text hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter un encart
              </button>
            </div>
          </CrmFormSection>

          <CrmFormSection title="Boutons d'action" description="Liens des deux boutons sous la description.">
            <div className="grid gap-4 sm:grid-cols-2">
              <CrmFormField label="Bouton principal">
                <input
                  title="Bouton principal"
                  value={form.ctaPrimaryLabel}
                  onChange={(e) => setForm({ ...form, ctaPrimaryLabel: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Lien bouton principal">
                <input
                  title="Lien bouton principal"
                  value={form.ctaPrimaryHref}
                  onChange={(e) => setForm({ ...form, ctaPrimaryHref: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Bouton secondaire">
                <input
                  title="Bouton secondaire"
                  value={form.ctaSecondaryLabel}
                  onChange={(e) => setForm({ ...form, ctaSecondaryLabel: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Lien bouton secondaire">
                <input
                  title="Lien bouton secondaire"
                  value={form.ctaSecondaryHref}
                  onChange={(e) => setForm({ ...form, ctaSecondaryHref: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
            </div>
          </CrmFormSection>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <CrmHeroPreview
            eyebrow={form.eyebrow}
            title={form.titleBefore}
            highlight={form.titleHighlight}
            titleAfter={form.titleAfter}
            description={form.description}
          />
        </aside>

        <div className="xl:col-span-2">
          <CrmFormActions saving={saving} formId="crm-hero-form" />
        </div>
      </form>
    </div>
  );
}
