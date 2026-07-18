"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Loader2, RotateCcw } from "lucide-react";
import type { SiteAuditSettings } from "@/lib/site-audit-types";
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
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

export function CrmAuditView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteAuditSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-audit", { credentials: "include" });
      const json = await parseFetchJson<{ content: SiteAuditSettings }>(res);
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
      const res = await fetch("/api/admin/site-audit", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseFetchJson<{ content: SiteAuditSettings }>(res);
      setForm(json.content);
      setMessage("Page Audit gratuit enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser Audit ?",
      message: "Le contenu par défaut sera restauré.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-audit/reset", {
        method: "POST",
        credentials: "include",
      });
      const json = await parseFetchJson<{ content: SiteAuditSettings }>(res);
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
        icon={ClipboardCheck}
        title="Audit gratuit"
        description="Contenu de la page /audit-gratuit : axes d’analyse, checklist, FAQ et CTA."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />
      <CrmFormStatus message={message} />
      <form id="crm-audit-form" onSubmit={(e) => void handleSubmit(e)} className="max-w-5xl space-y-6">
        <CrmFormSection title="Axes d’analyse">
          <div className="space-y-3">
            {form.points.map((point, i) => (
              <CrmRepeaterCard
                key={i}
                title="Axe"
                index={i}
                onRemove={
                  form.points.length > 1
                    ? () => setForm({ ...form, points: form.points.filter((_, j) => j !== i) })
                    : undefined
                }
              >
                <CrmIconSelect
                  value={point.icon}
                  onChange={(icon) => {
                    const points = [...form.points];
                    points[i] = { ...points[i]!, icon };
                    setForm({ ...form, points });
                  }}
                />
                <CrmFormField label="Titre">
                  <input
                    value={point.title}
                    onChange={(e) => {
                      const points = [...form.points];
                      points[i] = { ...points[i]!, title: e.target.value };
                      setForm({ ...form, points });
                    }}
                    className={crmFieldClass}
                  />
                </CrmFormField>
                <CrmFormField label="Description">
                  <textarea
                    value={point.description}
                    onChange={(e) => {
                      const points = [...form.points];
                      points[i] = { ...points[i]!, description: e.target.value };
                      setForm({ ...form, points });
                    }}
                    className={crmFieldClass}
                    rows={2}
                  />
                </CrmFormField>
              </CrmRepeaterCard>
            ))}
          </div>
          <CrmSecondaryButton
            onClick={() =>
              setForm({
                ...form,
                points: [
                  ...form.points,
                  { icon: "Search", title: "Nouveau point", description: "Description…" },
                ],
              })
            }
          >
            Ajouter un axe
          </CrmSecondaryButton>
        </CrmFormSection>

        <CrmFormSection title="Checklist">
          <CrmLineListEditor
            values={form.checklist}
            onChange={(checklist) => setForm({ ...form, checklist })}
            placeholder="Élément de checklist…"
            minItems={1}
          />
        </CrmFormSection>

        <CrmFormSection title="FAQ">
          <div className="space-y-3">
            {form.faq.map((item, i) => (
              <CrmRepeaterCard
                key={i}
                title="FAQ"
                index={i}
                onRemove={
                  form.faq.length > 1
                    ? () => setForm({ ...form, faq: form.faq.filter((_, j) => j !== i) })
                    : undefined
                }
              >
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
          <CrmSecondaryButton
            onClick={() =>
              setForm({
                ...form,
                faq: [...form.faq, { question: "Nouvelle question ?", answer: "Réponse…" }],
              })
            }
          >
            Ajouter une FAQ
          </CrmSecondaryButton>
        </CrmFormSection>

        <CrmFormSection title="CTA & formulaire">
          <div className="grid gap-4 sm:grid-cols-2">
            <CrmFormField label="Titre formulaire">
              <input
                value={form.formTitle}
                onChange={(e) => setForm({ ...form, formTitle: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Label CTA principal">
              <input
                value={form.ctaPrimaryLabel}
                onChange={(e) => setForm({ ...form, ctaPrimaryLabel: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Label CTA secondaire">
              <input
                value={form.ctaSecondaryLabel}
                onChange={(e) => setForm({ ...form, ctaSecondaryLabel: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Lien CTA secondaire">
              <input
                value={form.ctaSecondaryHref}
                onChange={(e) => setForm({ ...form, ctaSecondaryHref: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
          </div>
          <CrmFormField label="Pied de formulaire">
            <input
              value={form.formFooter}
              onChange={(e) => setForm({ ...form, formFooter: e.target.value })}
              className={crmFieldClass}
            />
          </CrmFormField>
        </CrmFormSection>

        <CrmFormActions formId="crm-audit-form" saving={saving} />
      </form>
    </div>
  );
}
