"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  Handshake,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { PublicPartnerRecord } from "@/lib/public-partners";
import {
  createPartnerApi,
  deletePartnerApi,
  fetchPartnersAdmin,
  importStaticPartnersApi,
  reorderPartnerApi,
  updatePartnerApi,
} from "@/lib/public-partners-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Form = {
  name: string;
  category: string;
  locale: "fr" | "en";
  isVisible: boolean;
};

const emptyForm = (): Form => ({
  name: "",
  category: "",
  locale: "fr",
  isVisible: true,
});

function recordToForm(r: PublicPartnerRecord): Form {
  return {
    name: r.name,
    category: r.category,
    locale: r.locale as "fr" | "en",
    isVisible: r.isVisible,
  };
}

export function CrmPartnersView() {
  const { confirm, alert } = useDialog();
  const [items, setItems] = useState<PublicPartnerRecord[]>([]);
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
      const data = await fetchPartnersAdmin(localeFilter === "all" ? undefined : localeFilter);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les partenaires.");
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

  function openEdit(item: PublicPartnerRecord) {
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
    try {
      if (creating) {
        const item = await createPartnerApi(form);
        setItems((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Partenaire ajouté.");
      } else if (editingId) {
        const item = await updatePartnerApi(editingId, form);
        setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Partenaire mis à jour.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: "Supprimer ce partenaire ?",
      message: `« ${name} » sera retiré du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deletePartnerApi(id);
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

  async function handleToggleVisible(item: PublicPartnerRecord) {
    setBusyId(item.id);
    try {
      const updated = await updatePartnerApi(item.id, { isVisible: !item.isVisible });
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
      await reorderPartnerApi(id, direction);
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
      title: "Importer les partenaires statiques ?",
      message: "Les partenaires du code seront ajoutés en base (sans écraser les existants).",
      confirmLabel: "Importer",
    });
    if (!ok) return;

    setImporting(true);
    try {
      const result = await importStaticPartnersApi();
      await load();
      setMessage(`Import : ${result.imported} ajouté(s), ${result.skipped} ignoré(s).`);
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
            <Handshake className="h-6 w-6 text-primary" aria-hidden />
            Partenaires
          </h1>
          <p className="mt-1 text-sm text-gray-text">
            Logos et technologies affichés dans la section partenaires du site.
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
          Aucun partenaire en base — le site affiche les données statiques du code.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
              <h2 className="font-semibold text-foreground">{item.name}</h2>
              <p className="mt-1 text-sm text-gray-text">{item.category}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                <button type="button" onClick={() => void handleToggleVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                <button type="button" onClick={() => void handleReorder(item.id, "up")} disabled={busyId === item.id || index === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowUp className="h-3 w-3" aria-hidden />Haut</button>
                <button type="button" onClick={() => void handleReorder(item.id, "down")} disabled={busyId === item.id || index === items.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowDown className="h-3 w-3" aria-hidden />Bas</button>
                <button type="button" onClick={() => void handleDelete(item.id, item.name)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">{creating ? "Nouveau partenaire" : "Modifier le partenaire"}</h2>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Nom</span>
                <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Catégorie</span>
                <input required value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={fieldClass} placeholder="CMS, Cloud, Paiement…" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Langue</span>
                <select value={form.locale} onChange={(e) => setForm((p) => ({ ...p, locale: e.target.value as "fr" | "en" }))} className={fieldClass}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))} className="rounded border-gray/60 text-primary" />
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
