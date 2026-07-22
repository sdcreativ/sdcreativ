import { withDb, isDatabaseConfigured } from "@/lib/db";
import { CRM_DOC_FAVORITES_MAX } from "@/content/crm-docs/context-map";

async function fetchSlugs(
  query: <R extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>,
  userId: string,
): Promise<string[]> {
  const { rows } = await query<{ page_slug: string }>(
    `SELECT page_slug FROM crm_doc_favorites
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId],
  );
  return rows.map((r) => r.page_slug);
}

export async function listCrmDocFavoriteSlugs(userId: string): Promise<string[]> {
  if (!isDatabaseConfigured() || !userId || userId === "legacy") return [];
  return withDb(async (query) => fetchSlugs(query, userId));
}

export async function addCrmDocFavorite(
  userId: string,
  pageSlug: string,
): Promise<{ slugs: string[]; error?: string }> {
  if (!isDatabaseConfigured() || !userId || userId === "legacy") {
    return { slugs: [], error: "Favoris indisponibles." };
  }
  const slug = pageSlug.trim().toLowerCase();
  if (!slug) return { slugs: await listCrmDocFavoriteSlugs(userId), error: "Slug invalide." };

  return withDb(async (query) => {
    const { rows: countRows } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM crm_doc_favorites WHERE user_id = $1`,
      [userId],
    );
    const count = Number(countRows[0]?.n ?? 0);
    const { rows: existing } = await query<{ page_slug: string }>(
      `SELECT page_slug FROM crm_doc_favorites WHERE user_id = $1 AND page_slug = $2`,
      [userId, slug],
    );
    if (existing[0]) {
      return { slugs: await fetchSlugs(query, userId) };
    }
    if (count >= CRM_DOC_FAVORITES_MAX) {
      return {
        slugs: await fetchSlugs(query, userId),
        error: `Maximum ${CRM_DOC_FAVORITES_MAX} modules favoris.`,
      };
    }
    await query(
      `INSERT INTO crm_doc_favorites (user_id, page_slug) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, slug],
    );
    return { slugs: await fetchSlugs(query, userId) };
  });
}

export async function removeCrmDocFavorite(
  userId: string,
  pageSlug: string,
): Promise<string[]> {
  if (!isDatabaseConfigured() || !userId || userId === "legacy") return [];
  const slug = pageSlug.trim().toLowerCase();
  return withDb(async (query) => {
    await query(`DELETE FROM crm_doc_favorites WHERE user_id = $1 AND page_slug = $2`, [
      userId,
      slug,
    ]);
    return fetchSlugs(query, userId);
  });
}
