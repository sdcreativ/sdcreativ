import { z } from "zod";
import { testimonials as staticTestimonials } from "@/content/testimonials";
import type { Testimonial } from "@/content/testimonials";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicTestimonialRecord = {
  id: string;
  slug: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicTestimonialRow = {
  id: string;
  slug: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicTestimonialRow): PublicTestimonialRecord {
  return {
    id: row.id,
    slug: row.slug,
    quote: row.quote,
    author: row.author,
    role: row.role,
    company: row.company,
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toTestimonial(record: PublicTestimonialRecord): Testimonial {
  return {
    id: record.slug,
    quote: record.quote,
    author: record.author,
    role: record.role,
    company: record.company,
  };
}

function slugifyTestimonial(author: string, company: string): string {
  return slugifyBlogTitle(`${author}-${company}`).slice(0, 120) || "temoignage";
}

export const createPublicTestimonialSchema = z.object({
  quote: z.string().trim().min(20).max(2000),
  author: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(160),
  company: z.string().trim().min(2).max(200),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicTestimonialSchema = createPublicTestimonialSchema.partial();

export async function listPublicTestimonials(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicTestimonialRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) {
      conditions.push("is_visible = true");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<PublicTestimonialRow>(
      `SELECT * FROM public_testimonials ${where} ORDER BY sort_order ASC, author ASC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicTestimonialById(id: string): Promise<PublicTestimonialRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicTestimonialRow>(
      `SELECT * FROM public_testimonials WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicTestimonial(
  input: z.infer<typeof createPublicTestimonialSchema>,
): Promise<PublicTestimonialRecord> {
  const author = input.author.trim();
  const company = input.company.trim();
  const slug = slugifyTestimonial(author, company);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_testimonials WHERE locale = $1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicTestimonialRow>(
      `INSERT INTO public_testimonials (slug, quote, author, role, company, locale, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        slug,
        input.quote.trim(),
        author,
        input.role.trim(),
        company,
        input.locale,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicTestimonial(
  id: string,
  input: z.infer<typeof updatePublicTestimonialSchema>,
): Promise<PublicTestimonialRecord | null> {
  const existing = await getPublicTestimonialById(id);
  if (!existing) return null;

  const nextAuthor = input.author?.trim() ?? existing.author;
  const nextCompany = input.company?.trim() ?? existing.company;
  const nextSlug =
    nextAuthor !== existing.author || nextCompany !== existing.company
      ? slugifyTestimonial(nextAuthor, nextCompany)
      : existing.slug;

  return withDb(async (query) => {
    const { rows } = await query<PublicTestimonialRow>(
      `UPDATE public_testimonials SET
        slug = $2, quote = $3, author = $4, role = $5, company = $6,
        locale = $7, sort_order = $8, is_visible = $9, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
      [
        id,
        nextSlug,
        input.quote?.trim() ?? existing.quote,
        nextAuthor,
        input.role?.trim() ?? existing.role,
        nextCompany,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicTestimonial(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_testimonials WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicTestimonial(
  id: string,
  direction: "up" | "down",
): Promise<PublicTestimonialRecord | null> {
  const item = await getPublicTestimonialById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const neighborComparator = direction === "up" ? "<" : ">";
    const neighborOrder = direction === "up" ? "DESC" : "ASC";

    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_testimonials
       WHERE locale = $1 AND sort_order ${neighborComparator} $2
       ORDER BY sort_order ${neighborOrder} LIMIT 1`,
      [item.locale, item.sortOrder],
    );

    const neighbor = neighbors[0];
    if (!neighbor) return item;

    await query(`UPDATE public_testimonials SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_testimonials SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      neighbor.id,
      item.sortOrder,
    ]);

    return getPublicTestimonialById(id);
  });
}

export async function importStaticTestimonials(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticTestimonials.length; i += 1) {
    const item = staticTestimonials[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_testimonials WHERE slug = $1 LIMIT 1`,
          [item.id],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }

        await query(
          `INSERT INTO public_testimonials (slug, quote, author, role, company, locale, sort_order, is_visible)
           VALUES ($1, $2, $3, $4, $5, 'fr', $6, true)`,
          [item.id, item.quote, item.author, item.role, item.company, i],
        );
        imported += 1;
      });
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
