"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BLOG_CATEGORIES,
  BLOG_POST_STATUSES,
  BLOG_POST_STATUS_LABELS,
  type BlogPostStatus,
} from "@/content/blog-labels";
import { BlogImageUpload } from "@/components/admin/blog/BlogImageUpload";
import { BlogRevisionHistory } from "@/components/admin/blog/BlogRevisionHistory";
import { BlogRichEditor } from "@/components/admin/blog/BlogRichEditor";
import { BlogSeoPreview, CharCounter } from "@/components/admin/blog/BlogSeoPreview";
import { BlogTagsInput } from "@/components/admin/blog/BlogTagsInput";
import { estimateReadTime, isHtmlEmpty, paragraphsToHtml } from "@/lib/blog-content";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import {
  autosaveBlogPostApi,
  createBlogPostApi,
  fetchBlogPostAdmin,
  fetchBlogPreviewTokenApi,
  updateBlogPostApi,
} from "@/lib/blog-posts-api";
import { fetchBlogCategoriesApi } from "@/lib/blog-categories-api";
import { cn } from "@/lib/utils";
import { ArrowLeft, Clock, ExternalLink, Eye, Loader2, MousePointerClick, Save } from "lucide-react";

const DRAFT_STORAGE_KEY = "sdcreativ-crm-blog-draft";
const AUTOSAVE_MS = 30_000;

const inputClass =
  "w-full rounded-lg border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

const titleClass =
  "w-full rounded-lg border border-gray/60 bg-white px-3 py-3 text-lg font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  postId: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function statusDotClass(status: BlogPostStatus): string {
  if (status === "published") return "bg-green-500";
  if (status === "scheduled") return "bg-blue-500";
  return "bg-amber-400";
}

function FormPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-gray/60 bg-white shadow-sm",
        className,
      )}
    >
      <header className="border-b border-gray/40 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {children}
      </label>
      {hint && <p className="mt-0.5 text-xs text-gray-text">{hint}</p>}
    </div>
  );
}

