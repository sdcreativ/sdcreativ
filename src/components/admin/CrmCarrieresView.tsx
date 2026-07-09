"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { PublicJobOfferRecord } from "@/lib/public-job-offers-types";
import {
  createJobOfferApi,
  deleteJobOfferApi,
  fetchCareersSettingsAdmin,
  fetchJobOffersAdmin,
  importStaticJobOffersApi,
  reorderJobOfferApi,
  saveCareersSettingsAdmin,
  updateJobOfferApi,
} from "@/lib/public-job-offers-api";
import { slugifyJobTitle } from "@/lib/public-slug-utils";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmLineListEditor,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";

type JobForm = {
  slug: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
  isVisible: boolean;
};

const emptyJobForm = (): JobForm => ({
  slug: "",
  title: "",
  type: "CDI",
  location: "",
  department: "Commercial",
  description: "",
  missions: [""],
  profile: [""],
  isVisible: true,
});

function recordToJobForm(r: PublicJobOfferRecord): JobForm {
  return {
    slug: r.slug,
    title: r.title,
    type: r.type,
    location: r.location,
    department: r.department,
    description: r.description,
    missions: r.missions.length > 0 ? r.missions : [""],
    profile: r.profile.length > 0 ? r.profile : [""],
    isVisible: r.isVisible,
  };
}

