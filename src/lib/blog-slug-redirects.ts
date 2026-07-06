import { withDb, isDatabaseConfigured } from "@/lib/db";

export async function recordBlogSlugChange(
  postId: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (!isDatabaseConfigured() || oldSlug === newSlug) return;

  await withDb(async (query) => {
    await query(`DELETE FROM blog_slug_redirects WHERE old_slug = $1`, [newSlug]);

    await query(
      `INSERT INTO blog_slug_redirects (post_id, old_slug)
       VALUES ($1, $2)
       ON CONFLICT (old_slug) DO UPDATE SET post_id = EXCLUDED.post_id`,
      [postId, oldSlug],
    );
  });
}

/** Retourne le slug canonique actuel si l'URL demandée est une ancienne URL. */
export async function resolveBlogSlugRedirect(slug: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  return withDb(async (query) => {
    const { rows } = await query<{ slug: string }>(
      `SELECT p.slug
       FROM blog_slug_redirects r
       JOIN blog_posts p ON p.id = r.post_id
       WHERE r.old_slug = $1
         AND p.deleted_at IS NULL
         AND p.status = 'published'
       LIMIT 1`,
      [slug],
    );
    const current = rows[0]?.slug;
    if (!current || current === slug) return null;
    return current;
  });
}