export function CrmBlogEditor({ postId }: Props) {
  const router = useRouter();
  const isNew = !postId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [customReadTime, setCustomReadTime] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...BLOG_CATEGORIES]);
  const [customCategory, setCustomCategory] = useState("");
  const [featuredOrder, setFeaturedOrder] = useState<string>("");
  const [ogImage, setOgImage] = useState("");
  const [viewCount, setViewCount] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [date, setDate] = useState(todayIso());
  const [readTime, setReadTime] = useState("");
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [status, setStatus] = useState<BlogPostStatus>("draft");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [autosaving, setAutosaving] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const skipAutosaveRef = useRef(true);

  const resolvedCategory =
    category === "__custom__" ? customCategory.trim() : category;

  const autoReadTime = useMemo(() => estimateReadTime(contentHtml), [contentHtml]);
  const effectiveReadTime = customReadTime && readTime.trim() ? readTime.trim() : autoReadTime;

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError("");
    try {
      const post = await fetchBlogPostAdmin(postId);
      applyPost(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Article introuvable.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  function applyPost(post: BlogPostRecord) {
    setTitle(post.title);
    setSlug(post.slug);
    setSlugTouched(true);
    setExcerpt(post.excerpt);
    if (categoryOptions.includes(post.category)) {
      setCategory(post.category);
      setCustomCategory("");
    } else {
      setCategory("__custom__");
      setCustomCategory(post.category);
    }
    setDate(post.date);
    setReadTime(post.readTime);
    const htmlForEstimate =
      post.contentHtml?.trim() || paragraphsToHtml(post.content) || "";
    setCustomReadTime(post.readTime !== estimateReadTime(htmlForEstimate));
    setContentHtml(
      post.contentHtml?.trim() || paragraphsToHtml(post.content) || "<p></p>",
    );
    setStatus(post.status);
    setScheduledAtLocal(toDatetimeLocalValue(post.scheduledAt));
    setCoverImage(post.coverImage ?? "");
    setOgImage(post.ogImage ?? "");
    setFeaturedOrder(post.featuredOrder ? String(post.featuredOrder) : "");
    setViewCount(post.viewCount ?? 0);
    setClickCount(post.clickCount ?? 0);
    setAuthorName(post.authorName ?? "");
    setMetaTitle(post.metaTitle ?? "");
    setMetaDescription(post.metaDescription ?? "");
    setTags(post.tags ?? []);
    setPreviewToken(post.previewToken);
    if (post.status === "published") setPublishedSlug(post.slug);
  }

  function buildPayload(options?: { forAutosave?: boolean }) {
    return {
      title: title.trim() || "Sans titre",
      slug: slug.trim() || slugifyBlogTitle(title) || "brouillon",
      excerpt: excerpt.trim() || (options?.forAutosave ? "Brouillon en cours…" : excerpt.trim()),
      category: resolvedCategory || "Stratégie digitale",
      date,
      readTime: effectiveReadTime,
      contentHtml: isHtmlEmpty(contentHtml) ? null : contentHtml,
      status,
      scheduledAt: status === "scheduled" ? fromDatetimeLocalValue(scheduledAtLocal) : null,
      coverImage: coverImage.trim() || null,
      ogImage: ogImage.trim() || null,
      featuredOrder: featuredOrder ? Number(featuredOrder) : null,
      authorName: authorName.trim() || null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      tags,
    };
  }

  const persistDraftLocal = useCallback(() => {
    if (!isNew) return;
    const payload = buildPayload({ forAutosave: true });
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  }, [isNew, title, slug, excerpt, category, customCategory, date, readTime, contentHtml, status, scheduledAtLocal, coverImage, authorName, metaTitle, metaDescription, tags, customReadTime, effectiveReadTime, resolvedCategory]);

  const runAutosave = useCallback(async () => {
    if (!postId || saving) return;
    setAutosaving(true);
    try {
      const updated = await autosaveBlogPostApi(postId, buildPayload({ forAutosave: true }));
      setPreviewToken(updated.previewToken);
      setLastAutosavedAt(new Date());
    } catch {
      /* silencieux — l'utilisateur peut enregistrer manuellement */
    } finally {
      setAutosaving(false);
    }
  }, [postId, saving, title, slug, excerpt, resolvedCategory, date, effectiveReadTime, contentHtml, status, scheduledAtLocal, coverImage, authorName, metaTitle, metaDescription, tags]);

  async function openPreview() {
    if (!postId) {
      setError("Enregistrez l'article une première fois pour générer l'aperçu.");
      return;
    }
    const currentSlug = slug.trim() || slugifyBlogTitle(title);
    if (!currentSlug) {
      setError("Indiquez un slug pour l'aperçu.");
      return;
    }
    try {
      const token = previewToken ?? (await fetchBlogPreviewTokenApi(postId));
      setPreviewToken(token);
      window.open(`/blog/${currentSlug}?preview=${token}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aperçu impossible.");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchBlogCategoriesApi()
      .then((items) => {
        if (items.length > 0) {
          setCategoryOptions(items.map((item) => item.name));
        }
      })
      .catch(() => {
        /* fallback BLOG_CATEGORIES */
      });
  }, []);

  useEffect(() => {
    if (!isNew || draftRestored) return;
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as ReturnType<typeof buildPayload>;
      setTitle(draft.title ?? "");
      setSlug(draft.slug ?? "");
      setSlugTouched(Boolean(draft.slug));
      setExcerpt(draft.excerpt ?? "");
      setContentHtml(draft.contentHtml ?? "<p></p>");
      setCoverImage(draft.coverImage ?? "");
      setAuthorName(draft.authorName ?? "");
      setMetaTitle(draft.metaTitle ?? "");
      setMetaDescription(draft.metaDescription ?? "");
      setTags(draft.tags ?? []);
      setStatus((draft.status as BlogPostStatus) ?? "draft");
      if (draft.date) setDate(draft.date);
      setDraftRestored(true);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [isNew, draftRestored]);

  useEffect(() => {
    if (isNew) {
      const timer = window.setTimeout(() => persistDraftLocal(), 1500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isNew, persistDraftLocal]);

  useEffect(() => {
    if (!postId) return undefined;
    const timer = window.setInterval(() => {
      if (skipAutosaveRef.current) {
        skipAutosaveRef.current = false;
        return;
      }
      void runAutosave();
    }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [postId, runAutosave]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched && isNew) {
      setSlug(slugifyBlogTitle(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...buildPayload(),
      excerpt: excerpt.trim(),
      category: resolvedCategory,
    };

    if (!payload.category) {
      setError("Choisissez ou saisissez une catégorie.");
      setSaving(false);
      return;
    }

    if (isHtmlEmpty(contentHtml)) {
      setError("Le contenu est requis.");
      setSaving(false);
      return;
    }

    if (status === "scheduled" && !payload.scheduledAt) {
      setError("Indiquez une date et heure de publication planifiée.");
      setSaving(false);
      return;
    }

    try {
      if (isNew) {
        const created = await createBlogPostApi(payload);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        router.replace(`/admin/crm/blog/${created.id}`);
      } else {
        const updated = await updateBlogPostApi(postId!, payload);
        applyPost(updated);
        if (updated.status === "published") setPublishedSlug(updated.slug);
        setLastAutosavedAt(new Date());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      {/* En-tête */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/crm/blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-text transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au blog
          </Link>
          <h1 className="mt-2 text-xl font-bold text-foreground">
            {isNew ? "Nouvel article" : "Modifier l'article"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(lastAutosavedAt || autosaving) && !isNew && (
            <span className="text-xs text-gray-text">
              {autosaving
                ? "Sauvegarde auto…"
                : `Sauvegardé ${lastAutosavedAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          )}
          {isNew && draftRestored && (
            <span className="text-xs text-amber-700">Brouillon local restauré</span>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => void openPreview()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-gray-light"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Aperçu
            </button>
          )}
          {publishedSlug && (
            <Link
              href={`/blog/${publishedSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-gray-light"
            >
              Voir sur le site
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
          <Link
            href="/admin/crm/blog"
            className="hidden rounded-lg border border-gray/60 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-light sm:inline-flex"
          >
            Annuler
          </Link>
          <button
            type="submit"
            form="blog-editor-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {isNew ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form id="blog-editor-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* Colonne principale — contenu */}
          <div className="space-y-6">
            <FormPanel title="Contenu de l'article">
              <div>
                <FieldLabel htmlFor="blog-title">Titre</FieldLabel>
                <input
                  id="blog-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className={titleClass}
                  placeholder="Titre de l'article"
                />
              </div>

              <div>
                <FieldLabel htmlFor="blog-slug" hint="Généré automatiquement depuis le titre">
                  URL de l&apos;article
                </FieldLabel>
                <div className="flex items-center overflow-hidden rounded-lg border border-gray/60 bg-gray-light/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="shrink-0 border-r border-gray/40 bg-gray-light/80 px-3 py-2.5 text-sm text-gray-text">
                    /blog/
                  </span>
                  <input
                    id="blog-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-0"
                    placeholder="mon-article"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="blog-excerpt" className="text-sm font-medium text-foreground">
                    Extrait
                  </label>
                  <CharCounter value={excerpt.length} max={500} />
                </div>
                <textarea
                  id="blog-excerpt"
                  required
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className={cn(inputClass, "resize-y")}
                  placeholder="Résumé affiché sur la carte blog et utilisé par défaut pour le SEO"
                  maxLength={500}
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-foreground">Corps de l&apos;article</label>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-light px-2.5 py-0.5 text-xs text-gray-text">
                    <Clock className="h-3 w-3" aria-hidden />
                    {effectiveReadTime} de lecture
                  </span>
                </div>
                <BlogRichEditor value={contentHtml} onChange={setContentHtml} />
              </div>
            </FormPanel>
          </div>

          {/* Barre latérale — publication & SEO */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <FormPanel title="Publication">
              <div>
                <FieldLabel htmlFor="blog-status">Statut</FieldLabel>
                <div className="relative">
                  <span
                    className={cn(
                      "pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full",
                      statusDotClass(status),
                    )}
                    aria-hidden
                  />
                  <select
                    title="Statut"
                    id="blog-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BlogPostStatus)}
                    className={cn(inputClass, "pl-7")}
                  >
                    {BLOG_POST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {BLOG_POST_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {status === "scheduled" && (
                <div>
                  <FieldLabel htmlFor="blog-scheduled">Date et heure de publication</FieldLabel>
                  <input
                    title="Date et heure de publication"
                    id="blog-scheduled"
                    type="datetime-local"
                    required
                    value={scheduledAtLocal}
                    onChange={(e) => setScheduledAtLocal(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="blog-date">Date affichée</FieldLabel>
                  <input
                    title="Date affichée"
                    id="blog-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="blog-category">Catégorie</FieldLabel>
                  <select
                    title="Catégorie"
                    id="blog-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">Autre…</option>
                  </select>
                </div>
              </div>

              {category === "__custom__" && (
                <div>
                  <FieldLabel htmlFor="blog-custom-category">Catégorie personnalisée</FieldLabel>
                  <input
                    title="Catégorie personnalisée"
                    id="blog-custom-category"
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <FieldLabel htmlFor="blog-featured">À la une sur /blog</FieldLabel>
                <select
                  title="À la une"
                  id="blog-featured"
                  value={featuredOrder}
                  onChange={(e) => setFeaturedOrder(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Non mis en avant</option>
                  <option value="1">Position 1 (principal)</option>
                  <option value="2">Position 2</option>
                  <option value="3">Position 3</option>
                </select>
                <p className="mt-1 text-xs text-gray-text">
                  Maximum 3 articles à la une, une position par article publié.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="blog-author">Auteur</FieldLabel>
                <input
                  id="blog-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={inputClass}
                  placeholder="Optionnel"
                />
              </div>

              <div className="rounded-lg bg-gray-light/50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-text">Temps de lecture</span>
                  <span className="text-sm font-medium text-foreground">{effectiveReadTime}</span>
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-text">
                  <input
                    type="checkbox"
                    checked={customReadTime}
                    onChange={(e) => setCustomReadTime(e.target.checked)}
                    className="rounded border-gray/60 text-primary focus:ring-primary/30"
                  />
                  Personnaliser
                </label>
                {customReadTime && (
                  <input
                    type="text"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className={cn(inputClass, "mt-2")}
                    placeholder={autoReadTime}
                  />
                )}
              </div>
            </FormPanel>

            {!isNew && (
              <FormPanel title="Statistiques">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-light/50 px-3 py-2.5 text-center">
                    <Eye className="mx-auto h-4 w-4 text-primary" aria-hidden />
                    <p className="mt-1 text-lg font-bold text-foreground">{viewCount}</p>
                    <p className="text-xs text-gray-text">Vues</p>
                  </div>
                  <div className="rounded-lg bg-gray-light/50 px-3 py-2.5 text-center">
                    <MousePointerClick className="mx-auto h-4 w-4 text-primary" aria-hidden />
                    <p className="mt-1 text-lg font-bold text-foreground">{clickCount}</p>
                    <p className="text-xs text-gray-text">Clics CTA</p>
                  </div>
                </div>
              </FormPanel>
            )}

            <FormPanel title="Image de couverture">
              <BlogImageUpload value={coverImage} onChange={setCoverImage} compact />
              <p className="mt-2 text-xs text-gray-text">
                Affichée sur la page blog et en en-tête de l&apos;article.
              </p>
            </FormPanel>

            <FormPanel title="Image Open Graph">
              <BlogImageUpload value={ogImage} onChange={setOgImage} compact />
              <p className="mt-2 text-xs text-gray-text">
                Image dédiée au partage sur les réseaux sociaux (1200×630 recommandé). Si vide,
                la couverture ou l&apos;image par défaut du site est utilisée.
              </p>
            </FormPanel>

            <FormPanel title="Référencement (SEO)">
              <div>
                <FieldLabel>Tags / mots-clés</FieldLabel>
                <BlogTagsInput value={tags} onChange={setTags} />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="blog-meta-title" className="text-sm font-medium text-foreground">
                    Meta title
                  </label>
                  <CharCounter
                    value={(metaTitle || title).length}
                    max={60}
                  />
                </div>
                <input
                  id="blog-meta-title"
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className={inputClass}
                  placeholder={title || "Identique au titre"}
                  maxLength={300}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="blog-meta-desc" className="text-sm font-medium text-foreground">
                    Meta description
                  </label>
                  <CharCounter
                    value={(metaDescription || excerpt).length}
                    max={160}
                  />
                </div>
                <textarea
                  id="blog-meta-desc"
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className={cn(inputClass, "resize-y")}
                  placeholder={excerpt || "Identique à l'extrait"}
                  maxLength={500}
                />
              </div>

              <BlogSeoPreview
                title={title}
                slug={slug}
                excerpt={excerpt}
                metaTitle={metaTitle}
                metaDescription={metaDescription}
              />
            </FormPanel>

            {!isNew && postId && (
              <BlogRevisionHistory postId={postId} onRestored={applyPost} />
            )}
          </aside>
        </div>
      </form>

      {/* Barre d'actions fixe (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray/60 bg-white/95 p-4 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-6xl gap-3">
          <Link
            href="/admin/crm/blog"
            className="flex-1 rounded-lg border border-gray/60 py-2.5 text-center text-sm font-medium"
          >
            Annuler
          </Link>
          <button
            type="submit"
            form="blog-editor-form"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isNew ? "Créer l'article" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
