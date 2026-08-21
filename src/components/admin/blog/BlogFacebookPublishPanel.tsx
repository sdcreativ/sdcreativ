"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Share2 } from "lucide-react";
import { publishBlogToFacebookApi } from "@/lib/blog-posts-api";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import type { FacebookPageConnectionPublic } from "@/lib/facebook-page";
import { useDialog } from "@/components/ui/DialogProvider";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  status: BlogPostRecord["status"];
  facebookPostId: string | null;
  facebookPublishedAt: string | null;
  onFacebookPublished: (data: {
    facebookPostId: string;
    facebookPublishedAt: string | null;
  }) => void;
};

function buildDefaultMessage(input: {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
}): string {
  const url = `${SITE.url.replace(/\/$/, "")}/blog/${input.slug}`;
  const excerpt = input.excerpt.trim();
  const tags = input.tags
    .slice(0, 5)
    .map((t) => `#${t.replace(/\s+/g, "")}`)
    .join(" ");
  return [input.title.trim(), excerpt, url, tags].filter(Boolean).join("\n\n");
}

export function BlogFacebookPublishPanel({
  postId,
  slug,
  title,
  excerpt,
  tags,
  status,
  facebookPostId,
  facebookPublishedAt,
  onFacebookPublished,
}: Props) {
  const { confirm } = useDialog();
  const [fbStatus, setFbStatus] = useState<FacebookPageConnectionPublic | null>(null);
  const [message, setMessage] = useState(() =>
    buildDefaultMessage({ slug, title, excerpt, tags }),
  );
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/facebook/status", { credentials: "include" });
      if (!res.ok) {
        setFbStatus(null);
        return;
      }
      setFbStatus((await res.json()) as FacebookPageConnectionPublic);
    } catch {
      setFbStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setMessage(buildDefaultMessage({ slug, title, excerpt, tags }));
    setError("");
    setSuccess("");
  }, [postId, slug, title, excerpt, tags]);

  async function publish(force: boolean) {
    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      if (force) {
        const ok = await confirm({
          title: "Republier sur Facebook",
          message:
            "Un post Facebook existe déjà pour cet article. Publier à nouveau créera un second post sur la Page.",
          confirmLabel: "Republier",
          variant: "danger",
        });
        if (!ok) return;
      }
      const result = await publishBlogToFacebookApi(postId, {
        message,
        force,
      });
      onFacebookPublished({
        facebookPostId: result.facebookPostId,
        facebookPublishedAt: result.post.facebookPublishedAt,
      });
      setSuccess("Publié sur Facebook.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  }

  if (status !== "published") return null;

  const permalink = facebookPostId
    ? `https://www.facebook.com/${facebookPostId}`
    : null;

  return (
    <div className="space-y-3 rounded-xl border border-gray/40 bg-gray-light/20 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Share2 className="h-4 w-4 text-[#1877F2]" aria-hidden />
        Facebook
      </div>

      {loadingStatus ? (
        <p className="flex items-center gap-2 text-xs text-gray-text">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Vérification…
        </p>
      ) : !fbStatus?.connected ? (
        <p className="text-xs text-gray-text">
          Page non connectée.{" "}
          <Link
            href="/admin/crm/parametres?tab=site"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Paramètres → Site public
          </Link>
        </p>
      ) : (
        <>
          <p className="text-[11px] text-gray-text">
            Page : {fbStatus.pageName ?? "Facebook"}
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-text">
              Message
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {permalink ? (
            <a
              href={permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Voir le post Facebook
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}

          {facebookPublishedAt ? (
            <p className="text-[11px] text-gray-text">
              Dernière publication :{" "}
              {new Date(facebookPublishedAt).toLocaleString("fr-FR")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={publishing || !message.trim()}
              onClick={() => void publish(Boolean(facebookPostId))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white",
                "bg-[#1877F2] hover:bg-[#166fe5] disabled:opacity-60",
              )}
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Share2 className="h-3.5 w-3.5" aria-hidden />
              )}
              {facebookPostId ? "Republier…" : "Publier sur Facebook"}
            </button>
          </div>
        </>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
    </div>
  );
}
