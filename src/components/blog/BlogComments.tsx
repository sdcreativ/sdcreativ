"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type CommentItem = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type Props = {
  slug: string;
};

const inputClass =
  "w-full rounded-lg border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function BlogComments({ slug }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`);
      const json = (await res.json()) as { comments: CommentItem[] };
      setComments(json.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName,
          authorEmail: authorEmail || undefined,
          content,
          website: "",
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Envoi impossible.");
      }
      setMessage(json.message ?? "Commentaire envoyé.");
      setContent("");
      setAuthorName("");
      setAuthorEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 border-t border-gray/40 pt-12">
      <div className="mb-8 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold text-foreground">Commentaires</h2>
        {!loading && (
          <span className="rounded-full bg-gray-light px-2.5 py-0.5 text-xs font-medium text-gray-text">
            {comments.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </div>
      ) : comments.length > 0 ? (
        <ul className="mb-10 space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-gray/40 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-foreground">{comment.authorName}</p>
                <time className="text-xs text-gray-text">
                  {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-text">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-10 text-sm text-gray-text">
          Soyez le premier à commenter cet article.
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-2xl border border-gray/40 bg-gray-light/30 p-6">
        <h3 className="font-semibold text-foreground">Laisser un commentaire</h3>
        <p className="text-xs text-gray-text">
          Votre commentaire sera publié après validation par notre équipe.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="comment-name" className="mb-1 block text-sm font-medium">
              Nom *
            </label>
            <input
              id="comment-name"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className={inputClass}
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="comment-email" className="mb-1 block text-sm font-medium">
              Email (optionnel)
            </label>
            <input
              id="comment-email"
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </div>
        </div>

        <div>
          <label htmlFor="comment-content" className="mb-1 block text-sm font-medium">
            Message *
          </label>
          <textarea
            id="comment-content"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(inputClass, "resize-y")}
            maxLength={2000}
          />
        </div>

        <input title="Site web" placeholder="Site web" type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Envoyer
        </button>
      </form>
    </section>
  );
}
