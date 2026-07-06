"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { BlogCommentRecord, BlogCommentStatus } from "@/lib/blog-comments";
import {
  fetchBlogCommentsAdmin,
  moderateBlogCommentApi,
} from "@/lib/blog-comments-api";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, MessageSquare, Trash2, X } from "lucide-react";

const STATUS_TABS: { id: BlogCommentStatus; label: string }[] = [
  { id: "pending", label: "En attente" },
  { id: "approved", label: "Approuvés" },
  { id: "rejected", label: "Rejetés" },
  { id: "spam", label: "Spam" },
];

export function CrmBlogCommentsView() {
  const [status, setStatus] = useState<BlogCommentStatus>("pending");
  const [comments, setComments] = useState<BlogCommentRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBlogCommentsAdmin(status);
      setComments(data.comments);
      setPendingCount(data.pendingCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleModerate(
    comment: BlogCommentRecord,
    nextStatus: "approved" | "rejected" | "spam",
  ) {
    setBusyId(comment.id);
    try {
      await moderateBlogCommentApi(comment.id, nextStatus);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <Link
          href="/admin/crm/blog"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-text hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour au blog
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Modération des commentaires</h1>
        <p className="mt-1 text-sm text-gray-text">
          {pendingCount > 0
            ? `${pendingCount} commentaire${pendingCount > 1 ? "s" : ""} en attente`
            : "Aucun commentaire en attente"}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              status === tab.id
                ? "bg-primary text-white"
                : "border border-gray/60 bg-white text-foreground hover:bg-gray-light",
            )}
          >
            {tab.label}
            {tab.id === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          Chargement…
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/60 bg-white px-6 py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-text/40" aria-hidden />
          <p className="mt-4 font-medium text-foreground">Aucun commentaire</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-gray/60 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{comment.authorName}</p>
                  {comment.authorEmail && (
                    <p className="text-xs text-gray-text">{comment.authorEmail}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-text">
                    {new Date(comment.createdAt).toLocaleString("fr-FR")}
                    {comment.postTitle && (
                      <>
                        {" · "}
                        <Link
                          href={`/blog/${comment.postSlug}`}
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          {comment.postTitle}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Approuver"
                      disabled={busyId === comment.id}
                      onClick={() => void handleModerate(comment, "approved")}
                      className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Rejeter"
                      disabled={busyId === comment.id}
                      onClick={() => void handleModerate(comment, "rejected")}
                      className="rounded-lg border border-gray/60 p-2 hover:bg-gray-light disabled:opacity-50"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Spam"
                      disabled={busyId === comment.id}
                      onClick={() => void handleModerate(comment, "spam")}
                      className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-text">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
