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
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import type { PublicRealisationRecord } from "@/lib/public-realisations";
import {
  createRealisationApi,
  deleteRealisationApi,
  fetchRealisationsAdmin,
  importStaticRealisationsApi,
  reorderRealisationApi,
  updateRealisationApi,
} from "@/lib/public-realisations-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Form = {
  title: string;
  client: string;
  sector: string;
  location: string;
  year: string;
  duration: string;
  category: string;
  description: string;
  tags: string;
  stack: string;
  image: string;
  imageAlt: string;
  accent: string;
  metricValue: string;
  metricLabel: string;
  featured: boolean;
  caseStudyChallenge: string;
  caseStudySolution: string;
  caseStudyResults: string;
  testimonialQuote: string;
  testimonialAuthor: string;
  testimonialRole: string;
  locale: "fr" | "en";
  isVisible: boolean;
};

const emptyForm = (): Form => ({
  title: "",
  client: "",
  sector: "",
  location: "",
  year: new Date().getFullYear().toString(),
  duration: "",
  category: "",
  description: "",
  tags: "",
  stack: "",
  image: "",
  imageAlt: "",
  accent: "#0072B5",
  metricValue: "",
  metricLabel: "",
  featured: false,
  caseStudyChallenge: "",
  caseStudySolution: "",
  caseStudyResults: "",
  testimonialQuote: "",
  testimonialAuthor: "",
  testimonialRole: "",
  locale: "fr",
  isVisible: true,
});

function recordToForm(r: PublicRealisationRecord): Form {
  return {
    title: r.title,
    client: r.client,
    sector: r.sector,
    location: r.location,
    year: r.year,
    duration: r.duration,
    category: r.category,
    description: r.description,
    tags: r.tags.join(", "),
    stack: r.stack.join(", "),
    image: r.image,
    imageAlt: r.imageAlt,
    accent: r.accent,
    metricValue: r.metricValue ?? "",
    metricLabel: r.metricLabel ?? "",
    featured: r.featured,
    caseStudyChallenge: r.caseStudy.challenge,
    caseStudySolution: r.caseStudy.solution,
    caseStudyResults: r.caseStudy.results.join("\n"),
    testimonialQuote: r.testimonial?.quote ?? "",
    testimonialAuthor: r.testimonial?.author ?? "",
    testimonialRole: r.testimonial?.role ?? "",
    locale: r.locale as "fr" | "en",
    isVisible: r.isVisible,
  };
}

function formToPayload(form: Form) {
  const hasTestimonial =
    form.testimonialQuote.trim() &&
    form.testimonialAuthor.trim() &&
    form.testimonialRole.trim();

  return {
    title: form.title,
    client: form.client,
    sector: form.sector,
    location: form.location,
    year: form.year,
    duration: form.duration,
    category: form.category,
    description: form.description,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    stack: form.stack
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    image: form.image,
    imageAlt: form.imageAlt,
    accent: form.accent,
    metricValue: form.metricValue.trim() || undefined,
    metricLabel: form.metricLabel.trim() || undefined,
    featured: form.featured,
    caseStudy: {
      challenge: form.caseStudyChallenge,
      solution: form.caseStudySolution,
      results: form.caseStudyResults
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
    },
    testimonial: hasTestimonial
      ? {
          quote: form.testimonialQuote.trim(),
          author: form.testimonialAuthor.trim(),
          role: form.testimonialRole.trim(),
        }
      : null,
    locale: form.locale,
    isVisible: form.isVisible,
  };
}

