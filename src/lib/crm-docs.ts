import { z } from "zod";
import { withDb, isDatabaseConfigured } from "@/lib/db";
import { CRM_DOC_FEATURES } from "@/content/crm-docs/catalog";
import { seedCrmDocCategories } from "@/lib/crm-docs-categories";
import {
  createCrmDocPageSchema,
  slugifyDocTitle,
  updateCrmDocPageSchema,
  type CrmDocPageRecord,
  type CrmDocPageStatus,
} from "@/lib/crm-docs-types";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  summary: string;
  explanation: string;
  how_it_works: string;
  content_html: string;
  href: string | null;
  screenshots: string[] | null;
  video_url: string | null;
  title_en: string | null;
  summary_en: string | null;
  explanation_en: string | null;
  how_it_works_en: string | null;
  content_html_en: string | null;
  is_recent: boolean;
  status: CrmDocPageStatus;
  sort_order: number;
  view_count: number | null;
  reviewed_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapPage(row: PageRow): CrmDocPageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categorySlug: row.category_slug,
    summary: row.summary,
    explanation: row.explanation,
    howItWorks: row.how_it_works,
    contentHtml: row.content_html ?? "",
    href: row.href,
    screenshots: row.screenshots ?? [],
    videoUrl: row.video_url,
    titleEn: row.title_en ?? "",
    summaryEn: row.summary_en ?? "",
    explanationEn: row.explanation_en ?? "",
    howItWorksEn: row.how_it_works_en ?? "",
    contentHtmlEn: row.content_html_en ?? "",
    isRecent: row.is_recent,
    status: row.status,
    sortOrder: row.sort_order,
    viewCount: row.view_count ?? 0,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function resolveReviewedAt(
  parsed: z.infer<typeof updateCrmDocPageSchema>,
  existing: Date | null,
): Date | null {
  if (parsed.markReviewed === true) return new Date();
  if (parsed.markReviewed === false) return null;
  if (parsed.reviewedAt === null) return null;
  if (typeof parsed.reviewedAt === "string") return new Date(parsed.reviewedAt);
  return existing;
}

function buildDefaultHtml(explanation: string, howItWorks: string): string {
  const parts: string[] = [];
  if (explanation.trim()) {
    parts.push(`<h2>Explication</h2><p>${escapeHtml(explanation).replace(/\n/g, "<br/>")}</p>`);
  }
  if (howItWorks.trim()) {
    parts.push(
      `<h2>Fonctionnement</h2><p>${escapeHtml(howItWorks).replace(/\n/g, "<br/>")}</p>`,
    );
  }
  return parts.join("");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function listCrmDocPages(options?: {
  includeDeleted?: boolean;
  status?: CrmDocPageStatus;
}): Promise<CrmDocPageRecord[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (!options?.includeDeleted) conditions.push("deleted_at IS NULL");
    if (options?.status) {
      params.push(options.status);
      conditions.push(`status = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<PageRow>(
      `SELECT * FROM crm_doc_pages ${where}
       ORDER BY sort_order ASC, title ASC`,
      params,
    );
    return rows.map(mapPage);
  });
}

export async function getCrmDocPageById(id: string): Promise<CrmDocPageRecord | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<PageRow>(`SELECT * FROM crm_doc_pages WHERE id = $1`, [id]);
    return rows[0] ? mapPage(rows[0]) : null;
  });
}

export async function getCrmDocPageBySlug(slug: string): Promise<CrmDocPageRecord | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<PageRow>(
      `SELECT * FROM crm_doc_pages WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    return rows[0] ? mapPage(rows[0]) : null;
  });
}

export async function createCrmDocPage(
  input: z.infer<typeof createCrmDocPageSchema>,
): Promise<CrmDocPageRecord> {
  const parsed = createCrmDocPageSchema.parse(input);
  await seedCrmDocCategories();
  const slug = parsed.slug?.trim() || slugifyDocTitle(parsed.title);
  const contentHtml =
    parsed.contentHtml?.trim() ||
    buildDefaultHtml(parsed.explanation ?? "", parsed.howItWorks ?? "");

  return withDb(async (query) => {
    const { rows } = await query<PageRow>(
      `INSERT INTO crm_doc_pages (
         slug, title, category_slug, summary, explanation, how_it_works,
         content_html, href, screenshots, video_url,
         title_en, summary_en, explanation_en, how_it_works_en, content_html_en,
         is_recent, status, sort_order, reviewed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        slug,
        parsed.title,
        parsed.categorySlug,
        parsed.summary ?? "",
        parsed.explanation ?? "",
        parsed.howItWorks ?? "",
        contentHtml,
        parsed.href?.trim() || null,
        parsed.screenshots ?? [],
        parsed.videoUrl?.trim() || null,
        parsed.titleEn ?? "",
        parsed.summaryEn ?? "",
        parsed.explanationEn ?? "",
        parsed.howItWorksEn ?? "",
        parsed.contentHtmlEn ?? "",
        parsed.isRecent ?? false,
        parsed.status ?? "published",
        parsed.sortOrder ?? 0,
        (parsed.status ?? "published") === "published" ? new Date() : null,
      ],
    );
    return mapPage(rows[0]!);
  });
}

export async function updateCrmDocPage(
  id: string,
  input: z.infer<typeof updateCrmDocPageSchema>,
  options?: {
    skipRevision?: boolean;
    author?: { name?: string | null; email?: string | null };
  },
): Promise<CrmDocPageRecord | null> {
  const parsed = updateCrmDocPageSchema.parse(input);
  const existing = await getCrmDocPageById(id);
  if (!existing) return null;

  if (!options?.skipRevision) {
    const { saveCrmDocRevision } = await import("@/lib/crm-docs-revisions");
    await saveCrmDocRevision(existing, options?.author);
  }

  return withDb(async (query) => {
    const { rows: existingRows } = await query<PageRow>(
      `SELECT * FROM crm_doc_pages WHERE id = $1`,
      [id],
    );
    const row = existingRows[0];
    if (!row) return null;

    const reviewedAt = resolveReviewedAt(parsed, row.reviewed_at);
    const { rows } = await query<PageRow>(
      `UPDATE crm_doc_pages SET
         slug = $2,
         title = $3,
         category_slug = $4,
         summary = $5,
         explanation = $6,
         how_it_works = $7,
         content_html = $8,
         href = $9,
         screenshots = $10,
         video_url = $11,
         title_en = $12,
         summary_en = $13,
         explanation_en = $14,
         how_it_works_en = $15,
         content_html_en = $16,
         is_recent = $17,
         status = $18,
         sort_order = $19,
         reviewed_at = $20,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        parsed.slug?.trim() || row.slug,
        parsed.title ?? row.title,
        parsed.categorySlug ?? row.category_slug,
        parsed.summary !== undefined ? parsed.summary : row.summary,
        parsed.explanation !== undefined ? parsed.explanation : row.explanation,
        parsed.howItWorks !== undefined ? parsed.howItWorks : row.how_it_works,
        parsed.contentHtml !== undefined ? parsed.contentHtml : row.content_html,
        parsed.href !== undefined ? parsed.href?.trim() || null : row.href,
        parsed.screenshots ?? row.screenshots ?? [],
        parsed.videoUrl !== undefined ? parsed.videoUrl?.trim() || null : row.video_url,
        parsed.titleEn !== undefined ? parsed.titleEn : (row.title_en ?? ""),
        parsed.summaryEn !== undefined ? parsed.summaryEn : (row.summary_en ?? ""),
        parsed.explanationEn !== undefined
          ? parsed.explanationEn
          : (row.explanation_en ?? ""),
        parsed.howItWorksEn !== undefined
          ? parsed.howItWorksEn
          : (row.how_it_works_en ?? ""),
        parsed.contentHtmlEn !== undefined
          ? parsed.contentHtmlEn
          : (row.content_html_en ?? ""),
        parsed.isRecent !== undefined ? parsed.isRecent : row.is_recent,
        parsed.status ?? row.status,
        parsed.sortOrder !== undefined ? parsed.sortOrder : row.sort_order,
        reviewedAt,
      ],
    );
    return rows[0] ? mapPage(rows[0]) : null;
  });
}

