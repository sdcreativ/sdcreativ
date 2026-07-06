"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskComment } from "@/lib/task-comments";
import { createTaskCommentApi, fetchTaskComments } from "@/lib/tasks-api";
import { Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function formatCommentDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TaskCommentsSection({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setComments(await fetchTaskComments(taskId));
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    try {
      const comment = await createTaskCommentApi(taskId, { content: text });
      setComments((prev) => [comment, ...prev]);
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-text">Commentaires</p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Ajouter un commentaire…"
          className={fieldClass}
          aria-label="Nouveau commentaire"
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Envoi…" : "Publier"}
        </button>
      </form>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-text">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Chargement…
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-3 text-xs text-gray-text">Aucun commentaire.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-gray/30 bg-gray-light/40 p-3">
              <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
              <p className="mt-1 text-[10px] text-gray-text">
                {comment.actorName ? `${comment.actorName} · ` : ""}
                {formatCommentDate(comment.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
