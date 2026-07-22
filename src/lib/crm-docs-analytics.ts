import { isDatabaseConfigured, withDb } from "@/lib/db";

export type CrmDocViewStat = {
  slug: string;
  title: string;
  viewCount: number;
};

export async function incrementCrmDocView(slug: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const clean = slug.trim().toLowerCase();
  if (!clean) return 0;

  return withDb(async (query) => {
    const { rows } = await query<{ view_count: number }>(
      `UPDATE crm_doc_pages
       SET view_count = view_count + 1
       WHERE slug = $1 AND deleted_at IS NULL
       RETURNING view_count`,
      [clean],
    );
    return rows[0]?.view_count ?? 0;
  });
}

export async function listTopCrmDocViews(limit = 10): Promise<CrmDocViewStat[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<{ slug: string; title: string; view_count: number }>(
      `SELECT slug, title, view_count
       FROM crm_doc_pages
       WHERE deleted_at IS NULL AND status = 'published' AND view_count > 0
       ORDER BY view_count DESC, title ASC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      viewCount: r.view_count,
    }));
  });
}
