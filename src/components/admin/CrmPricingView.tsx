"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeEuro,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  PublicPricingPlanRecord,
  PublicPricingReassuranceRecord,
} from "@/lib/public-pricing";
import {
  createPricingPlanApi,
  createPricingReassuranceApi,
  deletePricingPlanApi,
  deletePricingReassuranceApi,
  fetchPricingPlansAdmin,
  fetchPricingReassuranceAdmin,
  importStaticPricingApi,
  reorderPricingPlanApi,
  updatePricingPlanApi,
  updatePricingReassuranceApi,
} from "@/lib/public-pricing-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type PlanForm = {
  name: string;
  tagline: string;
  priceFrom: string;
  priceNote: string;
  features: string;
  highlighted: boolean;
  variant: "primary" | "accent";
  locale: "fr" | "en";
  isVisible: boolean;
};

type ReassuranceForm = {
  label: string;
  description: string;
  locale: "fr" | "en";
  isVisible: boolean;
};

const emptyPlanForm = (): PlanForm => ({
  name: "",
  tagline: "",
  priceFrom: "",
  priceNote: "",
  features: "",
  highlighted: false,
  variant: "primary",
  locale: "fr",
  isVisible: true,
});

const emptyReassuranceForm = (): ReassuranceForm => ({
  label: "",
  description: "",
  locale: "fr",
  isVisible: true,
});

function planToForm(r: PublicPricingPlanRecord): PlanForm {
  return {
    name: r.name,
    tagline: r.tagline,
    priceFrom: r.priceFrom != null ? String(r.priceFrom) : "",
    priceNote: r.priceNote ?? "",
    features: r.features.join("\n"),
    highlighted: r.highlighted,
    variant: r.variant,
    locale: r.locale as "fr" | "en",
    isVisible: r.isVisible,
  };
}

function reassuranceToForm(r: PublicPricingReassuranceRecord): ReassuranceForm {
  return {
    label: r.label,
    description: r.description,
    locale: r.locale as "fr" | "en",
    isVisible: r.isVisible,
  };
}

function planFormToPayload(form: PlanForm) {
  return {
    name: form.name,
    tagline: form.tagline,
    priceFrom: form.priceFrom.trim() === "" ? null : Number(form.priceFrom),
    priceNote: form.priceNote.trim() || undefined,
    features: form.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
    highlighted: form.highlighted,
    variant: form.variant,
    locale: form.locale,
    isVisible: form.isVisible,
  };
}

