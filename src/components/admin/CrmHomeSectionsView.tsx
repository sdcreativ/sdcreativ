"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, RotateCcw } from "lucide-react";
import type { SiteMethodSettings } from "@/lib/site-method-types";
import type { SiteWhyUsSettings } from "@/lib/site-why-us-types";
import type { LucideIconName } from "@/lib/lucide-icon-map";
import { parseFetchJson } from "@/lib/fetch-json";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmHeroPreview,
  CrmIconSelect,
  CrmRepeaterCard,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

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
      <CrmFormHeader
        icon={Heart}
        title="Pourquoi nous & Méthode"
        description="Sections de la page d'accueil : arguments clés et étapes de votre méthode."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-home-sections-form" onSubmit={(e) => void handleSubmit(e)} className="max-w-5xl space-y-6">
        <CrmFormSection title="Pourquoi nous choisir" description="Bloc d'arguments avec icônes sur la page d'accueil.">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrmFormField label="Surtitre" className="sm:col-span-2">
              <input title="Surtitre" value={whyUs.eyebrow} onChange={(e) => setWhyUs({ ...whyUs, eyebrow: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
            <CrmFormField label="Titre">
              <input title="Titre" value={whyUs.title} onChange={(e) => setWhyUs({ ...whyUs, title: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
            <CrmFormField label="Mot en surbrillance">
              <input title="Mot en surbrillance" value={whyUs.highlight} onChange={(e) => setWhyUs({ ...whyUs, highlight: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
            <CrmFormField label="Introduction" className="sm:col-span-2">
              <textarea title="Introduction" value={whyUs.intro} onChange={(e) => setWhyUs({ ...whyUs, intro: e.target.value })} className={crmFieldClass} rows={3} required />
            </CrmFormField>
          </div>

          <div className="mt-2 rounded-xl border border-gray/30 bg-gray-light/20 p-4">
            <CrmHeroPreview eyebrow={whyUs.eyebrow} title={whyUs.title} highlight={whyUs.highlight} description={whyUs.intro} />
          </div>

          <div className="space-y-3 pt-2">
            {whyUs.items.map((item, i) => (
              <CrmRepeaterCard key={i} title="Argument" index={i}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CrmIconSelect
                    value={item.icon}
                    onChange={(icon) => {
                      const items = [...whyUs.items];
                      items[i] = { ...items[i]!, icon };
                      setWhyUs({ ...whyUs, items });
                    }}
                  />
                  <CrmFormField label="Titre">
                    <input 
                      title="Titre"
                      value={item.title}
                      onChange={(e) => {
                        const items = [...whyUs.items];
                        items[i] = { ...items[i]!, title: e.target.value };
                        setWhyUs({ ...whyUs, items });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Description" className="sm:col-span-2">
                    <textarea title="Description"
                      value={item.description}
                      onChange={(e) => {
                        const items = [...whyUs.items];
                        items[i] = { ...items[i]!, description: e.target.value };
                        setWhyUs({ ...whyUs, items });
                      }}
                      className={crmFieldClass}
                      rows={2}
                    />
                  </CrmFormField>
                </div>
              </CrmRepeaterCard>
            ))}
          </div>
        </CrmFormSection>

        <CrmFormSection title="Notre méthode" description="Étapes numérotées présentant votre processus.">
          <div className="grid gap-4 sm:grid-cols-3">
            <CrmFormField label="Surtitre" className="sm:col-span-3">
              <input title="Surtitre" value={method.eyebrow} onChange={(e) => setMethod({ ...method, eyebrow: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
            <CrmFormField label="Titre">
              <input title="Titre" value={method.title} onChange={(e) => setMethod({ ...method, title: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
            <CrmFormField label="Mot en surbrillance" className="sm:col-span-2">
              <input title="Mot en surbrillance" value={method.highlight} onChange={(e) => setMethod({ ...method, highlight: e.target.value })} className={crmFieldClass} required />
            </CrmFormField>
          </div>

          <div className="space-y-3 pt-2">
            {method.steps.map((step, i) => (
              <CrmRepeaterCard key={i} title="Étape" index={i}>
                <div className="grid gap-3 sm:grid-cols-4">
                  <CrmFormField label="Numéro">
                    <input
                      title="Numéro"
                      value={step.number}
                      onChange={(e) => {
                        const steps = [...method.steps];
                        steps[i] = { ...steps[i]!, number: e.target.value };
                        setMethod({ ...method, steps });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmIconSelect
                    value={step.icon}
                    onChange={(icon) => {
                      const steps = [...method.steps];
                      steps[i] = { ...steps[i]!, icon };
                      setMethod({ ...method, steps });
                    }}
                  />
                  <CrmFormField label="Titre" className="sm:col-span-2">
                    <input
                      title="Titre"
                      value={step.title}
                      onChange={(e) => {
                        const steps = [...method.steps];
                        steps[i] = { ...steps[i]!, title: e.target.value };
                        setMethod({ ...method, steps });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Description" className="sm:col-span-4">
                    <textarea
                      title="Description"
                      value={step.description}
                      onChange={(e) => {
                        const steps = [...method.steps];
                        steps[i] = { ...steps[i]!, description: e.target.value };
                        setMethod({ ...method, steps });
                      }}
                      className={crmFieldClass}
                      rows={2}
                    />
                  </CrmFormField>
                </div>
              </CrmRepeaterCard>
            ))}
          </div>
        </CrmFormSection>

        <CrmFormActions saving={saving} formId="crm-home-sections-form" />
      </form>
    </div>
  );
}
