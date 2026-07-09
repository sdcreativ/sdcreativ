"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, RotateCcw } from "lucide-react";
import type { SiteSolutionsIaSettings } from "@/lib/site-solutions-ia-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmIconSelect,
  CrmLineListEditor,
  CrmRepeaterCard,
  CrmSecondaryButton,
  CrmSectionTabs,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

type SolutionsTab = "demo" | "packs" | "faq" | "use-cases" | "cta";

const SOLUTIONS_TABS: { id: SolutionsTab; label: string }[] = [
  { id: "demo", label: "Démo" },
  { id: "packs", label: "Packs" },
  { id: "faq", label: "FAQ" },
  { id: "use-cases", label: "Cas d'usage" },
  { id: "cta", label: "CTA" },
];

export function CrmSolutionsIaView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteSolutionsIaSettings | null>(null);
  const [activeTab, setActiveTab] = useState<SolutionsTab>("demo");
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
      <CrmFormHeader
        icon={Bot}
        title="Solutions IA"
        description="Contenu complet de la page /solutions-ia : démo, offres, FAQ et cas d'usage."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-solutions-ia-form" onSubmit={(e) => void handleSubmit(e)} className="max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <CrmSectionTabs tabs={SOLUTIONS_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "demo" && (
          <CrmFormSection title="Section démo" description="Encart invitant à tester le chatbot intégré au site.">
            <CrmFormField label="Titre">
              <input
                value={form.demoSection.title}
                onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, title: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Description">
              <textarea
                value={form.demoSection.description}
                onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, description: e.target.value } })}
                className={crmFieldClass}
                rows={3}
              />
            </CrmFormField>
            <CrmFormField label="Indication" hint="Texte d'aide affiché sous la description.">
              <input
                value={form.demoSection.hint}
                onChange={(e) => setForm({ ...form, demoSection: { ...form.demoSection, hint: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
          </CrmFormSection>
        )}

        {activeTab === "packs" && (
          <div className="space-y-4">
            {form.packs.map((pack, i) => (
              <CrmFormSection key={pack.id} title={`Pack : ${pack.name}`} description="Offre tarifaire affichée sur la page.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <CrmFormField label="Nom du pack">
                    <input
                      value={pack.name}
                      onChange={(e) => {
                        const packs = [...form.packs];
                        packs[i] = { ...packs[i]!, name: e.target.value };
                        setForm({ ...form, packs });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Prix à partir de (FCFA)" hint="Montant en francs CFA, sans séparateur.">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={pack.priceFrom}
                      onChange={(e) => {
                        const packs = [...form.packs];
                        packs[i] = { ...packs[i]!, priceFrom: Number(e.target.value) };
                        setForm({ ...form, packs });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Accroche" className="sm:col-span-2">
                    <input
                      value={pack.tagline}
                      onChange={(e) => {
                        const packs = [...form.packs];
                        packs[i] = { ...packs[i]!, tagline: e.target.value };
                        setForm({ ...form, packs });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <label className="flex items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2.5 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={pack.highlighted ?? false}
                      onChange={(e) => {
                        const packs = [...form.packs];
                        packs[i] = { ...packs[i]!, highlighted: e.target.checked };
                        setForm({ ...form, packs });
                      }}
                      className="rounded border-gray/60"
                    />
                    Mettre ce pack en avant sur la page
                  </label>
                </div>
                <CrmLineListEditor
                  label="Fonctionnalités incluses"
                  values={pack.features}
                  onChange={(features) => {
                    const packs = [...form.packs];
                    packs[i] = { ...packs[i]!, features: features.filter(Boolean) };
                    setForm({ ...form, packs });
                  }}
                  placeholder="Ex. Chatbot personnalisé"
                  addLabel="Ajouter une fonctionnalité"
                />
              </CrmFormSection>
            ))}
          </div>
        )}

        {activeTab === "faq" && (
          <CrmFormSection title="FAQ IA" description="Questions fréquentes sur vos solutions d'intelligence artificielle.">
            <div className="space-y-3">
              {form.faq.map((item, i) => (
                <CrmRepeaterCard key={i} title="Question" index={i}>
                  <CrmFormField label="Question">
                    <input
                      value={item.question}
                      onChange={(e) => {
                        const faq = [...form.faq];
                        faq[i] = { ...faq[i]!, question: e.target.value };
                        setForm({ ...form, faq });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Réponse">
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const faq = [...form.faq];
                        faq[i] = { ...faq[i]!, answer: e.target.value };
                        setForm({ ...form, faq });
                      }}
                      className={crmFieldClass}
                      rows={3}
                    />
                  </CrmFormField>
                </CrmRepeaterCard>
              ))}
            </div>
          </CrmFormSection>
        )}

        {activeTab === "use-cases" && (
          <CrmFormSection title="Cas d'usage" description="Exemples concrets d'application de l'IA pour vos clients.">
            <div className="space-y-3">
              {form.useCases.map((useCase, i) => (
                <CrmRepeaterCard key={useCase.id} title="Cas d'usage" index={i}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Titre">
                      <input
                        value={useCase.title}
                        onChange={(e) => {
                          const useCases = [...form.useCases];
                          useCases[i] = { ...useCases[i]!, title: e.target.value };
                          setForm({ ...form, useCases });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmIconSelect
                      value={useCase.icon}
                      onChange={(icon) => {
                        const useCases = [...form.useCases];
                        useCases[i] = { ...useCases[i]!, icon };
                        setForm({ ...form, useCases });
                      }}
                    />
                  </div>
                  <CrmFormField label="Description">
                    <textarea
                      value={useCase.description}
                      onChange={(e) => {
                        const useCases = [...form.useCases];
                        useCases[i] = { ...useCases[i]!, description: e.target.value };
                        setForm({ ...form, useCases });
                      }}
                      className={crmFieldClass}
                      rows={2}
                    />
                  </CrmFormField>
                  <CrmLineListEditor
                    label="Bénéfices"
                    values={useCase.benefits}
                    onChange={(benefits) => {
                      const useCases = [...form.useCases];
                      useCases[i] = { ...useCases[i]!, benefits: benefits.filter(Boolean) };
                      setForm({ ...form, useCases });
                    }}
                    placeholder="Ex. Réduction du temps de réponse"
                    addLabel="Ajouter un bénéfice"
                  />
                </CrmRepeaterCard>
              ))}
            </div>
          </CrmFormSection>
        )}

        {activeTab === "cta" && (
          <CrmFormSection title="Appel à l'action" description="Bloc de conversion en bas de la page Solutions IA.">
            <CrmFormField label="Titre">
              <input
                value={form.ctaSection.title}
                onChange={(e) => setForm({ ...form, ctaSection: { ...form.ctaSection, title: e.target.value } })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Description">
              <textarea
                value={form.ctaSection.description}
                onChange={(e) => setForm({ ...form, ctaSection: { ...form.ctaSection, description: e.target.value } })}
                className={crmFieldClass}
                rows={3}
              />
            </CrmFormField>
          </CrmFormSection>
        )}

        <CrmFormActions saving={saving} formId="crm-solutions-ia-form" />
      </form>
    </div>
  );
}
