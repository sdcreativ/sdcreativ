import { z } from "zod";
import { BLOG_CATEGORIES } from "@/content/blog-labels";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type BlogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  createdAt: string;
};

type BlogCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: Date;
};

function mapRow(row: BlogCategoryRow): BlogCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
  };
}

function slugifyCategoryName(name: string): string {
  return slugifyBlogTitle(name).slice(0, 120) || "categorie";
}

export async function seedBlogCategories(
  query: <R extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>,
): Promise<void> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM blog_categories`,
  );
  if (Number(rows[0]?.count ?? 0) > 0) return;

  for (let i = 0; i < BLOG_CATEGORIES.length; i += 1) {
    const name = BLOG_CATEGORIES[i]!;
    const slug = slugifyCategoryName(name);
    await query(
      `INSERT INTO blog_categories (name, slug, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [name, slug, i],
    );
  }
}

export async function listBlogCategories(): Promise<BlogCategoryRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const { rows } = await query<BlogCategoryRow>(
      `SELECT * FROM blog_categories ORDER BY sort_order ASC, name ASC`,
    );
    return rows.map(mapRow);
  });
}

export async function listBlogCategoryNames(): Promise<string[]> {
  const categories = await listBlogCategories();
  if (categories.length > 0) {
    return categories.map((category) => category.name);
  }
  return [...BLOG_CATEGORIES];
}

export async function isBlogCategoryName(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;

  if (!isDatabaseConfigured()) {
    return (BLOG_CATEGORIES as readonly string[]).includes(trimmed);
  }

  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM blog_categories WHERE name = $1 LIMIT 1`,
      [trimmed],
    );
    return rows.length > 0;
  });
}

const createBlogCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const updateBlogCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export async function createBlogCategory(
  input: z.infer<typeof createBlogCategorySchema>,
): Promise<BlogCategoryRecord> {
  const name = input.name.trim();
  const slug = slugifyCategoryName(name);

  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM blog_categories`,
      )).rows[0]?.next ??
      0;

    const { rows } = await query<BlogCategoryRow>(
      `INSERT INTO blog_categories (name, slug, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, sortOrder],
    );
    return mapRow(rows[0]!);
  });
}

export async function updateBlogCategory(
  id: string,
  input: z.infer<typeof updateBlogCategorySchema>,
): Promise<BlogCategoryRecord | null> {
  const existing = await getBlogCategoryById(id);
  if (!existing) return null;

  const nextName = input.name?.trim() ?? existing.name;
  const nextSlug =
    nextName !== existing.name ? slugifyCategoryName(nextName) : existing.slug;
  const nextSortOrder = input.sortOrder ?? existing.sortOrder;

  return withDb(async (query) => {
    if (nextName !== existing.name) {
      await query(
        `UPDATE blog_posts SET category = $2, updated_at = NOW() WHERE category = $1`,
        [existing.name, nextName],
      );
    }

    const { rows } = await query<BlogCategoryRow>(
      `UPDATE blog_categories SET
        name = $2,
        slug = $3,
        sort_order = $4
      WHERE id = $1
      RETURNING *`,
      [id, nextName, nextSlug, nextSortOrder],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function deleteBlogCategory(id: string): Promise<boolean> {
  const existing = await getBlogCategoryById(id);
  if (!existing) return false;

  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM blog_posts WHERE category = $1 AND deleted_at IS NULL`,
      [existing.name],
    );
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw new Error("Impossible de supprimer une catégorie utilisée par des articles.");
    }

    const { rowCount } = await query(`DELETE FROM blog_categories WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

async function getBlogCategoryById(id: string): Promise<BlogCategoryRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<BlogCategoryRow>(
      `SELECT * FROM blog_categories WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export { createBlogCategorySchema, updateBlogCategorySchema };
