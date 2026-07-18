"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Scale } from "lucide-react";
import type { SiteLegalSettings } from "@/lib/site-legal-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmLineListEditor,
  CrmRepeaterCard,
  CrmSecondaryButton,
  CrmSectionTabs,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

type LegalTab = "mentions" | "privacy" | "identity";

const LEGAL_TABS: { id: LegalTab; label: string }[] = [
  { id: "identity", label: "Identité" },
  { id: "mentions", label: "Mentions légales" },
  { id: "privacy", label: "Confidentialité" },
];

export function CrmLegalView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteLegalSettings | null>(null);
  const [activeTab, setActiveTab] = useState<LegalTab>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-legal", { credentials: "include" });
      const json = await parseFetchJson<{ content: SiteLegalSettings }>(res);
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
      const res = await fetch("/api/admin/site-legal", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseFetchJson<{ content: SiteLegalSettings }>(res);
      setForm(json.content);
      setMessage("Contenu légal enregistré.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser le contenu légal ?",
      message: "Le contenu par défaut sera restauré.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-legal/reset", {
        method: "POST",
        credentials: "include",
      });
      const json = await parseFetchJson<{ content: SiteLegalSettings }>(res);
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
        icon={Scale}
        title="Légal"
        description="Mentions légales, politique de confidentialité et informations d’identité."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-legal-form" onSubmit={(e) => void handleSubmit(e)} className="max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <CrmSectionTabs tabs={LEGAL_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "identity" && (
          <CrmFormSection title="Identité légale">
            <CrmFormField label="Forme juridique">
              <input
                value={form.legalForm}
                onChange={(e) => setForm({ ...form, legalForm: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <CrmFormField label="Directeur de publication">
              <textarea
                value={form.publicationDirector}
                onChange={(e) => setForm({ ...form, publicationDirector: e.target.value })}
                className={crmFieldClass}
                rows={2}
              />
            </CrmFormField>
            <CrmFormField label="Libellé « dernière mise à jour »">
              <input
                value={form.privacyUpdatedLabel}
                onChange={(e) => setForm({ ...form, privacyUpdatedLabel: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
          </CrmFormSection>
        )}

        {activeTab === "mentions" && (
          <CrmFormSection title="Sections mentions légales">
            <div className="space-y-3">
              {form.mentionsSections.map((section, i) => (
                <CrmRepeaterCard
                  key={section.id}
                  title="Section"
                  index={i}
                  onRemove={
                    form.mentionsSections.length > 1
                      ? () =>
                          setForm({
                            ...form,
                            mentionsSections: form.mentionsSections.filter((_, j) => j !== i),
                          })
                      : undefined
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Identifiant">
                      <input
                        value={section.id}
                        onChange={(e) => {
                          const mentionsSections = [...form.mentionsSections];
                          mentionsSections[i] = { ...mentionsSections[i]!, id: e.target.value };
                          setForm({ ...form, mentionsSections });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Titre">
                      <input
                        value={section.title}
                        onChange={(e) => {
                          const mentionsSections = [...form.mentionsSections];
                          mentionsSections[i] = { ...mentionsSections[i]!, title: e.target.value };
                          setForm({ ...form, mentionsSections });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                  </div>
                  <CrmLineListEditor
                    values={section.paragraphs ?? []}
                    onChange={(paragraphs) => {
                      const mentionsSections = [...form.mentionsSections];
                      mentionsSections[i] = { ...mentionsSections[i]!, paragraphs };
                      setForm({ ...form, mentionsSections });
                    }}
                    placeholder="Paragraphe…"
                    minItems={0}
                  />
                </CrmRepeaterCard>
              ))}
            </div>
            <CrmSecondaryButton
              onClick={() =>
                setForm({
                  ...form,
                  mentionsSections: [
                    ...form.mentionsSections,
                    {
                      id: `section-${form.mentionsSections.length + 1}`,
                      title: "Nouvelle section",
                      paragraphs: ["Paragraphe…"],
                    },
                  ],
                })
              }
            >
              Ajouter une section
            </CrmSecondaryButton>
          </CrmFormSection>
        )}

        {activeTab === "privacy" && (
          <CrmFormSection title="Sections confidentialité">
            <div className="space-y-3">
              {form.privacySections.map((section, i) => (
                <CrmRepeaterCard
                  key={section.id}
                  title="Section"
                  index={i}
                  onRemove={
                    form.privacySections.length > 1
                      ? () =>
                          setForm({
                            ...form,
                            privacySections: form.privacySections.filter((_, j) => j !== i),
                          })
                      : undefined
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Identifiant">
                      <input
                        value={section.id}
                        onChange={(e) => {
                          const privacySections = [...form.privacySections];
                          privacySections[i] = { ...privacySections[i]!, id: e.target.value };
                          setForm({ ...form, privacySections });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Titre">
                      <input
                        value={section.title}
                        onChange={(e) => {
                          const privacySections = [...form.privacySections];
                          privacySections[i] = { ...privacySections[i]!, title: e.target.value };
                          setForm({ ...form, privacySections });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                  </div>
                  <CrmFormField label="Introduction">
                    <textarea
                      value={section.intro ?? ""}
                      onChange={(e) => {
                        const privacySections = [...form.privacySections];
                        privacySections[i] = {
                          ...privacySections[i]!,
                          intro: e.target.value || undefined,
                        };
                        setForm({ ...form, privacySections });
                      }}
                      className={crmFieldClass}
                      rows={2}
                    />
                  </CrmFormField>
                  <CrmLineListEditor
                    values={section.paragraphs ?? []}
                    onChange={(paragraphs) => {
                      const privacySections = [...form.privacySections];
                      privacySections[i] = {
                        ...privacySections[i]!,
                        paragraphs: paragraphs.length ? paragraphs : undefined,
                      };
                      setForm({ ...form, privacySections });
                    }}
                    placeholder="Paragraphe…"
                    minItems={0}
                  />
                  <CrmLineListEditor
                    values={section.bullets ?? []}
                    onChange={(bullets) => {
                      const privacySections = [...form.privacySections];
                      privacySections[i] = {
                        ...privacySections[i]!,
                        bullets: bullets.length ? bullets : undefined,
                      };
                      setForm({ ...form, privacySections });
                    }}
                    placeholder="Puce…"
                    minItems={0}
                  />
                  <CrmFormField label="Pied de section">
                    <textarea
                      value={section.footer ?? ""}
                      onChange={(e) => {
                        const privacySections = [...form.privacySections];
                        privacySections[i] = {
                          ...privacySections[i]!,
                          footer: e.target.value || undefined,
                        };
                        setForm({ ...form, privacySections });
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
                  privacySections: [
                    ...form.privacySections,
                    {
                      id: `privacy-${form.privacySections.length + 1}`,
                      title: "Nouvelle section",
                      paragraphs: ["Paragraphe…"],
                    },
                  ],
                })
              }
            >
              Ajouter une section
            </CrmSecondaryButton>
          </CrmFormSection>
        )}

        <CrmFormActions formId="crm-legal-form" saving={saving} />
      </form>
    </div>
  );
}
