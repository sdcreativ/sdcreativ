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
  locale?: "fr" | "en";
};

const inputClass =
  "w-full border-0 border-b border-gray/70 bg-transparent px-0 py-2.5 text-sm text-foreground placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-0";

export function BlogComments({ slug, locale = "fr" }: Props) {
  const isEn = locale === "en";
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");

  const copy = isEn
    ? {
        title: "Comments",
        empty: "Be the first to comment on this article.",
        formTitle: "Leave a comment",
        formHint: "Your comment will be published after our team reviews it.",
        name: "Name *",
        email: "Email (optional)",
        message: "Message *",
        send: "Send",
        loading: "Loading…",
      }
    : {
        title: "Commentaires",
        empty: "Soyez le premier à commenter cet article.",
        formTitle: "Laisser un commentaire",
        formHint: "Votre commentaire sera publié après validation par notre équipe.",
        name: "Nom *",
        email: "Email (optionnel)",
        message: "Message *",
        send: "Envoyer",
        loading: "Chargement…",
      };

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
        throw new Error(json.error ?? (isEn ? "Could not send." : "Envoi impossible."));
      }
      setMessage(json.message ?? (isEn ? "Comment sent." : "Commentaire envoyé."));
      setContent("");
      setAuthorName("");
      setAuthorEmail("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEn
            ? "Could not send."
            : "Envoi impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 border-t border-gray/50 pt-12">
      <div className="mb-10 flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold text-foreground">{copy.title}</h2>
        {!loading && (
          <span className="text-sm text-gray-text">{comments.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {copy.loading}
        </div>
      ) : comments.length > 0 ? (
        <ul className="mb-12 space-y-8">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-gray/40 pb-8 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-foreground">{comment.authorName}</p>
                <time className="text-xs text-gray-text">
                  {new Date(comment.createdAt).toLocaleDateString(
                    isEn ? "en-GB" : "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-text">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-12 text-sm text-gray-text">{copy.empty}</p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{copy.formTitle}</h3>
          <p className="mt-1 text-xs text-gray-text">{copy.formHint}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="comment-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-text">
              {copy.name}
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
            <label htmlFor="comment-email" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-text">
              {copy.email}
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
          <label htmlFor="comment-content" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-text">
            {copy.message}
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

        <input
          title="Site web"
          placeholder="Site web"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden
        />

        {error && (
          <p className="text-sm text-red-700">{error}</p>
        )}
        {message && (
          <p className="text-sm text-primary-dark">{message}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {copy.send}
        </button>
      </form>
    </section>
  );
}
