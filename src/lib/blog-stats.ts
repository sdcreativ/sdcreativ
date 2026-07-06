import { withDb, isDatabaseConfigured } from "@/lib/db";

export type BlogTrackType = "view" | "click";

export async function incrementBlogStat(slug: string, type: BlogTrackType): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const column = type === "view" ? "view_count" : "click_count";

  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE blog_posts
       SET ${column} = ${column} + 1, updated_at = updated_at
       WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
      [slug],
    );
    return (rowCount ?? 0) > 0;
  });
}
