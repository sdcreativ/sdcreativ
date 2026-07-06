"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BlogCategoryRecord } from "@/lib/blog-categories";
import {
  createBlogCategoryApi,
  deleteBlogCategoryApi,
  fetchBlogCategoriesApi,
  updateBlogCategoryApi,
} from "@/lib/blog-categories-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-gray/60 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmBlogCategoriesView() {
  const { confirm, alert } = useDialog();
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; sortOrder: number }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBlogCategoriesApi();
      setCategories(data);
      setDrafts(
        Object.fromEntries(
          data.map((category) => [
            category.id,
            { name: category.name, sortOrder: category.sortOrder },
          ]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    setError("");
    try {
      await createBlogCategoryApi({ name });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(category: BlogCategoryRecord) {
    const draft = drafts[category.id];
    if (!draft) return;

    setBusyId(category.id);
    setError("");
    try {
      await updateBlogCategoryApi(category.id, {
        name: draft.name.trim(),
        sortOrder: draft.sortOrder,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: BlogCategoryRecord) {
    const ok = await confirm({
      title: "Supprimer la catégorie ?",
      message: `« ${category.name} » sera définitivement supprimée (si aucun article ne l'utilise).`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(category.id);
    setError("");
    try {
      await deleteBlogCategoryApi(category.id);
      await load();
    } catch (err) {
      await alert({
        title: "Suppression impossible",
        message: err instanceof Error ? err.message : "Erreur inattendue.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/crm/blog"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-text hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au blog
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Catégories du blog</h1>
          <p className="mt-1 text-sm text-gray-text">
            Gérez les catégories disponibles dans l&apos;éditeur d&apos;articles.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-gray/60 bg-white p-4 shadow-sm"
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="new-category" className="mb-1 block text-sm font-medium text-foreground">
            Nouvelle catégorie
          </label>
          <input
            id="new-category"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
            placeholder="Ex. Marketing digital"
            maxLength={100}
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Ajouter
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : (
        <ul className="space-y-3">
          {categories.map((category) => {
            const draft = drafts[category.id] ?? {
              name: category.name,
              sortOrder: category.sortOrder,
            };
            const dirty =
              draft.name !== category.name || draft.sortOrder !== category.sortOrder;

            return (
              <li
                key={category.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray/60 bg-white p-4 shadow-sm"
              >
                <div className="min-w-[180px] flex-1">
                  <label
                    htmlFor={`category-name-${category.id}`}
                    className="sr-only"
                  >
                    Nom de la catégorie
                  </label>
                  <input
                    id={`category-name-${category.id}`}
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [category.id]: { ...draft, name: e.target.value },
                      }))
                    }
                    className={inputClass}
                    placeholder="Nom de la catégorie"
                    maxLength={100}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor={`sort-${category.id}`} className="text-xs text-gray-text">
                    Ordre
                  </label>
                  <input
                    id={`sort-${category.id}`}
                    type="number"
                    min={0}
                    max={999}
                    value={draft.sortOrder}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [category.id]: {
                          ...draft,
                          sortOrder: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-20 rounded-lg border border-gray/60 px-2 py-2 text-sm"
                    title="Ordre d'affichage"
                    aria-label={`Ordre d'affichage de ${category.name}`}
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!dirty || busyId === category.id}
                    onClick={() => void handleSave(category)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-50"
                  >
                    {busyId === category.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden />
                    )}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    aria-label={`Supprimer la catégorie ${category.name}`}
                    disabled={busyId === category.id}
                    onClick={() => void handleDelete(category)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
