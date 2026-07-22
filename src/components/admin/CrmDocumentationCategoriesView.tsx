"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  createCrmDocCategoryApi,
  deleteCrmDocCategoryApi,
  fetchCrmDocCategoriesApi,
  updateCrmDocCategoryApi,
} from "@/lib/crm-docs-api";
import type { CrmDocCategoryRecord } from "@/lib/crm-docs-types";

export function CrmDocumentationCategoriesView() {
  const { alert, confirm, prompt } = useDialog();
  const [categories, setCategories] = useState<CrmDocCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await fetchCrmDocCategoriesApi());
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Chargement impossible.",
      });
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    const label = await prompt({
      title: "Nouvelle catégorie",
      message: "Libellé affiché dans la documentation.",
      label: "Libellé",
      confirmLabel: "Créer",
    });
    if (!label?.trim()) return;
    try {
      await createCrmDocCategoryApi({ label: label.trim() });
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Création impossible.",
      });
    }
  }

  async function handleRename(cat: CrmDocCategoryRecord) {
    const label = await prompt({
      title: "Renommer",
      defaultValue: cat.label,
      label: "Libellé",
      confirmLabel: "Enregistrer",
    });
    if (!label?.trim()) return;
    try {
      await updateCrmDocCategoryApi(cat.id, { label: label.trim() });
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    }
  }

  async function handleDelete(cat: CrmDocCategoryRecord) {
    const ok = await confirm({
      title: "Supprimer la catégorie",
      message: `Supprimer « ${cat.label} » ? Impossible s’il reste des fiches.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCrmDocCategoryApi(cat.id);
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/crm/documentation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-text hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Documentation
        </Link>
        <button
          type="button"
          onClick={() => void handleCreate()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle catégorie
        </button>
      </div>

      <h1 className="text-xl font-bold">Catégories documentation</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        </div>
      ) : (
        <ul className="divide-y divide-gray/20 overflow-hidden rounded-2xl border border-gray/30 bg-white">
          {categories.map((cat) => (
            <li key={cat.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">{cat.label}</p>
                <p className="text-xs text-gray-text">
                  {cat.slug}
                  {cat.description ? ` · ${cat.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleRename(cat)}
                  className="rounded-lg border border-gray/40 px-2.5 py-1.5 text-xs font-semibold"
                >
                  Renommer
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(cat)}
                  className="rounded-lg p-1.5 text-accent hover:bg-accent/5"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