export function CrmCarrieresView() {
  const { confirm } = useDialog();
  const [items, setItems] = useState<PublicJobOfferRecord[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyJobForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobs, careers] = await Promise.all([
        fetchJobOffersAdmin(),
        fetchCareersSettingsAdmin(),
      ]);
      setItems(jobs);
      setBenefits(careers.benefits.length > 0 ? careers.benefits : [""]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function closeJobForm() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyJobForm());
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveCareersSettingsAdmin({
        benefits: benefits.map((s) => s.trim()).filter(Boolean),
      });
      if (creating || editingId) {
        const payload = {
          slug: form.slug.trim(),
          title: form.title.trim(),
          type: form.type.trim(),
          location: form.location.trim(),
          department: form.department.trim(),
          description: form.description.trim(),
          missions: form.missions.map((s) => s.trim()).filter(Boolean),
          profile: form.profile.map((s) => s.trim()).filter(Boolean),
          isVisible: form.isVisible,
        };
        if (creating) await createJobOfferApi(payload);
        else if (editingId) await updateJobOfferApi(editingId, payload);
        closeJobForm();
      }
      await load();
      setMessage("Carrières enregistrées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await importStaticJobOffersApi();
      setMessage(`Import : ${result.imported} offre(s), ${result.skipped} ignorée(s).`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <CrmFormHeader
        icon={Briefcase}
        title="Carrières"
        description="Offres d'emploi et avantages affichés sur /carrieres."
        actions={
          <div className="flex flex-wrap gap-2">
            <CrmSecondaryButton onClick={() => void handleImport()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importer statique
            </CrmSecondaryButton>
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
                setForm(emptyJobForm());
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Ajouter une offre
            </button>
          </div>
        }
      />

      <CrmFormStatus message={message} />

      <form id="crm-carrieres-form" onSubmit={(e) => void handleSaveAll(e)} className="max-w-5xl space-y-6">
        <CrmFormSection title="Avantages employeur" description="Liste affichée sur la page carrières pour attirer les candidats.">
          <CrmLineListEditor
            label="Avantages"
            hint="Chaque ligne correspond à un avantage (ex. télétravail, formation…)."
            values={benefits}
            onChange={(values) => setBenefits(values.length > 0 ? values : [""])}
            placeholder="Ex. Commissions attractives"
            addLabel="Ajouter un avantage"
            minItems={1}
          />
        </CrmFormSection>

        {(creating || editingId) && (
          <CrmFormSection
            title={creating ? "Nouvelle offre" : "Modifier l'offre"}
            description="Renseignez les informations de l'annonce. Le slug sert à l'URL publique."
            className="border-primary/30 ring-1 ring-primary/10"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={closeJobForm}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-text hover:bg-gray-light"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Fermer
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CrmFormField label="Intitulé du poste">
                <input
                  aria-label="Intitulé du poste"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Slug URL" hint="Généré automatiquement depuis le titre si laissé vide.">
                <input
                  aria-label="Slug URL"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  onBlur={() => {
                    if (creating && !form.slug && form.title) {
                      setForm((f) => ({ ...f, slug: slugifyJobTitle(f.title) }));
                    }
                  }}
                  className={crmFieldClass}
                  required
                />
              </CrmFormField>
              <CrmFormField label="Type de contrat">
                <input
                  aria-label="Type de contrat"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={crmFieldClass}
                  placeholder="CDI, Freelance…"
                />
              </CrmFormField>
              <CrmFormField label="Lieu">
                <input
                  aria-label="Lieu"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={crmFieldClass}
                  placeholder="Abidjan, Remote…"
                />
              </CrmFormField>
              <CrmFormField label="Département" className="sm:col-span-2">
                <input
                  aria-label="Département"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <label htmlFor="job-offer-visible" className="flex items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2.5 text-sm sm:col-span-2">
                <input
                  id="job-offer-visible"
                  type="checkbox"
                  aria-label="Publier l'offre sur le site"
                  checked={form.isVisible}
                  onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                  className="rounded border-gray/60"
                />
                Publier l&apos;offre sur le site
              </label>
              <CrmFormField label="Description courte" className="sm:col-span-2">
                <textarea
                  aria-label="Description courte"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={crmFieldClass}
                  rows={2}
                />
              </CrmFormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CrmLineListEditor
                label="Missions"
                values={form.missions}
                onChange={(missions) => setForm({ ...form, missions: missions.length > 0 ? missions : [""] })}
                placeholder="Ex. Prospecter de nouveaux clients"
                addLabel="Ajouter une mission"
                minItems={1}
              />
              <CrmLineListEditor
                label="Profil recherché"
                values={form.profile}
                onChange={(profile) => setForm({ ...form, profile: profile.length > 0 ? profile : [""] })}
                placeholder="Ex. 2 ans d'expérience commerciale"
                addLabel="Ajouter un critère"
                minItems={1}
              />
            </div>
          </CrmFormSection>
        )}

        <CrmFormSection title="Offres publiées" description={loading ? "Chargement…" : `${items.length} offre(s) en base.`}>
          {!loading && items.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray/50 bg-gray-light/30 px-4 py-8 text-center text-sm text-gray-text">
              Aucune offre pour le moment. Importez le contenu statique ou ajoutez une offre.
            </p>
          )}
          {!loading && items.length > 0 && (
            <ul className="divide-y divide-gray/30 rounded-xl border border-gray/30 bg-gray-light/20">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          item.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-gray/20 text-gray-text",
                        )}
                      >
                        {item.isVisible ? "Publiée" : "Masquée"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-text">
                      {item.location} · {item.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      title="Monter"
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await reorderJobOfferApi(item.id, "up");
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-lg p-2 hover:bg-white"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      title="Descendre"
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await reorderJobOfferApi(item.id, "down");
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-lg p-2 hover:bg-white"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      title="Modifier"
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setEditingId(item.id);
                        setForm(recordToJobForm(item));
                      }}
                      className="rounded-lg p-2 hover:bg-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title="Supprimer"
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Supprimer ?",
                          message: item.title,
                          confirmLabel: "Supprimer",
                          variant: "danger",
                        });
                        if (!ok) return;
                        setBusyId(item.id);
                        try {
                          await deleteJobOfferApi(item.id);
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await updateJobOfferApi(item.id, { isVisible: !item.isVisible });
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="rounded-lg p-2 hover:bg-white"
                      title={item.isVisible ? "Masquer" : "Publier"}
                    >
                      {item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CrmFormSection>

        <CrmFormActions saving={saving} formId="crm-carrieres-form" />
      </form>
    </div>
  );
}
