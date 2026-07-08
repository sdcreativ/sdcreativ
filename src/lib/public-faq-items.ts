import { z } from "zod";
import { faqItems as staticFaqItems } from "@/content/faq";
import type { FaqItem } from "@/content/faq";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicFaqItemRecord = {
  id: string;
  slug: string;
  question: string;
  answer: string;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicFaqItemRow = {
  id: string;
  slug: string;
  question: string;
  answer: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: PublicFaqItemRow): PublicFaqItemRecord {
  return {
    id: row.id,
    slug: row.slug,
    question: row.question,
    answer: row.answer,
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toFaqItem(record: PublicFaqItemRecord): FaqItem {
  return {
    question: record.question,
    answer: record.answer,
  };
}

function slugifyQuestion(question: string): string {
  return slugifyBlogTitle(question).slice(0, 120) || "faq";
}

export const createPublicFaqItemSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10).max(5000),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicFaqItemSchema = createPublicFaqItemSchema.partial();

export async function listPublicFaqItems(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicFaqItemRecord[]> {
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
    const { rows } = await query<PublicFaqItemRow>(
      `SELECT * FROM public_faq_items ${where} ORDER BY sort_order ASC, question ASC`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getPublicFaqItemById(id: string): Promise<PublicFaqItemRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PublicFaqItemRow>(
      `SELECT * FROM public_faq_items WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function createPublicFaqItem(
  input: z.infer<typeof createPublicFaqItemSchema>,
): Promise<PublicFaqItemRecord> {
  const question = input.question.trim();
  const slug = slugifyQuestion(question);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_faq_items WHERE locale = $1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PublicFaqItemRow>(
      `INSERT INTO public_faq_items (slug, question, answer, locale, sort_order, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [slug, question, input.answer.trim(), input.locale, sortOrder, input.isVisible],
    );
    return mapRow(rows[0]!);
  });
}

export async function updatePublicFaqItem(
  id: string,
  input: z.infer<typeof updatePublicFaqItemSchema>,
): Promise<PublicFaqItemRecord | null> {
  const existing = await getPublicFaqItemById(id);
  if (!existing) return null;

  const nextQuestion = input.question?.trim() ?? existing.question;
  const nextSlug =
    nextQuestion !== existing.question ? slugifyQuestion(nextQuestion) : existing.slug;

  return withDb(async (query) => {
    const { rows } = await query<PublicFaqItemRow>(
      `UPDATE public_faq_items SET
        slug = $2, question = $3, answer = $4, locale = $5,
        sort_order = $6, is_visible = $7, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
      [
        id,
        nextSlug,
        nextQuestion,
        input.answer?.trim() ?? existing.answer,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deletePublicFaqItem(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_faq_items WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicFaqItem(
  id: string,
  direction: "up" | "down",
): Promise<PublicFaqItemRecord | null> {
  const item = await getPublicFaqItemById(id);
  if (!item) return null;

  return withDb(async (query) => {
    const neighborComparator = direction === "up" ? "<" : ">";
    const neighborOrder = direction === "up" ? "DESC" : "ASC";

    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_faq_items
       WHERE locale = $1 AND sort_order ${neighborComparator} $2
       ORDER BY sort_order ${neighborOrder} LIMIT 1`,
      [item.locale, item.sortOrder],
    );

    const neighbor = neighbors[0];
    if (!neighbor) return item;

    await query(`UPDATE public_faq_items SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      item.id,
      neighbor.sort_order,
    ]);
    await query(`UPDATE public_faq_items SET sort_order = $2, updated_at = NOW() WHERE id = $1`, [
      neighbor.id,
      item.sortOrder,
    ]);

    return getPublicFaqItemById(id);
  });
}

export async function importStaticFaqItems(): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < staticFaqItems.length; i += 1) {
    const item = staticFaqItems[i]!;
    const slug = slugifyQuestion(item.question);
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_faq_items WHERE slug = $1 LIMIT 1`,
          [slug],
        );
        if (rows[0]) {
          skipped += 1;
          return;
        }

        await query(
          `INSERT INTO public_faq_items (slug, question, answer, locale, sort_order, is_visible)
           VALUES ($1, $2, $3, 'fr', $4, true)`,
          [slug, item.question, item.answer, i],
        );
        imported += 1;
      });
    } catch {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
