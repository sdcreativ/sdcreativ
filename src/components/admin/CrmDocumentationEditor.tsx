"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Save, ShieldOff, Trash2 } from "lucide-react";
import { BlogRichEditor } from "@/components/admin/blog/BlogRichEditor";
import { useDialog } from "@/components/ui/DialogProvider";
import { useCrmPermissions } from "@/hooks/useCrmPermissions";
import {
  createCrmDocPageApi,
  deleteCrmDocPageApi,
  fetchCrmDocCategoriesApi,
  fetchCrmDocPageApi,
  updateCrmDocPageApi,
} from "@/lib/crm-docs-api";
import type { CrmDocCategoryRecord, CrmDocPageRecord, CrmDocPageStatus } from "@/lib/crm-docs-types";
import { slugifyDocTitle } from "@/lib/crm-docs-types";
import { CrmDocScreenshotsUpload } from "@/components/admin/CrmDocScreenshotsUpload";
import { CrmDocRevisionHistory } from "@/components/admin/CrmDocRevisionHistory";

const fieldClass =
  "mt-1 w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2";

type Props = { pageId: string | null };

export function CrmDocumentationEditor({ pageId }: Props) {
  const router = useRouter();
  const { can, loading: permLoading } = useCrmPermissions();
  const canWrite = can("docs.write");
  const { alert, confirm } = useDialog();
  const [loading, setLoading] = useState(Boolean(pageId));
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CrmDocCategoryRecord[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [summary, setSummary] = useState("");
  const [explanation, setExplanation] = useState("");
  const [howItWorks, setHowItWorks] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [href, setHref] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isRecent, setIsRecent] = useState(false);
  const [status, setStatus] = useState<CrmDocPageStatus>("published");
  const [sortOrder, setSortOrder] = useState(0);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [summaryEn, setSummaryEn] = useState("");
  const [explanationEn, setExplanationEn] = useState("");
  const [howItWorksEn, setHowItWorksEn] = useState("");
  const [contentHtmlEn, setContentHtmlEn] = useState("");

  const load = useCallback(async () => {
    const cats = await fetchCrmDocCategoriesApi();
    setCategories(cats);
    if (!pageId) {
      setCategorySlug(cats[0]?.slug ?? "overview");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchCrmDocPageApi(pageId);
      setTitle(page.title);
      setSlug(page.slug);
      setCategorySlug(page.categorySlug);
      setSummary(page.summary);
      setExplanation(page.explanation);
      setHowItWorks(page.howItWorks);
      setContentHtml(page.contentHtml);
      setHref(page.href ?? "");
      setScreenshots(page.screenshots ?? []);
      setIsRecent(page.isRecent);
      setStatus(page.status);
      setSortOrder(page.sortOrder);
      setReviewedAt(page.reviewedAt);
      setVideoUrl(page.videoUrl ?? "");
      setTitleEn(page.titleEn ?? "");
      setSummaryEn(page.summaryEn ?? "");
      setExplanationEn(page.explanationEn ?? "");
      setHowItWorksEn(page.howItWorksEn ?? "");
      setContentHtmlEn(page.contentHtmlEn ?? "");
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Chargement impossible.",
      });
      router.push("/admin/crm/documentation");
    } finally {
      setLoading(false);
    }
  }, [pageId, alert, router]);

  useEffect(() => {
    if (!permLoading && canWrite) void load();
  }, [load, permLoading, canWrite]);


  function applyPage(page: CrmDocPageRecord) {
    setTitle(page.title);
    setSlug(page.slug);
    setCategorySlug(page.categorySlug);
    setSummary(page.summary);
    setExplanation(page.explanation);
    setHowItWorks(page.howItWorks);
    setContentHtml(page.contentHtml);
    setHref(page.href ?? "");
    setScreenshots(page.screenshots ?? []);
    setIsRecent(page.isRecent);
    setStatus(page.status);
    setSortOrder(page.sortOrder);
    setReviewedAt(page.reviewedAt);
    setVideoUrl(page.videoUrl ?? "");
    setTitleEn(page.titleEn ?? "");
    setSummaryEn(page.summaryEn ?? "");
    setExplanationEn(page.explanationEn ?? "");
    setHowItWorksEn(page.howItWorksEn ?? "");
    setContentHtmlEn(page.contentHtmlEn ?? "");
  }

  async function handleSave(alsoMarkReviewed = false) {
    if (!title.trim() || !categorySlug) {
      await alert({ title: "Champs requis", message: "Titre et catégorie sont obligatoires." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugifyDocTitle(title),
        categorySlug,
        summary: summary.trim(),
        explanation: explanation.trim(),
        howItWorks: howItWorks.trim(),
        contentHtml,
        href: href.trim() || null,
        screenshots,
        videoUrl: videoUrl.trim() || null,
        titleEn: titleEn.trim(),
        summaryEn: summaryEn.trim(),
        explanationEn: explanationEn.trim(),
        howItWorksEn: howItWorksEn.trim(),
        contentHtmlEn,
        isRecent,
        status,
        sortOrder,
        ...(alsoMarkReviewed ? { markReviewed: true } : {}),
      };
      if (pageId) {
        const updated = await updateCrmDocPageApi(pageId, payload);
        setReviewedAt(updated.reviewedAt);
        await alert({
          title: "Enregistré",
          message: alsoMarkReviewed
            ? "Fiche mise à jour et marquée comme revue."
            : "Fiche mise à jour.",
        });
      } else {
        const created = await createCrmDocPageApi(payload);
        await alert({ title: "Créée", message: "Fiche créée." });
        router.replace(`/admin/crm/documentation/${created.id}`);
      }
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pageId) return;
    const ok = await confirm({
      title: "Mettre à la corbeille",
      message: "Cette fiche ne sera plus visible dans la documentation.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCrmDocPageApi(pageId);
      router.push("/admin/crm/documentation");
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    }
  }

  if (permLoading || (canWrite && loading)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-8 text-center shadow-sm">
        <ShieldOff className="mx-auto h-10 w-10 text-accent" aria-hidden />
        <h2 className="mt-4 text-lg font-bold text-foreground">Écriture réservée</h2>
        <p className="mt-2 text-sm text-gray-text">
          Seuls les comptes admin ou rôle contenu (permission docs.write) peuvent éditer la
          documentation. L’équipe conserve l’accès en lecture.
        </p>
        <Link
          href="/admin/crm/documentation"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Retour à la documentation
        </Link>
      </div>
    );
  }

  const reviewedLabel = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/crm/documentation"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-text hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Documentation
        </Link>
        <div className="flex flex-wrap gap-2">
          {pageId ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Marquer revue
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/5"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Corbeille
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray/25 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-foreground">
          {pageId ? "Éditer la fiche" : "Nouvelle fiche"}
        </h1>
        <p className="mt-1 text-sm text-gray-text">
          {reviewedLabel
            ? `Dernière revue le ${reviewedLabel}`
            : "Pas encore de date de revue — utilisez « Marquer revue » après vérification."}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Titre
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!pageId && !slug) setSlug(slugifyDocTitle(e.target.value));
              }}
              className={fieldClass}
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Catégorie
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={fieldClass}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Statut
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CrmDocPageStatus)}
              className={fieldClass}
            >
              <option value="published">Publié</option>
              <option value="draft">Brouillon</option>
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Ordre
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Résumé
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Explication
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Fonctionnement
            <textarea
              value={howItWorks}
              onChange={(e) => setHowItWorks(e.target.value)}
              rows={4}
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Contenu enrichi (TipTap)
            </p>
            <div className="mt-1">
              <BlogRichEditor value={contentHtml} onChange={setContentHtml} />
            </div>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Lien CRM / page
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/admin/crm/…"
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Captures d’écran
            </p>
            <div className="mt-1">
              <CrmDocScreenshotsUpload value={screenshots} onChange={setScreenshots} />
            </div>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
            Vidéo courte (Loom)
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.loom.com/share/…"
              className={fieldClass}
            />
          </label>

          <div className="sm:col-span-2 rounded-xl border border-dashed border-gray/40 bg-gray-light/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-text">
              Traduction EN (prestataires)
            </p>
            <p className="mt-1 text-[11px] text-gray-text">
              Laisser vide pour conserver le français à l’affichage EN.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
                Title (EN)
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={fieldClass} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
                Summary (EN)
                <textarea value={summaryEn} onChange={(e) => setSummaryEn(e.target.value)} rows={2} className={fieldClass} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
                Explanation (EN)
                <textarea value={explanationEn} onChange={(e) => setExplanationEn(e.target.value)} rows={3} className={fieldClass} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text sm:col-span-2">
                How it works (EN)
                <textarea value={howItWorksEn} onChange={(e) => setHowItWorksEn(e.target.value)} rows={3} className={fieldClass} />
              </label>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Rich content (EN)
                </p>
                <div className="mt-1">
                  <BlogRichEditor value={contentHtmlEn} onChange={setContentHtmlEn} />
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={isRecent}
              onChange={(e) => setIsRecent(e.target.checked)}
              className="h-4 w-4 rounded border-gray/60"
            />
            Marquer comme récent
          </label>
        </div>
      </div>

      {pageId ? (
        <CrmDocRevisionHistory pageId={pageId} onRestored={applyPage} />
      ) : null}
    </div>
  );
}
