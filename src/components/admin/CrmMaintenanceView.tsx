"use client";

import { useCallback, useEffect, useState } from "react";
import { HardDrive, Loader2, RotateCcw } from "lucide-react";
import type { SiteMaintenanceSettings } from "@/lib/site-maintenance-types";
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

type MaintenanceTab = "plans" | "sla" | "faq" | "highlights";

const MAINTENANCE_TABS: { id: MaintenanceTab; label: string }[] = [
  { id: "plans", label: "Formules" },
  { id: "sla", label: "SLA" },
  { id: "faq", label: "FAQ" },
  { id: "highlights", label: "Points forts" },
];

export function CrmMaintenanceView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteMaintenanceSettings | null>(null);
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("plans");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-maintenance", { credentials: "include" });
      const json = await parseFetchJson<{ content: SiteMaintenanceSettings }>(res);
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
      const res = await fetch("/api/admin/site-maintenance", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseFetchJson<{ content: SiteMaintenanceSettings }>(res);
      setForm(json.content);
      setMessage("Page Maintenance enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser Maintenance ?",
      message: "Le contenu par défaut sera restauré.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-maintenance/reset", {
        method: "POST",
        credentials: "include",
      });
      const json = await parseFetchJson<{ content: SiteMaintenanceSettings }>(res);
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
        icon={HardDrive}
        title="Maintenance"
        description="Contenu de la page /maintenance : formules, comparatif SLA, FAQ et points forts."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-maintenance-form" onSubmit={(e) => void handleSubmit(e)} className="max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <CrmSectionTabs tabs={MAINTENANCE_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "plans" && (
          <div className="space-y-6">
            <CrmFormSection title="En-tête des formules">
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Sur-titre">
                  <input
                    value={form.plansHeading.eyebrow}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plansHeading: { ...form.plansHeading, eyebrow: e.target.value },
                      })
                    }
                    className={crmFieldClass}
                  />
                </CrmFormField>
                <CrmFormField label="Titre">
                  <input
                    value={form.plansHeading.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plansHeading: { ...form.plansHeading, title: e.target.value },
                      })
                    }
                    className={crmFieldClass}
                  />
                </CrmFormField>
                <CrmFormField label="Accent">
                  <input
                    value={form.plansHeading.highlight}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plansHeading: { ...form.plansHeading, highlight: e.target.value },
                      })
                    }
                    className={crmFieldClass}
                  />
                </CrmFormField>
                <CrmFormField label="Description" className="sm:col-span-2">
                  <textarea
                    value={form.plansHeading.description ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plansHeading: { ...form.plansHeading, description: e.target.value },
                      })
                    }
                    className={crmFieldClass}
                    rows={2}
                  />
                </CrmFormField>
              </div>
              <CrmFormField label="Note sous les formules">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className={crmFieldClass}
                  rows={2}
                />
              </CrmFormField>
            </CrmFormSection>

            <CrmFormSection title="Formules">
              <div className="space-y-3">
                {form.plans.map((plan, i) => (
                  <CrmRepeaterCard
                    key={plan.id}
                    title="Formule"
                    index={i}
                    onRemove={
                      form.plans.length > 1
                        ? () => setForm({ ...form, plans: form.plans.filter((_, j) => j !== i) })
                        : undefined
                    }
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CrmFormField label="Identifiant">
                        <input
                          value={plan.id}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, id: e.target.value };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="Nom">
                        <input
                          value={plan.name}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, name: e.target.value };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="Accroche" className="sm:col-span-2">
                        <input
                          value={plan.tagline}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, tagline: e.target.value };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="Prix mensuel (FCFA)">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={plan.priceMonthly}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, priceMonthly: Number(e.target.value) };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="Prix annuel (FCFA)">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={plan.priceAnnual}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, priceAnnual: Number(e.target.value) };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="SLA">
                        <input
                          value={plan.sla}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, sla: e.target.value };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <CrmFormField label="Délai de réponse">
                        <input
                          value={plan.responseTime}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, responseTime: e.target.value };
                            setForm({ ...form, plans });
                          }}
                          className={crmFieldClass}
                        />
                      </CrmFormField>
                      <label className="flex items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2.5 text-sm sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={plan.highlighted ?? false}
                          onChange={(e) => {
                            const plans = [...form.plans];
                            plans[i] = { ...plans[i]!, highlighted: e.target.checked };
                            setForm({ ...form, plans });
                          }}
                          className="rounded border-gray/60"
                        />
                        Mettre cette formule en avant
                      </label>
                    </div>
                    <CrmLineListEditor
                      values={plan.features}
                      onChange={(features) => {
                        const plans = [...form.plans];
                        plans[i] = { ...plans[i]!, features };
                        setForm({ ...form, plans });
                      }}
                      placeholder="Fonctionnalité incluse…"
                      minItems={1}
                    />
                  </CrmRepeaterCard>
                ))}
              </div>
              <CrmSecondaryButton
                onClick={() =>
                  setForm({
                    ...form,
                    plans: [
                      ...form.plans,
                      {
                        id: `plan-${form.plans.length + 1}`,
                        name: "Nouvelle formule",
                        tagline: "Accroche…",
                        priceMonthly: 0,
                        priceAnnual: 0,
                        sla: "Standard",
                        responseTime: "48h ouvrées",
                        features: ["Fonctionnalité…"],
                      },
                    ],
                  })
                }
              >
                Ajouter une formule
              </CrmSecondaryButton>
            </CrmFormSection>
          </div>
        )}

        {activeTab === "sla" && (
          <CrmFormSection title="Comparatif SLA">
            <CrmFormField label="Titre de section">
              <input
                value={form.slaHeading}
                onChange={(e) => setForm({ ...form, slaHeading: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
            <div className="space-y-3">
              {form.slaComparison.map((row, i) => (
                <CrmRepeaterCard
                  key={i}
                  title="Ligne SLA"
                  index={i}
                  onRemove={
                    form.slaComparison.length > 1
                      ? () =>
                          setForm({
                            ...form,
                            slaComparison: form.slaComparison.filter((_, j) => j !== i),
                          })
                      : undefined
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Critère" className="sm:col-span-2">
                      <input
                        value={row.label}
                        onChange={(e) => {
                          const slaComparison = [...form.slaComparison];
                          slaComparison[i] = { ...slaComparison[i]!, label: e.target.value };
                          setForm({ ...form, slaComparison });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Essentiel">
                      <input
                        value={row.essentiel}
                        onChange={(e) => {
                          const slaComparison = [...form.slaComparison];
                          slaComparison[i] = { ...slaComparison[i]!, essentiel: e.target.value };
                          setForm({ ...form, slaComparison });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Professionnel">
                      <input
                        value={row.professionnel}
                        onChange={(e) => {
                          const slaComparison = [...form.slaComparison];
                          slaComparison[i] = {
                            ...slaComparison[i]!,
                            professionnel: e.target.value,
                          };
                          setForm({ ...form, slaComparison });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                    <CrmFormField label="Premium" className="sm:col-span-2">
                      <input
                        value={row.premium}
                        onChange={(e) => {
                          const slaComparison = [...form.slaComparison];
                          slaComparison[i] = { ...slaComparison[i]!, premium: e.target.value };
                          setForm({ ...form, slaComparison });
                        }}
                        className={crmFieldClass}
                      />
                    </CrmFormField>
                  </div>
                </CrmRepeaterCard>
              ))}
            </div>
            <CrmSecondaryButton
              onClick={() =>
                setForm({
                  ...form,
                  slaComparison: [
                    ...form.slaComparison,
                    { label: "Nouveau critère", essentiel: "—", professionnel: "—", premium: "—" },
                  ],
                })
              }
            >
              Ajouter une ligne
            </CrmSecondaryButton>
          </CrmFormSection>
        )}

        {activeTab === "faq" && (
          <CrmFormSection title="FAQ">
            <CrmFormField label="Titre de section">
              <input
                value={form.faqHeading}
                onChange={(e) => setForm({ ...form, faqHeading: e.target.value })}
                className={crmFieldClass}
              />
            </CrmFormField>
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
        )}

        {activeTab === "highlights" && (
          <CrmFormSection title="Points forts">
            <div className="space-y-3">
              {form.highlights.map((item, i) => (
                <CrmRepeaterCard
                  key={i}
                  title="Point fort"
                  index={i}
                  onRemove={
                    form.highlights.length > 1
                      ? () =>
                          setForm({
                            ...form,
                            highlights: form.highlights.filter((_, j) => j !== i),
                          })
                      : undefined
                  }
                >
                  <CrmIconSelect
                    value={item.icon}
                    onChange={(icon) => {
                      const highlights = [...form.highlights];
                      highlights[i] = { ...highlights[i]!, icon };
                      setForm({ ...form, highlights });
                    }}
                  />
                  <CrmFormField label="Titre">
                    <input
                      value={item.title}
                      onChange={(e) => {
                        const highlights = [...form.highlights];
                        highlights[i] = { ...highlights[i]!, title: e.target.value };
                        setForm({ ...form, highlights });
                      }}
                      className={crmFieldClass}
                    />
                  </CrmFormField>
                  <CrmFormField label="Description">
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const highlights = [...form.highlights];
                        highlights[i] = { ...highlights[i]!, description: e.target.value };
                        setForm({ ...form, highlights });
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
                  highlights: [
                    ...form.highlights,
                    { icon: "Wrench", title: "Nouveau point", description: "Description…" },
                  ],
                })
              }
            >
              Ajouter un point fort
            </CrmSecondaryButton>
          </CrmFormSection>
        )}

        <CrmFormActions formId="crm-maintenance-form" saving={saving} />
      </form>
    </div>
  );
}