export async function softDeleteCrmDocPage(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE crm_doc_pages SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  });
}

export async function restoreCrmDocPage(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE crm_doc_pages SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  });
}

/** Importe le catalogue statique (catalog.ts) — ignore les slugs déjà présents. */
export async function importStaticCrmDocs(): Promise<{
  categories: number;
  pages: number;
  skipped: number;
}> {
  const categories = await seedCrmDocCategories();
  let pages = 0;
  let skipped = 0;

  for (let i = 0; i < CRM_DOC_FEATURES.length; i++) {
    const feature = CRM_DOC_FEATURES[i]!;
    const existing = await getCrmDocPageBySlug(feature.id);
    if (existing) {
      skipped += 1;
      continue;
    }
    await createCrmDocPage({
      slug: feature.id,
      title: feature.title,
      categorySlug: feature.category,
      summary: feature.summary,
      explanation: feature.explanation,
      howItWorks: feature.howItWorks,
      contentHtml: buildDefaultHtml(feature.explanation, feature.howItWorks),
      href: feature.href ?? null,
      screenshots: feature.screenshots ?? [],
      titleEn: "",
      summaryEn: "",
      explanationEn: "",
      howItWorksEn: "",
      contentHtmlEn: "",
      isRecent: Boolean(feature.recent),
      status: "published",
      sortOrder: i,
    });
    pages += 1;
  }

  return { categories, pages, skipped };
}

/**
 * Garantit qu’une fiche existe en base pour l’édition.
 * Réutilise la page DB si présente, sinon crée depuis le catalogue (ou un squelette minimal).
 */
export async function ensureCrmDocPageBySlug(slug: string): Promise<CrmDocPageRecord> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Slug requis.");
  }

  const existing = await getCrmDocPageBySlug(normalized);
  if (existing) return existing;

  const featureIndex = CRM_DOC_FEATURES.findIndex((f) => f.id === normalized);
  const feature = featureIndex >= 0 ? CRM_DOC_FEATURES[featureIndex]! : null;

  if (feature) {
    return createCrmDocPage({
      slug: feature.id,
      title: feature.title,
      categorySlug: feature.category,
      summary: feature.summary,
      explanation: feature.explanation,
      howItWorks: feature.howItWorks,
      contentHtml: buildDefaultHtml(feature.explanation, feature.howItWorks),
      href: feature.href ?? null,
      screenshots: feature.screenshots ?? [],
      titleEn: "",
      summaryEn: "",
      explanationEn: "",
      howItWorksEn: "",
      contentHtmlEn: "",
      isRecent: Boolean(feature.recent),
      status: "published",
      sortOrder: featureIndex,
    });
  }

  return createCrmDocPage({
    slug: normalized,
    title: normalized,
    categorySlug: "overview",
    summary: "",
    explanation: "",
    howItWorks: "",
    contentHtml: "",
    href: null,
    screenshots: [],
    titleEn: "",
    summaryEn: "",
    explanationEn: "",
    howItWorksEn: "",
    contentHtmlEn: "",
    isRecent: false,
    status: "draft",
    sortOrder: 0,
  });
}

export async function countCrmDocPages(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  return withDb(async (query) => {
    const { rows } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM crm_doc_pages WHERE deleted_at IS NULL`,
    );
    return Number(rows[0]?.n ?? 0);
  });
}
