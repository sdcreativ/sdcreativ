import type { BlogPostStatus } from "@/content/blog-labels";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import { updateBlogPost } from "@/lib/blog-posts";
import { isDatabaseConfigured, withDb } from "@/lib/db";

const MAX_REVISIONS_PER_POST = 30;

export type BlogRevisionSnapshot = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: string[];
  contentHtml: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: BlogPostStatus;
  coverImage: string | null;
  ogImage: string | null;
  authorName: string | null;
  scheduledAt: string | null;
  tags: string[];
  featuredOrder: number | null;
};

export type BlogRevisionRecord = {
  id: string;
  postId: string;
  snapshot: BlogRevisionSnapshot;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

type BlogRevisionRow = {
  id: string;
  post_id: string;
  snapshot: BlogRevisionSnapshot;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: Date;
};

function mapRow(row: BlogRevisionRow): BlogRevisionRecord {
  return {
    id: row.id,
    postId: row.post_id,
    snapshot: row.snapshot,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at.toISOString(),
  };
}

export function snapshotFromBlogPost(record: BlogPostRecord): BlogRevisionSnapshot {
  return {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    category: record.category,
    date: record.date,
    readTime: record.readTime,
    content: record.content,
    contentHtml: record.contentHtml,
    metaTitle: record.metaTitle,
    metaDescription: record.metaDescription,
    status: record.status,
    coverImage: record.coverImage,
    ogImage: record.ogImage,
    authorName: record.authorName,
    scheduledAt: record.scheduledAt,
    tags: record.tags,
    featuredOrder: record.featuredOrder,
  };
}

export function revisionSnapshotsEqual(
  a: BlogRevisionSnapshot,
  b: BlogRevisionSnapshot,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function saveBlogRevision(
  record: BlogPostRecord,
  author?: { name?: string | null; email?: string | null },
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const snapshot = snapshotFromBlogPost(record);

  await withDb(async (query) => {
    const { rows } = await query<BlogRevisionRow>(
      `SELECT * FROM blog_post_revisions
       WHERE post_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [record.id],
    );
    const latest = rows[0];
    if (latest && revisionSnapshotsEqual(latest.snapshot, snapshot)) {
      return;
    }

    await query(
      `INSERT INTO blog_post_revisions (post_id, snapshot, created_by_name, created_by_email)
       VALUES ($1, $2::jsonb, $3, $4)`,
      [record.id, JSON.stringify(snapshot), author?.name ?? null, author?.email ?? null],
    );

    await query(
      `DELETE FROM blog_post_revisions
       WHERE post_id = $1
         AND id NOT IN (
           SELECT id FROM blog_post_revisions
           WHERE post_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         )`,
      [record.id, MAX_REVISIONS_PER_POST],
    );
  });
}

export async function listBlogRevisions(
  postId: string,
  limit = 20,
): Promise<BlogRevisionRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const { rows } = await query<BlogRevisionRow>(
      `SELECT * FROM blog_post_revisions
       WHERE post_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [postId, limit],
    );
    return rows.map(mapRow);
  });
}

export async function restoreBlogRevision(
  postId: string,
  revisionId: string,
  author?: { name?: string | null; email?: string | null },
): Promise<BlogPostRecord | null> {
  const { getBlogPostById } = await import("@/lib/blog-posts");

  const existing = await getBlogPostById(postId);
  if (!existing) return null;

  const revision = await withDb(async (query) => {
    const { rows } = await query<BlogRevisionRow>(
      `SELECT * FROM blog_post_revisions WHERE id = $1 AND post_id = $2 LIMIT 1`,
      [revisionId, postId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });

  if (!revision) return null;

  await saveBlogRevision(existing, author);

  const snapshot = revision.snapshot;
  return updateBlogPost(
    postId,
    {
      slug: snapshot.slug,
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      category: snapshot.category,
      date: snapshot.date,
      readTime: snapshot.readTime,
      content: snapshot.content,
      contentHtml: snapshot.contentHtml,
      metaTitle: snapshot.metaTitle,
      metaDescription: snapshot.metaDescription,
      status: snapshot.status,
      coverImage: snapshot.coverImage,
      ogImage: snapshot.ogImage,
      authorName: snapshot.authorName,
      scheduledAt: snapshot.scheduledAt,
      tags: snapshot.tags,
      featuredOrder: snapshot.featuredOrder,
    },
    { skipRevision: true },
  );
}
