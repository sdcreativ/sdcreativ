"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  SERVICE_CATALOG_CATEGORIES,
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_UNIT_LABELS,
  SERVICE_CATALOG_UNITS,
  type ServiceCatalogCategory,
  type ServiceCatalogUnit,
} from "@/content/service-catalog-labels";
import { formatQuoteAmount } from "@/content/quotes-labels";
import type { ServiceCatalogItem } from "@/lib/service-catalog";
import {
  createServiceCatalogItemApi,
  deleteServiceCatalogItemApi,
  fetchServiceCatalogItems,
  importServiceCatalogFromConfigApi,
  reorderServiceCatalogItemApi,
  updateServiceCatalogItemApi,
} from "@/lib/service-catalog-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type ItemForm = {
  name: string;
  description: string;
  category: ServiceCatalogCategory;
  unit: ServiceCatalogUnit;
  unitPrice: string;
  isActive: boolean;
};

const emptyForm = (): ItemForm => ({
  name: "",
  description: "",
  category: "autre",
  unit: "forfait",
  unitPrice: "",
  isActive: true,
});

function itemToForm(item: ServiceCatalogItem): ItemForm {
  return {
    name: item.name,
    description: item.description ?? "",
    category: item.category,
    unit: item.unit,
    unitPrice: String(item.unitPrice),
    isActive: item.isActive,
  };
}

export function CrmServiceCatalogView() {
  const { confirm } = useDialog();
  const [items, setItems] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCatalogCategory | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchServiceCatalogItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setMessage("");
  }

  function openEdit(item: ServiceCatalogItem) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setShowForm(true);
    setMessage("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const unitPrice = Number(form.unitPrice);
    if (!form.name.trim() || Number.isNaN(unitPrice) || unitPrice < 0) {
      setError("Nom et prix unitaire valides requis.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        unit: form.unit,
        unitPrice,
        isActive: form.isActive,
      };

      if (editingId) {
        const updated = await updateServiceCatalogItemApi(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("Prestation mise à jour.");
      } else {
        const created = await createServiceCatalogItemApi(payload);
        setItems((prev) => [...prev, created]);
        setMessage("Prestation ajoutée.");
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ServiceCatalogItem) {
    const ok = await confirm({
      title: "Supprimer la prestation",
      message: `Supprimer « ${item.name} » ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteServiceCatalogItemApi(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function handleToggleActive(item: ServiceCatalogItem) {
    try {
      const updated = await updateServiceCatalogItemApi(item.id, { isActive: !item.isActive });
      setItems((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  async function handleReorder(item: ServiceCatalogItem, direction: "up" | "down") {
    try {
      const updated = await reorderServiceCatalogItemApi(item.id, direction);
      await load();
      void updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réordonnancement impossible.");
    }
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const imported = await importServiceCatalogFromConfigApi();
      await load();
      setMessage(
        imported > 0
          ? `${imported} prestation(s) importée(s) depuis le configurateur public.`
          : "Aucune nouvelle prestation à importer (doublons ignorés).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-text">
            Catalogue interne pour composer vos devis client. Les prix restent modifiables ligne par ligne
            lors de la création d&apos;un devis.
          </p>
          <Link href="/admin/crm/devis" className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">
            Aller aux devis →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Importer configurateur
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle prestation
          </button>
        </div>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>}

      <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
          Catégorie
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ServiceCatalogCategory | "all")}
            className="mt-1 w-full max-w-xs rounded-xl border border-gray/60 px-3 py-2 text-sm"
          >
            <option value="all">Toutes</option>
            {SERVICE_CATALOG_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {SERVICE_CATALOG_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement du catalogue…
        </p>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/50 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-text">Aucune prestation pour le moment.</p>
          <button
            type="button"
            onClick={() => void handleImport()}
            className="mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Importer depuis le configurateur public
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "rounded-2xl border bg-white p-4 shadow-sm",
                item.isActive ? "border-gray/40" : "border-gray/30 opacity-70",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground">{item.name}</h3>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-primary">
                      {SERVICE_CATALOG_CATEGORY_LABELS[item.category]}
                    </span>
                    {!item.isActive && (
                      <span className="rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-bold text-gray-text">
                        Inactif
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-text">{item.description}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-text">
                    {formatQuoteAmount(item.unitPrice)} / {SERVICE_CATALOG_UNIT_LABELS[item.unit]}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0 || categoryFilter !== "all"}
                    onClick={() => void handleReorder(item, "up")}
                    className="rounded-lg border border-gray/40 p-2 text-gray-text hover:text-foreground disabled:opacity-40"
                    aria-label="Monter"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === filteredItems.length - 1 || categoryFilter !== "all"}
                    onClick={() => void handleReorder(item, "down")}
                    className="rounded-lg border border-gray/40 p-2 text-gray-text hover:text-foreground disabled:opacity-40"
                    aria-label="Descendre"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(item)}
                    className="rounded-lg border border-gray/40 p-2 text-gray-text hover:text-foreground"
                    aria-label={item.isActive ? "Désactiver" : "Activer"}
                  >
                    {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-gray/40 p-2 text-gray-text hover:text-foreground"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    className="rounded-lg border border-accent/30 p-2 text-accent hover:bg-accent/5"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-foreground">
              {editingId ? "Modifier la prestation" : "Nouvelle prestation"}
            </h2>
            <div className="mt-4 grid gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Nom de la prestation *"
                className={fieldClass}
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                placeholder="Description (optionnel)"
                className={fieldClass}
              />
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value as ServiceCatalogCategory }))
                }
                className={fieldClass}
              >
                {SERVICE_CATALOG_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SERVICE_CATALOG_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unit: e.target.value as ServiceCatalogUnit }))
                  }
                  className={fieldClass}
                >
                  {SERVICE_CATALOG_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {SERVICE_CATALOG_UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.unitPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  placeholder="Prix unitaire HT *"
                  className={fieldClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Prestation active (visible dans le composeur de devis)
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-accent">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-gray/60 py-3 text-sm font-semibold text-gray-text"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
