"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BLOG_POST_STATUS_LABELS,
  type BlogPostStatus,
} from "@/content/blog-labels";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import {
  bulkBlogPostsApi,
  duplicateBlogPostApi,
  fetchBlogPostsAdmin,
  importStaticBlogPostsApi,
  purgeBlogPostApi,
  restoreBlogPostApi,
  trashBlogPostApi,
} from "@/lib/blog-posts-api";
import { fetchBlogCommentsAdmin } from "@/lib/blog-comments-api";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  Copy,
  ExternalLink,
  Eye,
  FolderOpen,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Newspaper,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Download,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type ViewMode = "active" | "trash";

export function CrmBlogView() {
  const router = useRouter();
  const { confirm, alert } = useDialog();
  const [view, setView] = useState<ViewMode>("active");
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogPostStatus>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [pendingComments, setPendingComments] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBlogPostsAdmin({
        trash: view === "trash",
        status: view === "trash" || statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
        tag: tagFilter.trim() || undefined,
      });
      setPosts(data.posts);
      setTrashCount(data.trashCount);
      setSelectedIds((prev) => prev.filter((id) => data.posts.some((post) => post.id === id)));
      if (view === "active") {
        fetchBlogCommentsAdmin("pending")
          .then((commentsData) => setPendingComments(commentsData.pendingCount))
          .catch(() => setPendingComments(0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les articles.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tagFilter, view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedIds([]);
  }, [view]);

  const allSelected = posts.length > 0 && selectedIds.length === posts.length;
  const someSelected = selectedIds.length > 0;

  const selectedLabel = useMemo(() => {
    if (selectedIds.length === 1) {
      const post = posts.find((p) => p.id === selectedIds[0]);
      return post ? `« ${post.title} »` : "1 élément";
    }
    return `${selectedIds.length} éléments`;
  }, [posts, selectedIds]);

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : posts.map((post) => post.id));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleImportStatic() {
    const ok = await confirm({
      title: "Importer les articles statiques",
      message: "Importer les 6 articles du fichier statique blog.ts ?",
      confirmLabel: "Importer",
    });
    if (!ok) return;
    setImporting(true);
    setImportMessage("");
    try {
      const result = await importStaticBlogPostsApi();
      setImportMessage(`${result.imported} importé(s), ${result.skipped} ignoré(s).`);
      await load();
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  function statusBadgeClass(status: BlogPostStatus) {
    if (status === "published") return "bg-green-100 text-green-800";
    if (status === "scheduled") return "bg-blue-100 text-blue-800";
    return "bg-amber-100 text-amber-800";
  }

  async function handleDuplicate(post: BlogPostRecord) {
    setBusyId(post.id);
    try {
      const copy = await duplicateBlogPostApi(post.id);
      router.push(`/admin/crm/blog/${copy.id}`);
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Duplication impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTrash(post: BlogPostRecord) {
    const ok = await confirm({
      title: "Mettre à la corbeille",
      message: `Mettre « ${post.title} » à la corbeille ?`,
      confirmLabel: "Mettre à la corbeille",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(post.id);
    try {
      await trashBlogPostApi(post.id);
      await load();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(post: BlogPostRecord) {
    setBusyId(post.id);
    try {
      await restoreBlogPostApi(post.id);
      await load();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Restauration impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge(post: BlogPostRecord) {
    const ok = await confirm({
      title: "Suppression définitive",
      message: `Supprimer définitivement « ${post.title} » ? Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(post.id);
    try {
      await purgeBlogPostApi(post.id);
      await load();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulk(action: "trash" | "restore" | "purge") {
    if (selectedIds.length === 0) return;

    const messages = {
      trash: {
        title: "Mettre à la corbeille",
        message: `Mettre ${selectedLabel} à la corbeille ?`,
        confirmLabel: "Mettre à la corbeille",
      },
      restore: {
        title: "Restaurer",
        message: `Restaurer ${selectedLabel} ?`,
        confirmLabel: "Restaurer",
      },
      purge: {
        title: "Suppression définitive",
        message: `Supprimer définitivement ${selectedLabel} ? Cette action est irréversible.`,
        confirmLabel: "Supprimer définitivement",
      },
    } as const;

    const ok = await confirm({
      ...messages[action],
      variant: action === "restore" ? "default" : "danger",
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      await bulkBlogPostsApi(action, selectedIds);
      setSelectedIds([]);
      await load();
    } catch (err) {
      await alert(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Blog</h1>
          <p className="mt-1 text-sm text-gray-text">
            Rédigez et publiez des articles visibles sur{" "}
            <Link href="/blog" target="_blank" className="text-primary hover:underline">
              /blog
            </Link>
          </p>
        </div>
        {view === "active" && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/crm/blog/nouveau"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Nouvel article
            </Link>
            <Link
              href="/admin/crm/blog/categories"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray/60 bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-light"
            >
              <FolderOpen className="h-4 w-4" aria-hidden />
              Catégories
            </Link>
            <Link
              href="/admin/crm/blog/comments"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray/60 bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-light"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Commentaires
              {pendingComments > 0 && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-white">
                  {pendingComments}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => void handleImportStatic()}
              disabled={importing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray/60 bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-light disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Importer statique
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray/40">
        <button
          type="button"
          onClick={() => setView("active")}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            view === "active"
              ? "border-primary text-primary"
              : "border-transparent text-gray-text hover:text-foreground",
          )}
        >
          Articles
        </button>
        <button
          type="button"
          onClick={() => setView("trash")}
          className={cn(
            "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            view === "trash"
              ? "border-primary text-primary"
              : "border-transparent text-gray-text hover:text-foreground",
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Corbeille
          {trashCount > 0 && (
            <span className="rounded-full bg-gray-light px-2 py-0.5 text-xs font-bold text-gray-text">
              {trashCount}
            </span>
          )}
        </button>
      </div>

      {importMessage && view === "active" && (
        <p className="rounded-xl border border-primary/20 bg-primary-light/30 px-4 py-3 text-sm text-foreground">
          {importMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un titre, slug…"
            className={cn(fieldClass, "pl-9")}
          />
        </div>
        {view === "active" && (
          <>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Filtrer par tag…"
              className={cn(fieldClass, "sm:w-40")}
              aria-label="Filtrer par tag"
            />
            <select
              title="Statut"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | BlogPostStatus)}
              className={cn(fieldClass, "sm:w-44")}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillons</option>
              <option value="scheduled">Planifiés</option>
              <option value="published">Publiés</option>
            </select>
          </>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray/60 bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-light"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualiser
        </button>
      </div>

      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary-light/20 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          {view === "active" ? (
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void handleBulk("trash")}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {bulkBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              Mettre à la corbeille
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => void handleBulk("restore")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {bulkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden />
                )}
                Restaurer
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => void handleBulk("purge")}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                Supprimer définitivement
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-sm font-medium text-gray-text hover:text-foreground"
          >
            Tout désélectionner
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/60 bg-white px-6 py-16 text-center">
          {view === "trash" ? (
            <>
              <Trash2 className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
              <p className="mt-4 font-medium text-foreground">Corbeille vide</p>
              <p className="mt-1 text-sm text-gray-text">
                Les articles supprimés apparaîtront ici et pourront être restaurés.
              </p>
            </>
          ) : (
            <>
              <Newspaper className="mx-auto h-10 w-10 text-primary/40" aria-hidden />
              <p className="mt-4 font-medium text-foreground">Aucun article</p>
              <p className="mt-1 text-sm text-gray-text">
                Créez votre premier article ou importez le contenu depuis le fichier statique.
              </p>
              <Link
                href="/admin/crm/blog/nouveau"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nouvel article
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray/40 bg-gray-light/80 text-xs uppercase tracking-wide text-gray-text">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Tout sélectionner"
                    className="h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Titre</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Catégorie</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  {view === "trash" ? "Supprimé le" : "Date"}
                </th>
                {view === "active" && (
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Stats</th>
                )}
                {view === "active" && (
                  <th className="px-4 py-3 font-semibold">Statut</th>
                )}
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray/30">
              {posts.map((post) => {
                const isSelected = selectedIds.includes(post.id);
                const isBusy = busyId === post.id;

                return (
                  <tr
                    key={post.id}
                    className={cn("hover:bg-gray-light/40", isSelected && "bg-primary-light/20")}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(post.id)}
                        aria-label={`Sélectionner ${post.title}`}
                        className="h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {view === "active" ? (
                        <Link
                          href={`/admin/crm/blog/${post.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {post.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{post.title}</span>
                      )}
                      <p className="mt-0.5 text-xs text-gray-text">/{post.slug}</p>
                      {post.tags.length > 0 && (
                        <p className="mt-1 text-xs text-gray-text">
                          {post.tags.map((tag) => `#${tag}`).join(" ")}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-text md:table-cell">{post.category}</td>
                    <td className="hidden px-4 py-3 text-gray-text sm:table-cell">
                      {view === "trash" && post.deletedAt
                        ? new Date(post.deletedAt).toLocaleString("fr-FR")
                        : new Date(post.date).toLocaleDateString("fr-FR")}
                    </td>
                    {view === "active" && (
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="flex flex-col gap-1 text-xs text-gray-text">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            {post.viewCount ?? 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                            {post.clickCount ?? 0}
                          </span>
                        </div>
                      </td>
                    )}
                    {view === "active" && (
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            statusBadgeClass(post.status),
                          )}
                        >
                          {BLOG_POST_STATUS_LABELS[post.status]}
                        </span>
                        {post.status === "scheduled" && post.scheduledAt && (
                          <p className="mt-1 text-xs text-gray-text">
                            {new Date(post.scheduledAt).toLocaleString("fr-FR")}
                          </p>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {view === "active" && (
                          <>
                            {post.status === "published" && (
                              <Link
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                className="rounded-lg p-2 text-gray-text hover:bg-gray-light hover:text-primary"
                                title="Voir sur le site"
                              >
                                <ExternalLink className="h-4 w-4" aria-hidden />
                              </Link>
                            )}
                            <Link
                              href={`/admin/crm/blog/${post.id}`}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light"
                            >
                              Éditer
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDuplicate(post)}
                              disabled={isBusy}
                              className="rounded-lg p-2 text-gray-text hover:bg-gray-light hover:text-primary disabled:opacity-50"
                              title="Dupliquer"
                            >
                              <Copy className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleTrash(post)}
                              disabled={isBusy}
                              className="rounded-lg p-2 text-gray-text hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Mettre à la corbeille"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          </>
                        )}
                        {view === "trash" && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRestore(post)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <RotateCcw className="h-4 w-4" aria-hidden />
                              )}
                              Restaurer
                            </button>
                            <button
                              type="button"
                              onClick={() => void handlePurge(post)}
                              disabled={isBusy}
                              className="rounded-lg p-2 text-gray-text hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