export function CrmRealisationsView() {
  const { confirm, alert } = useDialog();
  const [items, setItems] = useState<PublicRealisationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localeFilter, setLocaleFilter] = useState<"fr" | "en" | "all">("fr");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRealisationsAdmin(localeFilter === "all" ? undefined : localeFilter);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les réalisations.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [localeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  function openEdit(item: PublicRealisationRecord) {
    setCreating(false);
    setEditingId(item.id);
    setForm(recordToForm(item));
    setMessage("");
  }

  function closeForm() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = formToPayload(form);
    try {
      if (creating) {
        const item = await createRealisationApi(payload);
        setItems((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Réalisation ajoutée.");
      } else if (editingId) {
        const item = await updateRealisationApi(editingId, payload);
        setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Réalisation mise à jour.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    const ok = await confirm({
      title: "Supprimer cette réalisation ?",
      message: `« ${title} » sera retirée du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deleteRealisationApi(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleVisible(item: PublicRealisationRecord) {
    setBusyId(item.id);
    try {
      const updated = await updateRealisationApi(item.id, { isVisible: !item.isVisible });
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await reorderRealisationApi(id, direction);
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
      title: "Importer les réalisations statiques ?",
      message: "Les réalisations du code seront ajoutées en base (sans écraser les existantes).",
      confirmLabel: "Importer",
    });
    if (!ok) return;

    setImporting(true);
    try {
      const result = await importStaticRealisationsApi();
      await load();
      setMessage(`Import : ${result.imported} ajoutée(s), ${result.skipped} ignorée(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Briefcase className="h-6 w-6 text-primary" aria-hidden />
            Réalisations
          </h1>
          <p className="mt-1 text-sm text-gray-text">
            Portfolio et études de cas affichés sur le site.
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
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
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

      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-12 text-center text-sm text-gray-text">
          Aucune réalisation en base — le site affiche les données statiques du code.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
              <div className="flex flex-wrap items-start gap-2">
                <h2 className="font-semibold text-foreground">{item.title}</h2>
                {item.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    <Star className="h-3 w-3" aria-hidden />
                    Mise en avant
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-text">
                {item.client} · {item.category} · {item.year}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{item.description}</p>
              {item.metricValue && item.metricLabel && (
                <p className="mt-2 text-xs font-medium text-primary">
                  {item.metricValue} — {item.metricLabel}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                <button type="button" onClick={() => void handleToggleVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                <button type="button" onClick={() => void handleReorder(item.id, "up")} disabled={busyId === item.id || index === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowUp className="h-3 w-3" aria-hidden />Haut</button>
                <button type="button" onClick={() => void handleReorder(item.id, "down")} disabled={busyId === item.id || index === items.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowDown className="h-3 w-3" aria-hidden />Bas</button>
                <button type="button" onClick={() => void handleDelete(item.id, item.title)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">{creating ? "Nouvelle réalisation" : "Modifier la réalisation"}</h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-6">
              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-foreground">Informations générales</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre</span>
                    <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Client</span>
                    <input required value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Secteur</span>
                    <input required value={form.sector} onChange={(e) => setForm((p) => ({ ...p, sector: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Lieu</span>
                    <input required value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Année</span>
                    <input required value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Durée</span>
                    <input required value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} className={fieldClass} placeholder="20 jours" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Catégorie</span>
                    <input required value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={fieldClass} placeholder="E-commerce, Site vitrine…" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Description</span>
                  <textarea required rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={fieldClass} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Tags (séparés par des virgules)</span>
                    <input required value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Stack (séparée par des virgules)</span>
                    <input required value={form.stack} onChange={(e) => setForm((p) => ({ ...p, stack: e.target.value }))} className={fieldClass} />
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-foreground">Image &amp; métrique</legend>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">URL de l&apos;image</span>
                  <input required value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} className={fieldClass} placeholder="/images/realisations/…" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Texte alternatif image</span>
                    <input required value={form.imageAlt} onChange={(e) => setForm((p) => ({ ...p, imageAlt: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Couleur d&apos;accent</span>
                    <input required value={form.accent} onChange={(e) => setForm((p) => ({ ...p, accent: e.target.value }))} className={fieldClass} placeholder="#0072B5" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Valeur métrique</span>
                    <input value={form.metricValue} onChange={(e) => setForm((p) => ({ ...p, metricValue: e.target.value }))} className={fieldClass} placeholder="+40%" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Libellé métrique</span>
                    <input value={form.metricLabel} onChange={(e) => setForm((p) => ({ ...p, metricLabel: e.target.value }))} className={fieldClass} placeholder="Commandes en ligne" />
                  </label>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-foreground">Étude de cas</legend>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Défi</span>
                  <textarea required rows={3} value={form.caseStudyChallenge} onChange={(e) => setForm((p) => ({ ...p, caseStudyChallenge: e.target.value }))} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Solution</span>
                  <textarea required rows={3} value={form.caseStudySolution} onChange={(e) => setForm((p) => ({ ...p, caseStudySolution: e.target.value }))} className={fieldClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Résultats (un par ligne)</span>
                  <textarea required rows={4} value={form.caseStudyResults} onChange={(e) => setForm((p) => ({ ...p, caseStudyResults: e.target.value }))} className={fieldClass} />
                </label>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-bold text-foreground">Témoignage client (optionnel)</legend>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Citation</span>
                  <textarea rows={3} value={form.testimonialQuote} onChange={(e) => setForm((p) => ({ ...p, testimonialQuote: e.target.value }))} className={fieldClass} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Auteur</span>
                    <input value={form.testimonialAuthor} onChange={(e) => setForm((p) => ({ ...p, testimonialAuthor: e.target.value }))} className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Fonction</span>
                    <input value={form.testimonialRole} onChange={(e) => setForm((p) => ({ ...p, testimonialRole: e.target.value }))} className={fieldClass} />
                  </label>
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Langue</span>
                  <select value={form.locale} onChange={(e) => setForm((p) => ({ ...p, locale: e.target.value as "fr" | "en" }))} className={fieldClass}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                  Mise en avant
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                  Visible sur le site
                </label>
              </div>

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
