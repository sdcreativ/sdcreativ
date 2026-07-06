"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlogRevisionItem } from "@/lib/blog-posts-api";
import { fetchBlogRevisionsApi, restoreBlogRevisionApi } from "@/lib/blog-posts-api";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { History, Loader2, RotateCcw } from "lucide-react";

type Props = {
  postId: string;
  onRestored: (post: BlogPostRecord) => void;
};

function formatRevisionDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BlogRevisionHistory({ postId, onRestored }: Props) {
  const { confirm, alert } = useDialog();
  const [revisions, setRevisions] = useState<BlogRevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBlogRevisionsApi(postId);
      setRevisions(data);
    } catch {
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRestore(revision: BlogRevisionItem) {
    const ok = await confirm({
      title: "Restaurer cette version ?",
      message: `Le contenu actuel sera remplacé par la version du ${formatRevisionDate(revision.createdAt)}. Une copie de l'état actuel sera conservée dans l'historique.`,
      confirmLabel: "Restaurer",
      variant: "danger",
    });
    if (!ok) return;

    setRestoringId(revision.id);
    try {
      const post = await restoreBlogRevisionApi(postId, revision.id);
      onRestored(post);
      await load();
    } catch (err) {
      await alert({
        title: "Restauration impossible",
        message: err instanceof Error ? err.message : "Erreur inattendue.",
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray/60 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-gray/40 px-4 py-3">
        <History className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Historique des versions</h3>
      </header>

      <div className="max-h-64 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-text">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement…
          </div>
        ) : revisions.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-text">
            Aucune version enregistrée. Les révisions sont créées à chaque enregistrement manuel.
          </p>
        ) : (
          <ul className="space-y-2">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-gray/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {revision.snapshot.title || "Sans titre"}
                  </p>
                  <p className="text-xs text-gray-text">
                    {formatRevisionDate(revision.createdAt)}
                    {revision.createdByName ? ` · ${revision.createdByName}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  title="Restaurer cette version"
                  disabled={restoringId === revision.id}
                  onClick={() => void handleRestore(revision)}
                  className={cn(
                    "shrink-0 rounded-lg p-2 text-primary hover:bg-primary-light disabled:opacity-50",
                  )}
                >
                  {restoringId === revision.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
