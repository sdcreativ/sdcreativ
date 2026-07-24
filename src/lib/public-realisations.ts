import { z } from "zod";
import {
  realisations as staticRealisations,
  type Realisation,
  type RealisationCaseStudy,
  type RealisationTestimonial,
  type RealisationBeforeAfter,
} from "@/content/realisations";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicRealisationRecord = {
  id: string;
  slug: string;
  title: string;
  client: string;
  sector: string;
  location: string;
  year: string;
  duration: string;
  category: string;
  description: string;
  tags: string[];
  stack: string[];
  image: string;
  imageAlt: string;
  accent: string;
  metricValue: string | null;
  metricLabel: string | null;
  featured: boolean;
  caseStudy: RealisationCaseStudy;
  testimonial: RealisationTestimonial | null;
  beforeAfter: RealisationBeforeAfter | null;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type RealisationRow = {
  id: string;
  slug: string;
  title: string;
  client: string;
  sector: string;
  location: string;
  year: string;
  duration: string;
  category: string;
  description: string;
  tags: string[];
  stack: string[];
  image: string;
  image_alt: string;
  accent: string;
  metric_value: string | null;
  metric_label: string | null;
  featured: boolean;
  case_study: RealisationCaseStudy;
  testimonial: RealisationTestimonial | null;
  before_after: RealisationBeforeAfter | null;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

const caseStudySchema = z.object({
  challenge: z.string().trim().min(10).max(2000),
  solution: z.string().trim().min(10).max(2000),
  results: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
});

const testimonialSchema = z.object({
  quote: z.string().trim().min(10).max(2000),
  author: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(160),
});

const beforeAfterSchema = z.object({
  beforeLabel: z.string().trim().min(2).max(120),
  afterLabel: z.string().trim().min(2).max(120),
});

export const createPublicRealisationSchema = z.object({
  slug: z.string().trim().min(2).max(120).optional(),
  title: z.string().trim().min(2).max(200),
  client: z.string().trim().min(2).max(160),
  sector: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(160),
  year: z.string().trim().min(4).max(10),
  duration: z.string().trim().min(2).max(40),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(2000),
  tags: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  stack: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  image: z.string().trim().min(1).max(512),
  imageAlt: z.string().trim().min(2).max(300),
  accent: z.string().trim().min(4).max(20),
  metricValue: z.string().trim().max(40).optional(),
  metricLabel: z.string().trim().max(120).optional(),
  featured: z.boolean().default(false),
  caseStudy: caseStudySchema,
  testimonial: testimonialSchema.optional().nullable(),
  beforeAfter: beforeAfterSchema.optional().nullable(),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicRealisationSchema = createPublicRealisationSchema.partial();

function mapRow(row: RealisationRow): PublicRealisationRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    client: row.client,
    sector: row.sector,
    location: row.location,
    year: row.year,
    duration: row.duration,
    category: row.category,
    description: row.description,
    tags: row.tags ?? [],
    stack: row.stack ?? [],
    image: row.image,
    imageAlt: row.image_alt,
    accent: row.accent,
    metricValue: row.metric_value,
    metricLabel: row.metric_label,
    featured: row.featured,
    caseStudy: row.case_study,
    testimonial: row.testimonial,
    beforeAfter: row.before_after,
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toRealisation(record: PublicRealisationRecord): Realisation {
  return {
    id: record.slug,
    title: record.title,
    client: record.client,
    sector: record.sector,
    location: record.location,
    year: record.year,
    duration: record.duration,
    category: record.category,
    description: record.description,
    tags: record.tags,
    stack: record.stack,
    image: record.image,
    imageAlt: record.imageAlt,
    accent: record.accent,
    metric:
      record.metricValue && record.metricLabel
        ? { value: record.metricValue, label: record.metricLabel }
        : undefined,
    featured: record.featured || undefined,
    caseStudy: record.caseStudy,
    testimonial: record.testimonial ?? undefined,
    beforeAfter: record.beforeAfter ?? undefined,
  };
}

function slugifyRealisation(title: string, client: string): string {
  return slugifyBlogTitle(`${client}-${title}`).slice(0, 120) || "realisation";
}

export async function listPublicRealisations(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicRealisationRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) conditions.push("is_visible = true");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<RealisationRow>(
      `SELECT * FROM public_realisations ${where} ORDER BY sort_order ASC, title ASC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicRealisationById(id: string): Promise<PublicRealisationRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<RealisationRow>(
      `SELECT * FROM public_realisations WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getPublicRealisationBySlug(
  slug: string,
  locale?: string,
): Promise<PublicRealisationRecord | null> {
  return withDb(async (query) => {
    if (locale) {
      const { rows } = await query<RealisationRow>(
        `SELECT * FROM public_realisations
         WHERE slug = $1 AND locale = $2 AND is_visible = true
         LIMIT 1`,
        [slug, locale],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    }

    const { rows } = await query<RealisationRow>(
      `SELECT * FROM public_realisations WHERE slug = $1 AND is_visible = true LIMIT 1`,
      [slug],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicRealisation(
  input: z.infer<typeof createPublicRealisationSchema>,
): Promise<PublicRealisationRecord> {
  const slug =
    input.slug?.trim() || slugifyRealisation(input.title, input.client);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_realisations WHERE locale=$1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<RealisationRow>(
      `INSERT INTO public_realisations (
        slug, title, client, sector, location, year, duration, category, description,
        tags, stack, image, image_alt, accent, metric_value, metric_label, featured,
        case_study, testimonial, before_after, locale, sort_order, is_visible
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
      [
        slug,
        input.title.trim(),
        input.client.trim(),
        input.sector.trim(),
        input.location.trim(),
        input.year.trim(),
        input.duration.trim(),
        input.category.trim(),
        input.description.trim(),
        input.tags,
        input.stack,
        input.image.trim(),
        input.imageAlt.trim(),
        input.accent.trim(),
        input.metricValue?.trim() || null,
        input.metricLabel?.trim() || null,
        input.featured,
        JSON.stringify(input.caseStudy),
        input.testimonial ? JSON.stringify(input.testimonial) : null,
        input.beforeAfter ? JSON.stringify(input.beforeAfter) : null,
        input.locale,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicRealisation(
  id: string,
  input: z.infer<typeof updatePublicRealisationSchema>,
): Promise<PublicRealisationRecord | null> {
  const existing = await getPublicRealisationById(id);
  if (!existing) return null;

  const nextTitle = input.title?.trim() ?? existing.title;
  const nextClient = input.client?.trim() ?? existing.client;
  const nextSlug =
    input.slug?.trim() ||
    (nextTitle !== existing.title || nextClient !== existing.client
      ? slugifyRealisation(nextTitle, nextClient)
      : existing.slug);

  return withDb(async (query) => {
    const { rows } = await query<RealisationRow>(
      `UPDATE public_realisations SET
        slug=$2, title=$3, client=$4, sector=$5, location=$6, year=$7, duration=$8,
        category=$9, description=$10, tags=$11, stack=$12, image=$13, image_alt=$14,
        accent=$15, metric_value=$16, metric_label=$17, featured=$18,
        case_study=$19, testimonial=$20, before_after=$21, locale=$22, sort_order=$23,
        is_visible=$24, updated_at=NOW()
      WHERE id=$1 RETURNING *`,
      [
        id,
        nextSlug,
        nextTitle,
        nextClient,
        input.sector?.trim() ?? existing.sector,
        input.location?.trim() ?? existing.location,
        input.year?.trim() ?? existing.year,
        input.duration?.trim() ?? existing.duration,
        input.category?.trim() ?? existing.category,
        input.description?.trim() ?? existing.description,
        input.tags ?? existing.tags,
        input.stack ?? existing.stack,
        input.image?.trim() ?? existing.image,
        input.imageAlt?.trim() ?? existing.imageAlt,
        input.accent?.trim() ?? existing.accent,
        input.metricValue !== undefined ? input.metricValue?.trim() || null : existing.metricValue,
        input.metricLabel !== undefined ? input.metricLabel?.trim() || null : existing.metricLabel,
        input.featured ?? existing.featured,
        JSON.stringify(input.caseStudy ?? existing.caseStudy),
        input.testimonial !== undefined
          ? input.testimonial
            ? JSON.stringify(input.testimonial)
            : null
          : existing.testimonial
            ? JSON.stringify(existing.testimonial)
            : null,
        input.beforeAfter !== undefined
          ? input.beforeAfter
            ? JSON.stringify(input.beforeAfter)
            : null
          : existing.beforeAfter
            ? JSON.stringify(existing.beforeAfter)
            : null,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicRealisation(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_realisations WHERE id=$1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicRealisation(
  id: string,
  direction: "up" | "down",
): Promise<PublicRealisationRecord | null> {
  const item = await getPublicRealisationById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const cmp = direction === "up" ? "<" : ">";
    const ord = direction === "up" ? "DESC" : "ASC";
    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_realisations WHERE locale=$1 AND sort_order ${cmp} $2 ORDER BY sort_order ${ord} LIMIT 1`,
      [item.locale, item.sortOrder],
    );
    const neighbor = neighbors[0];
    if (!neighbor) return item;
    await query(`UPDATE public_realisations SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_realisations SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [
      neighbor.id,
      item.sortOrder,
    ]);
    return getPublicRealisationById(id);
  });
}

export async function importStaticRealisations(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticRealisations.length; i += 1) {
    const r = staticRealisations[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_realisations WHERE slug=$1`,
          [r.id],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }
        await query(
          `INSERT INTO public_realisations (
            slug, title, client, sector, location, year, duration, category, description,
            tags, stack, image, image_alt, accent, metric_value, metric_label, featured,
            case_study, testimonial, before_after, locale, sort_order, is_visible
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'fr',$21,true)`,
          [
            r.id,
            r.title,
            r.client,
            r.sector,
            r.location,
            r.year,
            r.duration,
            r.category,
            r.description,
            r.tags,
            r.stack,
            r.image,
            r.imageAlt,
            r.accent,
            r.metric?.value ?? null,
            r.metric?.label ?? null,
            r.featured ?? false,
            JSON.stringify(r.caseStudy),
            r.testimonial ? JSON.stringify(r.testimonial) : null,
            r.beforeAfter ? JSON.stringify(r.beforeAfter) : null,
            i,
          ],
        );
        imported += 1;
      });
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