export function CrmPricingView() {
  const { confirm, alert } = useDialog();
  const [plans, setPlans] = useState<PublicPricingPlanRecord[]>([]);
  const [reassurance, setReassurance] = useState<PublicPricingReassuranceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localeFilter, setLocaleFilter] = useState<"fr" | "en" | "all">("fr");
  const [formMode, setFormMode] = useState<"plan" | "reassurance" | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingReassuranceId, setEditingReassuranceId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
  const [reassuranceForm, setReassuranceForm] = useState<ReassuranceForm>(emptyReassuranceForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const locale = localeFilter === "all" ? undefined : localeFilter;
    try {
      const [plansData, reassuranceData] = await Promise.all([
        fetchPricingPlansAdmin(locale),
        fetchPricingReassuranceAdmin(locale),
      ]);
      setPlans(plansData);
      setReassurance(reassuranceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les tarifs.");
      setPlans([]);
      setReassurance([]);
    } finally {
      setLoading(false);
    }
  }, [localeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreatePlan() {
    setFormMode("plan");
    setCreating(true);
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm());
    setMessage("");
  }

  function openEditPlan(item: PublicPricingPlanRecord) {
    setFormMode("plan");
    setCreating(false);
    setEditingPlanId(item.id);
    setPlanForm(planToForm(item));
    setMessage("");
  }

  function openCreateReassurance() {
    setFormMode("reassurance");
    setCreating(true);
    setEditingReassuranceId(null);
    setReassuranceForm(emptyReassuranceForm());
    setMessage("");
  }

  function openEditReassurance(item: PublicPricingReassuranceRecord) {
    setFormMode("reassurance");
    setCreating(false);
    setEditingReassuranceId(item.id);
    setReassuranceForm(reassuranceToForm(item));
    setMessage("");
  }

  function closeForm() {
    setFormMode(null);
    setCreating(false);
    setEditingPlanId(null);
    setEditingReassuranceId(null);
    setPlanForm(emptyPlanForm());
    setReassuranceForm(emptyReassuranceForm());
  }

  async function handlePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = planFormToPayload(planForm);
    try {
      if (creating) {
        const item = await createPricingPlanApi(payload);
        setPlans((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Formule ajoutée.");
      } else if (editingPlanId) {
        const item = await updatePricingPlanApi(editingPlanId, payload);
        setPlans((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Formule mise à jour.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReassuranceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      if (creating) {
        const item = await createPricingReassuranceApi(reassuranceForm);
        setReassurance((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Élément de réassurance ajouté.");
      } else if (editingReassuranceId) {
        const item = await updatePricingReassuranceApi(editingReassuranceId, reassuranceForm);
        setReassurance((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Élément de réassurance mis à jour.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(id: string, name: string) {
    const ok = await confirm({
      title: "Supprimer cette formule ?",
      message: `« ${name} » sera retirée du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deletePricingPlanApi(id);
      setPlans((prev) => prev.filter((m) => m.id !== id));
      if (editingPlanId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteReassurance(id: string, label: string) {
    const ok = await confirm({
      title: "Supprimer cet élément ?",
      message: `« ${label} » sera retiré du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deletePricingReassuranceApi(id);
      setReassurance((prev) => prev.filter((m) => m.id !== id));
      if (editingReassuranceId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePlanVisible(item: PublicPricingPlanRecord) {
    setBusyId(item.id);
    try {
      const updated = await updatePricingPlanApi(item.id, { isVisible: !item.isVisible });
      setPlans((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleReassuranceVisible(item: PublicPricingReassuranceRecord) {
    setBusyId(item.id);
    try {
      const updated = await updatePricingReassuranceApi(item.id, { isVisible: !item.isVisible });
      setReassurance((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorderPlan(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await reorderPricingPlanApi(id, direction);
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Réordonnancement impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleImportStatic() {
    const ok = await confirm({
      title: "Importer les tarifs statiques ?",
      message: "Les formules et éléments de réassurance du code seront ajoutés en base (sans écraser les existants).",
      confirmLabel: "Importer",
    });
    if (!ok) return;

    setImporting(true);
    try {
      const result = await importStaticPricingApi();
      await load();
      setMessage(
        `Import : ${result.plansImported} formule(s), ${result.reassuranceImported} réassurance(s) ajoutée(s).`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  const showForm = formMode !== null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BadgeEuro className="h-6 w-6 text-primary" aria-hidden />
            Tarifs
          </h1>
          <p className="mt-1 text-sm text-gray-text">
            Formules tarifaires et éléments de réassurance de la section tarifs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button type="button" onClick={() => void handleImportStatic()} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Importer depuis le code
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["fr", "en", "all"] as const).map((loc) => (
          <button key={loc} type="button" onClick={() => setLocaleFilter(loc)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", localeFilter === loc ? "bg-primary text-white" : "bg-gray-light text-gray-text hover:bg-gray/20")}>
            {loc === "all" ? "Toutes langues" : loc.toUpperCase()}
          </button>
        ))}
      </div>

      {message && <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Section formules */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">Formules tarifaires</h2>
          <button type="button" onClick={openCreatePlan} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter une formule
          </button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement…
          </p>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-8 text-center text-sm text-gray-text">
            Aucune formule en base — le site affiche les données statiques du code.
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((item, index) => (
              <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.name}
                      {item.highlighted && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Mise en avant</span>}
                    </h3>
                    <p className="mt-1 text-sm text-gray-text">{item.tagline}</p>
                    {(item.priceFrom != null || item.priceNote) && (
                      <p className="mt-1 text-sm font-medium">
                        {[item.priceFrom != null ? `${item.priceFrom.toLocaleString("fr-FR")} FCFA` : null, item.priceNote]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <ul className="mt-2 list-inside list-disc text-xs text-gray-text">
                      {item.features.slice(0, 3).map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                      {item.features.length > 3 && <li>…</li>}
                    </ul>
                  </div>
                  <span className="rounded-lg bg-gray-light px-2 py-1 text-xs font-medium text-gray-text">{item.variant}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => openEditPlan(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                  <button type="button" onClick={() => void handleTogglePlanVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                  <button type="button" onClick={() => void handleReorderPlan(item.id, "up")} disabled={busyId === item.id || index === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowUp className="h-3 w-3" aria-hidden />Haut</button>
                  <button type="button" onClick={() => void handleReorderPlan(item.id, "down")} disabled={busyId === item.id || index === plans.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowDown className="h-3 w-3" aria-hidden />Bas</button>
                  <button type="button" onClick={() => void handleDeletePlan(item.id, item.name)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section réassurance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            Réassurance
          </h2>
          <button type="button" onClick={openCreateReassurance} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-light">
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </button>
        </div>

        {loading ? null : reassurance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-8 text-center text-sm text-gray-text">
            Aucun élément de réassurance en base.
          </div>
        ) : (
          <div className="space-y-3">
            {reassurance.map((item) => (
              <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-gray-text">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => openEditReassurance(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                  <button type="button" onClick={() => void handleToggleReassuranceVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                  <button type="button" onClick={() => void handleDeleteReassurance(item.id, item.label)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && formMode === "plan" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">{creating ? "Nouvelle formule" : "Modifier la formule"}</h2>
            <form onSubmit={(e) => void handlePlanSubmit(e)} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Nom</span>
                <input required value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Accroche</span>
                <input required value={planForm.tagline} onChange={(e) => setPlanForm((p) => ({ ...p, tagline: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Prix à partir de (FCFA, optionnel)</span>
                <input type="number" min={0} value={planForm.priceFrom} onChange={(e) => setPlanForm((p) => ({ ...p, priceFrom: e.target.value }))} className={fieldClass} placeholder="Laisser vide si sur devis" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Note de prix</span>
                <input value={planForm.priceNote} onChange={(e) => setPlanForm((p) => ({ ...p, priceNote: e.target.value }))} className={fieldClass} placeholder="HT · devis personnalisé gratuit" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Fonctionnalités (une par ligne)</span>
                <textarea required rows={6} value={planForm.features} onChange={(e) => setPlanForm((p) => ({ ...p, features: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Variante</span>
                <select value={planForm.variant} onChange={(e) => setPlanForm((p) => ({ ...p, variant: e.target.value as "primary" | "accent" }))} className={fieldClass}>
                  <option value="primary">Primary</option>
                  <option value="accent">Accent</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Langue</span>
                <select value={planForm.locale} onChange={(e) => setPlanForm((p) => ({ ...p, locale: e.target.value as "fr" | "en" }))} className={fieldClass}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={planForm.highlighted} onChange={(e) => setPlanForm((p) => ({ ...p, highlighted: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                Mise en avant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={planForm.isVisible} onChange={(e) => setPlanForm((p) => ({ ...p, isVisible: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                Visible sur le site
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && formMode === "reassurance" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">{creating ? "Nouvel élément" : "Modifier l'élément"}</h2>
            <form onSubmit={(e) => void handleReassuranceSubmit(e)} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Libellé</span>
                <input required value={reassuranceForm.label} onChange={(e) => setReassuranceForm((p) => ({ ...p, label: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Description</span>
                <textarea required rows={3} value={reassuranceForm.description} onChange={(e) => setReassuranceForm((p) => ({ ...p, description: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Langue</span>
                <select value={reassuranceForm.locale} onChange={(e) => setReassuranceForm((p) => ({ ...p, locale: e.target.value as "fr" | "en" }))} className={fieldClass}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reassuranceForm.isVisible} onChange={(e) => setReassuranceForm((p) => ({ ...p, isVisible: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                Visible sur le site
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
