import { z } from "zod";
import { withDb, isDatabaseConfigured } from "@/lib/db";
import { CRM_DOC_CATEGORIES } from "@/content/crm-docs/catalog";
import {
  createCrmDocCategorySchema,
  slugifyDocTitle,
  updateCrmDocCategorySchema,
  type CrmDocCategoryRecord,
} from "@/lib/crm-docs-types";

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  description: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

function mapCategory(row: CategoryRow): CrmDocCategoryRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function seedCrmDocCategories(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  return withDb(async (query) => {
    let added = 0;
    for (let i = 0; i < CRM_DOC_CATEGORIES.length; i++) {
      const cat = CRM_DOC_CATEGORIES[i]!;
      const { rowCount } = await query(
        `INSERT INTO crm_doc_categories (slug, label, description, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.id, cat.label, cat.description, i],
      );
      if (rowCount) added += rowCount;
    }
    return added;
  });
}

export async function listCrmDocCategories(): Promise<CrmDocCategoryRecord[]> {
  if (!isDatabaseConfigured()) return [];
  await seedCrmDocCategories();
  return withDb(async (query) => {
    const { rows } = await query<CategoryRow>(
      `SELECT * FROM crm_doc_categories ORDER BY sort_order ASC, label ASC`,
    );
    return rows.map(mapCategory);
  });
}

export async function createCrmDocCategory(
  input: z.infer<typeof createCrmDocCategorySchema>,
): Promise<CrmDocCategoryRecord> {
  const parsed = createCrmDocCategorySchema.parse(input);
  const slug = parsed.slug?.trim() || slugifyDocTitle(parsed.label);
  return withDb(async (query) => {
    const { rows } = await query<CategoryRow>(
      `INSERT INTO crm_doc_categories (slug, label, description, sort_order)
       VALUES ($1, $2, $3, COALESCE($4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM crm_doc_categories)))
       RETURNING *`,
      [slug, parsed.label, parsed.description ?? "", parsed.sortOrder ?? null],
    );
    return mapCategory(rows[0]!);
  });
}

export async function updateCrmDocCategory(
  id: string,
  input: z.infer<typeof updateCrmDocCategorySchema>,
): Promise<CrmDocCategoryRecord | null> {
  const parsed = updateCrmDocCategorySchema.parse(input);
  return withDb(async (query) => {
    const { rows: existingRows } = await query<CategoryRow>(
      `SELECT * FROM crm_doc_categories WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextSlug = parsed.slug?.trim() || existing.slug;
    const nextLabel = parsed.label ?? existing.label;
    const nextDescription =
      parsed.description !== undefined ? parsed.description : existing.description;
    const nextSort =
      parsed.sortOrder !== undefined ? parsed.sortOrder : existing.sort_order;

    if (nextSlug !== existing.slug) {
      await query(
        `UPDATE crm_doc_pages SET category_slug = $2, updated_at = NOW()
         WHERE category_slug = $1`,
        [existing.slug, nextSlug],
      );
    }

    const { rows } = await query<CategoryRow>(
      `UPDATE crm_doc_categories SET
         slug = $2, label = $3, description = $4, sort_order = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, nextSlug, nextLabel, nextDescription, nextSort],
    );
    return rows[0] ? mapCategory(rows[0]) : null;
  });
}

export async function deleteCrmDocCategory(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rows } = await query<{ slug: string }>(
      `SELECT slug FROM crm_doc_categories WHERE id = $1`,
      [id],
    );
    const slug = rows[0]?.slug;
    if (!slug) return false;

    const { rows: usage } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM crm_doc_pages
       WHERE category_slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    if (Number(usage[0]?.n ?? 0) > 0) {
      throw new Error("Des fiches utilisent encore cette catégorie.");
    }

    const { rowCount } = await query(`DELETE FROM crm_doc_categories WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
