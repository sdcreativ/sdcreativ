"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  FolderOpen,
  ImageOff,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  ThumbsUp,
  TriangleAlert,
  UploadCloud,
  Eye,
  Languages,
  X,
  ZoomIn,
} from "lucide-react";
import {
  CRM_DOC_CATEGORIES,
  CRM_DOC_FEATURES,
  type CrmDocFeature,
} from "@/content/crm-docs/catalog";
import {
  buildDocShareHref,
  CRM_DOC_FAVORITES_MAX,
} from "@/content/crm-docs/context-map";
import {
  fetchCrmDocCategoriesApi,
  fetchCrmDocFavoritesApi,
  fetchCrmDocPagesApi,
  fetchCrmDocTopViewsApi,
  importStaticCrmDocsApi,
  publishCrmWikiApi,
  submitCrmDocFeedbackApi,
  toggleCrmDocFavoriteApi,
  trackCrmDocViewApi,
} from "@/lib/crm-docs-api";
import { resolveCrmDocScreenshotDisplaySrc } from "@/lib/crm-docs-screenshot-url";
import { isProxiedMediaUrl } from "@/lib/image-url";
import type { CrmDocCategoryRecord, CrmDocLocale, CrmDocPageRecord } from "@/lib/crm-docs-types";
import { localizeCrmDocPage } from "@/lib/crm-docs-types";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { CrmDocVideoEmbed } from "@/components/admin/CrmDocVideoEmbed";
import { CrmDocOnboardingChecklist } from "@/components/admin/CrmDocOnboardingChecklist";

const REVIEW_STALE_DAYS = 90;

type ListItem = {
  key: string;
  slug: string;
  editId: string | null;
  title: string;
  category: string;
  summary: string;
  explanation: string;
  howItWorks: string;
  contentHtml: string;
  titleEn: string;
  summaryEn: string;
  explanationEn: string;
  howItWorksEn: string;
  contentHtmlEn: string;
  href?: string;
  screenshots: string[];
  videoUrl: string | null;
  recent: boolean;
  status: "draft" | "published";
  reviewedAt: string | null;
  viewCount: number;
};

function pageToItem(page: CrmDocPageRecord): ListItem {
  return {
    key: page.slug,
    slug: page.slug,
    editId: page.id,
    title: page.title,
    category: page.categorySlug,
    summary: page.summary,
    explanation: page.explanation,
    howItWorks: page.howItWorks,
    contentHtml: page.contentHtml,
    titleEn: page.titleEn ?? "",
    summaryEn: page.summaryEn ?? "",
    explanationEn: page.explanationEn ?? "",
    howItWorksEn: page.howItWorksEn ?? "",
    contentHtmlEn: page.contentHtmlEn ?? "",
    href: page.href ?? undefined,
    screenshots: page.screenshots ?? [],
    videoUrl: page.videoUrl,
    recent: page.isRecent,
    status: page.status,
    reviewedAt: page.reviewedAt,
    viewCount: page.viewCount ?? 0,
  };
}

function featureToItem(feature: CrmDocFeature): ListItem {
  return {
    key: feature.id,
    slug: feature.id,
    editId: null,
    title: feature.title,
    category: feature.category,
    summary: feature.summary,
    explanation: feature.explanation,
    howItWorks: feature.howItWorks,
    contentHtml: "",
    titleEn: "",
    summaryEn: "",
    explanationEn: "",
    howItWorksEn: "",
    contentHtmlEn: "",
    href: feature.href,
    screenshots: feature.screenshots ?? [],
    videoUrl: null,
    recent: Boolean(feature.recent),
    status: "published",
    reviewedAt: null,
    viewCount: 0,
  };
}

function formatReviewedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isReviewStale(iso: string | null): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  const ageMs = Date.now() - d.getTime();
  return ageMs > REVIEW_STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function CrmDocumentationView() {
  const { can } = useCrmPermissions();
  const canWrite = can("docs.write");
  const { alert, confirm } = useDialog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>("all");
  const [items, setItems] = useState<ListItem[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [categories, setCategories] = useState<
    Array<{ id: string; label: string; description: string }>
  >(CRM_DOC_CATEGORIES.map((c) => ({ id: c.id, label: c.label, description: c.description })));
  const [source, setSource] = useState<"db" | "catalog">("catalog");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [publishingWiki, setPublishingWiki] = useState(false);
  const [locale, setLocale] = useState<CrmDocLocale>("fr");
  const [topViews, setTopViews] = useState<Array<{ slug: string; title: string; viewCount: number }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pages, cats, favorites] = await Promise.all([
        fetchCrmDocPagesApi(),
        fetchCrmDocCategoriesApi().catch(() => [] as CrmDocCategoryRecord[]),
        fetchCrmDocFavoritesApi().catch(() => [] as string[]),
      ]);
      setFavoriteSlugs(favorites);
      const visible = pages.filter((p) => !p.deletedAt);
      if (visible.length > 0) {
        setItems(visible.map(pageToItem));
        setSource("db");
        if (cats.length > 0) {
          setCategories(
            cats.map((c) => ({ id: c.slug, label: c.label, description: c.description })),
          );
        }
      } else {
        setItems(CRM_DOC_FEATURES.map(featureToItem));
        setSource("catalog");
        setCategories(
          CRM_DOC_CATEGORIES.map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description,
          })),
        );
      }
    } catch {
      setItems(CRM_DOC_FEATURES.map(featureToItem));
      setSource("catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("crm-docs-locale");
      if (stored === "en" || stored === "fr") setLocale(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("crm-docs-locale", locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  useEffect(() => {
    void fetchCrmDocTopViewsApi(8)
      .then(setTopViews)
      .catch(() => setTopViews([]));
  }, [loading]);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    const cat = searchParams.get("cat");
    if (
      cat &&
      (cat === "all" ||
        cat === "recent" ||
        cat === "favorites" ||
        categories.some((c) => c.id === cat))
    ) {
      setCategory(cat);
    }
  }, [searchParams, categories]);

  useEffect(() => {
    const q = query.trim();
    const currentQ = searchParams.get("q") ?? "";
    const currentCat = searchParams.get("cat") ?? "all";
    const nextCat = category === "all" ? "" : category;
    if (q === currentQ && (nextCat || "all") === (currentCat || "all")) return;
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (nextCat) params.set("cat", nextCat);
    else params.delete("cat");
    const qs = params.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`/admin/crm/documentation${qs ? `?${qs}` : ""}${hash}`, { scroll: false });
  }, [query, category, router, searchParams]);

  useEffect(() => {
    if (loading) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const slug = decodeURIComponent(hash || "");
    if (!slug) return;
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-primary/40");
      const t = window.setTimeout(() => el.classList.remove("ring-2", "ring-primary/40"), 2200);
      return () => window.clearTimeout(t);
    }
  }, [loading, items, query, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category === "favorites" && !favoriteSlugs.includes(item.slug)) return false;
      if (category === "recent" && !item.recent) return false;
      if (
        category !== "all" &&
        category !== "recent" &&
        category !== "favorites" &&
        item.category !== category
      ) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${item.title} ${item.summary} ${item.explanation} ${item.howItWorks} ${item.slug} ${item.titleEn} ${item.summaryEn} ${item.explanationEn} ${item.howItWorksEn}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, category, favoriteSlugs]);

  /** Groupement par catégorie (vue « Tout »). */
  const groupedByCategory = useMemo(() => {
    if (category !== "all") return null;
    const order = categories.map((c) => c.id);
    const map = new Map<string, ListItem[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    const groups: Array<{ id: string; label: string; description: string; items: ListItem[] }> =
      [];
    for (const id of order) {
      const list = map.get(id);
      if (!list?.length) continue;
      const meta = categories.find((c) => c.id === id);
      groups.push({
        id,
        label: meta?.label ?? id,
        description: meta?.description ?? "",
        items: list,
      });
      map.delete(id);
    }
    for (const [id, list] of map) {
      if (!list.length) continue;
      groups.push({ id, label: id, description: "", items: list });
    }
    return groups;
  }, [category, categories, filtered]);

  const activeCategoryMeta = useMemo(() => {
    if (category === "all" || category === "recent" || category === "favorites") return null;
    return categories.find((c) => c.id === category) ?? null;
  }, [category, categories]);

  const withScreenshot = items.filter((i) => i.screenshots.length > 0).length;

  async function handleImport() {
    const ok = await confirm({
      title: "Importer le catalogue",
      message:
        "Importe les fiches du catalogue code (sans écraser les slugs déjà présents en base).",
      confirmLabel: "Importer",
    });
    if (!ok) return;
    setImporting(true);
    try {
      const result = await importStaticCrmDocsApi();
      await alert({
        title: "Import terminé",
        message: `${result.pages} fiche(s) ajoutée(s), ${result.skipped} déjà présente(s).`,
      });
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Import impossible.",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleToggleFavorite(slug: string, isFavorite: boolean) {
    try {
      const slugs = await toggleCrmDocFavoriteApi(slug, isFavorite ? "remove" : "add");
      setFavoriteSlugs(slugs);
    } catch (err) {
      await alert({
        title: "Favoris",
        message: err instanceof Error ? err.message : "Impossible de mettre à jour.",
      });
    }
  }

  async function handlePublishWiki() {
    const ok = await confirm({
      title: "Publier le wiki GitHub ?",
      message:
        "Régénère le dossier wiki/ depuis les fiches publiées, puis pousse vers le dépôt wiki si CRM_WIKI_PUBLISH_ENABLED=1.",
      confirmLabel: "Publier",
    });
    if (!ok) return;
    setPublishingWiki(true);
    try {
      const result = await publishCrmWikiApi(false);
      await alert({
        title: result.pushed ? "Wiki publié" : "Wiki généré",
        message: result.pushed
          ? `${result.pages} fiche(s) poussées (${result.source}).`
          : `${result.pages} fiche(s) générées localement.${result.hint ? ` ${result.hint}` : ""}`,
      });
    } catch (err) {
      await alert({
        title: "Publication impossible",
        message: err instanceof Error ? err.message : "Erreur inattendue.",
      });
    } finally {
      setPublishingWiki(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-gray/25 bg-gradient-to-br from-white to-sky-50/50 px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">Documentation interne</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-text">
              Recherche pleine page (?q=), ancre #slug pour partager une fiche, favoris par
              utilisateur. Lecture équipe · édition réservée admin / contenu (docs.write).
            </p>
            <p className="mt-2 text-xs text-gray-text">
              {items.length} fiches · {withScreenshot} illustrées · {favoriteSlugs.length}/
              {CRM_DOC_FAVORITES_MAX} favoris · source{" "}
              {source === "db" ? "base de données" : "catalogue code (fallback)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/crm-docs/export-pdf?pack=commercial"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/50"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Guide commercial
            </a>
            <a
              href="/api/admin/crm-docs/export-pdf?pack=hr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/50"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Guide RH
            </a>
            {canWrite ? (
              <>
                <button
                  type="button"
                  disabled={publishingWiki}
                  onClick={() => void handlePublishWiki()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/50 disabled:opacity-60"
                >
                  {publishingWiki ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <UploadCloud className="h-4 w-4" aria-hidden />
                  )}
                  Publier le wiki
                </button>
                <Link
                  href="/admin/crm/documentation/categories"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/50"
                >
                  <FolderOpen className="h-4 w-4" aria-hidden />
                  Catégories
                </Link>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void handleImport()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray/40 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-gray-light/50 disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Importer catalogue
                </button>
                <Link
                  href="/admin/crm/documentation/nouveau"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nouvelle fiche
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <label className="relative mt-4 block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              locale === "en"
                ? "Search a feature… (URL ?q=)"
                : "Rechercher une fonctionnalité… (URL ?q=)"
            }
            className="w-full rounded-xl border border-gray/40 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Languages className="h-4 w-4 text-gray-text" aria-hidden />
          <button
            type="button"
            onClick={() => setLocale("fr")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold",
              locale === "fr" ? "bg-primary text-white" : "bg-gray/20 text-gray-text",
            )}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold",
              locale === "en" ? "bg-primary text-white" : "bg-gray/20 text-gray-text",
            )}
          >
            EN
          </button>
          <span className="text-[11px] text-gray-text">
            {locale === "en"
              ? "English for international contractors (FR fallback)"
              : "EN pour prestataires internationaux (repli FR)"}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-56">
            <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gray/25 bg-white p-1.5 lg:flex-col lg:overflow-visible">
              <CategoryButton
                active={category === "all"}
                onClick={() => setCategory("all")}
                label="Tout"
                count={items.length}
              />
              <CategoryButton
                active={category === "favorites"}
                onClick={() => setCategory("favorites")}
                label="Mes modules"
                count={favoriteSlugs.length}
              />
              <CategoryButton
                active={category === "recent"}
                onClick={() => setCategory("recent")}
                label="Récent"
                count={items.filter((i) => i.recent).length}
              />
              {categories.map((cat) => (
                <CategoryButton
                  key={cat.id}
                  active={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                  label={cat.label}
                  count={items.filter((i) => i.category === cat.id).length}
                />
              ))}
            </nav>

            <div className="mt-4 hidden lg:block">
              <CrmDocOnboardingChecklist locale={locale} />
            </div>

            {topViews.length > 0 ? (
              <div className="mt-4 hidden rounded-2xl border border-gray/25 bg-white p-3 shadow-sm lg:block">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-text">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {locale === "en" ? "Most viewed" : "Plus vues"}
                </p>
                <ol className="mt-2 space-y-1.5">
                  {topViews.map((row, i) => (
                    <li key={row.slug}>
                      <a
                        href={buildDocShareHref(row.slug)}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-light/70"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {i + 1}. {row.title}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-gray-text">
                          {row.viewCount}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="lg:hidden">
              <CrmDocOnboardingChecklist locale={locale} />
            </div>
            {filtered.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray/40 px-4 py-10 text-center text-sm text-gray-text">
                {category === "favorites"
                  ? locale === "en"
                    ? "No pinned modules. Use the star on a page (max 8)."
                    : "Aucun module épinglé. Utilisez l’étoile sur une fiche (max 8)."
                  : locale === "en"
                    ? "No page matches your search."
                    : "Aucune fiche ne correspond à votre recherche."}
                {canWrite && source === "catalog" && category !== "favorites" ? (
                  <>
                    {" "}
                    Importez le catalogue ou{" "}
                    <Link
                      href="/admin/crm/documentation/nouveau"
                      className="font-semibold text-primary"
                    >
                      créez une fiche
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : groupedByCategory ? (
              groupedByCategory.map((group) => (
                <section key={group.id} className="space-y-3">
                  <header className="sticky top-0 z-10 -mx-1 rounded-xl border border-gray/20 bg-[#eef2f7]/95 px-3 py-2 backdrop-blur">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-bold text-foreground">{group.label}</h2>
                      <button
                        type="button"
                        onClick={() => setCategory(group.id)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {locale === "en"
                          ? `Only this category (${group.items.length})`
                          : `Voir cette catégorie (${group.items.length})`}
                      </button>
                    </div>
                    {group.description ? (
                      <p className="mt-0.5 text-xs text-gray-text">{group.description}</p>
                    ) : null}
                  </header>
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <FeatureCard
                        key={item.key}
                        item={item}
                        locale={locale}
                        canWrite={canWrite}
                        isFavorite={favoriteSlugs.includes(item.slug)}
                        onToggleFavorite={() =>
                          void handleToggleFavorite(item.slug, favoriteSlugs.includes(item.slug))
                        }
                        onFeedback={async (kind, message) => {
                          try {
                            await submitCrmDocFeedbackApi({ slug: item.slug, kind, message });
                            await alert({
                              title: kind === "helpful" ? "Merci !" : "Signalement envoyé",
                              message:
                                kind === "helpful"
                                  ? "Votre retour a été enregistré."
                                  : "Les admins ont été notifiés.",
                            });
                          } catch (err) {
                            await alert({
                              title: "Erreur",
                              message: err instanceof Error ? err.message : "Envoi impossible.",
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <>
                {activeCategoryMeta ? (
                  <header className="rounded-xl border border-gray/20 bg-white px-4 py-3 shadow-sm">
                    <h2 className="text-base font-bold text-foreground">
                      {activeCategoryMeta.label}
                    </h2>
                    {activeCategoryMeta.description ? (
                      <p className="mt-0.5 text-sm text-gray-text">
                        {activeCategoryMeta.description}
                      </p>
                    ) : null}
                  </header>
                ) : null}
                {filtered.map((item) => (
                  <FeatureCard
                    key={item.key}
                    item={item}
                    locale={locale}
                    canWrite={canWrite}
                    isFavorite={favoriteSlugs.includes(item.slug)}
                    onToggleFavorite={() =>
                      void handleToggleFavorite(item.slug, favoriteSlugs.includes(item.slug))
                    }
                    onFeedback={async (kind, message) => {
                      try {
                        await submitCrmDocFeedbackApi({ slug: item.slug, kind, message });
                        await alert({
                          title: kind === "helpful" ? "Merci !" : "Signalement envoyé",
                          message:
                            kind === "helpful"
                              ? "Votre retour a été enregistré."
                              : "Les admins ont été notifiés.",
                        });
                      } catch (err) {
                        await alert({
                          title: "Erreur",
                          message: err instanceof Error ? err.message : "Envoi impossible.",
                        });
                      }
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors lg:w-full",
        active ? "bg-primary text-white shadow-sm" : "text-gray-text hover:bg-gray-light/70",
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-white/20 text-white" : "bg-gray/25 text-gray-text",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FeatureCard({
  item,
  locale,
  canWrite,
  isFavorite,
  onToggleFavorite,
  onFeedback,
}: {
  item: ListItem;
  locale: CrmDocLocale;
  canWrite: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onFeedback: (kind: "helpful" | "error", message?: string) => Promise<void>;
}) {
  const { prompt } = useDialog();
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const viewedRef = useRef(false);
  const localized = localizeCrmDocPage(item, locale);
  const categoryLabel =
    CRM_DOC_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
  const reviewedLabel = formatReviewedAt(item.reviewedAt);
  const stale = item.status === "published" && isReviewStale(item.reviewedAt);

  useEffect(() => {
    const el = articleRef.current;
    if (!el || viewedRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.45)) {
          if (viewedRef.current) return;
          viewedRef.current = true;
          const key = `crm-doc-view:${item.slug}`;
          try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, "1");
          } catch {
            /* ignore */
          }
          void trackCrmDocViewApi(item.slug);
          obs.disconnect();
        }
      },
      { threshold: [0.45] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [item.slug]);

  return (
    <article
      ref={articleRef}
      id={item.slug}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray/25 bg-white shadow-sm transition-shadow"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{localized.title}</h2>
            {item.status === "draft" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                Brouillon
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                Publié
              </span>
            )}
            {item.recent ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                Récent
              </span>
            ) : null}
            <span className="rounded-full bg-gray/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-text">
              {categoryLabel}
            </span>
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
                isFavorite
                  ? "bg-amber-100 text-amber-900"
                  : "bg-gray/15 text-gray-text hover:bg-gray/25",
              )}
              title={isFavorite ? "Retirer de Mes modules" : "Épingler dans Mes modules"}
            >
              <Star
                className={cn("h-3.5 w-3.5", isFavorite && "fill-current")}
                aria-hidden
              />
              {isFavorite ? "Épinglé" : "Épingler"}
            </button>
          </div>

          <p className="text-xs text-gray-text">
            {item.viewCount > 0 ? (
              <span className="mr-2 inline-flex items-center gap-1">
                <Eye className="h-3 w-3" aria-hidden />
                {item.viewCount} {locale === "en" ? "views" : "vues"}
              </span>
            ) : null}
            {reviewedLabel ? (
              <>
                Dernière revue le {reviewedLabel}
                {stale ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                    À revoir
                  </span>
                ) : null}
              </>
            ) : item.status === "published" ? (
              <span className="text-amber-800">Jamais revue — à vérifier</span>
            ) : (
              "Brouillon — non publié"
            )}
          </p>

          <p className="text-sm font-medium text-foreground/90">{localized.summary}</p>

          <CrmDocVideoEmbed videoUrl={item.videoUrl} title={localized.title} />

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-text">
              {locale === "en" ? "Explanation" : "Explication"}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {localized.explanation}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-text">
              {locale === "en" ? "How it works" : "Fonctionnement"}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {localized.howItWorks}
            </p>
          </section>

          {localized.contentHtml?.trim() ? (
            <section className="prose prose-sm max-w-none border-t border-gray/15 pt-3 text-foreground/85">
              <div dangerouslySetInnerHTML={{ __html: localized.contentHtml }} />
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Ouvrir dans le CRM
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
            <a
              href={buildDocShareHref(item.slug)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
              onClick={(e) => {
                e.preventDefault();
                const href = buildDocShareHref(item.slug);
                void navigator.clipboard?.writeText(`${window.location.origin}${href}`);
                window.history.replaceState(null, "", href);
                document.getElementById(item.slug)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              Copier le lien
            </a>
            {canWrite && item.editId ? (
              <Link
                href={`/admin/crm/documentation/${item.editId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Éditer
              </Link>
            ) : null}
            <button
              type="button"
              disabled={feedbackBusy}
              onClick={() => {
                setFeedbackBusy(true);
                void onFeedback("helpful").finally(() => setFeedbackBusy(false));
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline disabled:opacity-60"
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
              Cette fiche m’a aidé
            </button>
            <button
              type="button"
              disabled={feedbackBusy}
              onClick={() => {
                void (async () => {
                  const msg = await prompt({
                    title: "Signaler une erreur",
                    message: "Décrivez le problème (doc incorrecte, capture obsolète, etc.).",
                    label: "Description",
                    placeholder: "Ex. le bouton X n’existe plus…",
                    confirmLabel: "Envoyer",
                  });
                  if (!msg?.trim()) return;
                  setFeedbackBusy(true);
                  try {
                    await onFeedback("error", msg.trim());
                  } finally {
                    setFeedbackBusy(false);
                  }
                })();
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 hover:underline disabled:opacity-60"
            >
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              Signaler une erreur
            </button>
          </div>
        </div>

        <div className="border-t border-gray/20 bg-gray-light/30 p-3 lg:border-l lg:border-t-0">
          {item.screenshots.length > 0 ? (
            <FeatureScreenshots title={item.title} files={item.screenshots} />
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray/40 bg-white/60 px-4 py-8 text-center">
              <ImageOff className="h-7 w-7 text-gray-text/50" aria-hidden />
              <p className="text-xs font-medium text-gray-text">Aucune capture</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function FeatureScreenshots({ title, files }: { title: string; files: string[] }) {
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState<Set<string>>(() => new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
    setMissing(new Set());
    setLightboxOpen(false);
  }, [files]);

  const available = files.filter((f) => !missing.has(f));
  const pending = files.filter((f) => missing.has(f));

  useEffect(() => {
    if (available.length === 0) return;
    if (index >= available.length) setIndex(0);
  }, [available.length, index]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft" && available.length > 1) {
        setIndex((i) => (i - 1 + available.length) % available.length);
      }
      if (e.key === "ArrowRight" && available.length > 1) {
        setIndex((i) => (i + 1) % available.length);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, available.length]);

  if (available.length === 0) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/70 bg-amber-50/50 px-4 py-8 text-center">
        <ImageOff className="h-7 w-7 text-amber-700/60" aria-hidden />
        <p className="text-xs font-semibold text-amber-900">Capture(s) en attente</p>
        <ul className="max-w-[240px] space-y-1 text-[11px] text-amber-900/80">
          {files.map((file) => (
            <li key={file}>
              <code className="rounded bg-white/80 px-1">{file}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const current = available[Math.min(index, available.length - 1)]!;
  const multi = available.length > 1;
  const currentSrc = resolveCrmDocScreenshotDisplaySrc(current);
  const currentUnoptimized = isProxiedMediaUrl(currentSrc) || currentSrc.startsWith("http");

  return (
    <>
      <figure className="overflow-hidden rounded-xl border border-gray/30 bg-white">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative block w-full cursor-zoom-in text-left"
            aria-label={`Agrandir la capture — ${title}`}
          >
            <Image
              src={currentSrc}
              alt={`Capture ${index + 1}/${available.length} — ${title}`}
              width={640}
              height={400}
              unoptimized={currentUnoptimized}
              className="h-auto max-h-[420px] w-full object-cover object-top transition group-hover:brightness-95"
              onError={() => setMissing((prev) => new Set(prev).add(current))}
            />
            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" aria-hidden />
              Agrandir
            </span>
          </button>
          {multi ? (
            <>
              <button
                type="button"
                aria-label="Capture précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + available.length) % available.length);
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Capture suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % available.length);
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
        <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2 text-[11px] text-gray-text">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{current}</span>
          </span>
          {multi ? (
            <span className="shrink-0 font-semibold">
              {index + 1}/{available.length}
            </span>
          ) : null}
        </figcaption>
        {multi ? (
          <div className="flex gap-1.5 overflow-x-auto border-t border-gray/15 px-2 py-2">
            {available.map((file, i) => (
              <button
                key={file}
                type="button"
                onClick={() => setIndex(i)}
                onDoubleClick={() => {
                  setIndex(i);
                  setLightboxOpen(true);
                }}
                className={cn(
                  "relative h-12 w-16 shrink-0 overflow-hidden rounded-md border",
                  i === index ? "border-primary ring-1 ring-primary" : "border-gray/30 opacity-70",
                )}
                aria-label={`Voir capture ${i + 1}`}
              >
                <Image
                  src={resolveCrmDocScreenshotDisplaySrc(file)}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover object-top"
                  sizes="64px"
                  onError={() => setMissing((prev) => new Set(prev).add(file))}
                />
              </button>
            ))}
          </div>
        ) : null}
        {pending.length > 0 ? (
          <p className="border-t border-amber-200/60 bg-amber-50/40 px-2.5 py-1.5 text-[10px] text-amber-900/80">
            En attente : {pending.join(", ")}
          </p>
        ) : null}
      </figure>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Aperçu agrandi — ${title}`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          {multi ? (
            <>
              <button
                type="button"
                aria-label="Capture précédente"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + available.length) % available.length);
                }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25 md:left-6"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Capture suivante"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % available.length);
                }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25 md:right-6"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            </>
          ) : null}

          <div
            className="relative flex max-h-[90vh] max-w-[min(1100px,96vw)] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentSrc}
              alt={`Capture agrandie ${index + 1}/${available.length} — ${title}`}
              width={1400}
              height={900}
              unoptimized={currentUnoptimized}
              className="h-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              sizes="96vw"
              priority
            />
            <p className="mt-3 text-center text-xs text-white/80">
              {current}
              {multi ? ` · ${index + 1}/${available.length}` : ""}
              {" · Échap pour fermer"}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
