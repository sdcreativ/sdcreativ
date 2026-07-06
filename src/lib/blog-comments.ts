import { z } from "zod";
import { createHash } from "node:crypto";
import { withDb, isDatabaseConfigured } from "@/lib/db";

export const BLOG_COMMENT_STATUSES = ["pending", "approved", "rejected", "spam"] as const;
export type BlogCommentStatus = (typeof BLOG_COMMENT_STATUSES)[number];

export type BlogCommentRecord = {
  id: string;
  postId: string;
  postSlug: string;
  postTitle: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  status: BlogCommentStatus;
  createdAt: string;
  moderatedAt: string | null;
  moderatedByName: string | null;
};

type BlogCommentRow = {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string | null;
  content: string;
  status: BlogCommentStatus;
  ip_hash: string | null;
  created_at: Date;
  moderated_at: Date | null;
  moderated_by_name: string | null;
  post_slug?: string;
  post_title?: string;
};

function mapRow(row: BlogCommentRow): BlogCommentRecord {
  return {
    id: row.id,
    postId: row.post_id,
    postSlug: row.post_slug ?? "",
    postTitle: row.post_title ?? "",
    authorName: row.author_name,
    authorEmail: row.author_email,
    content: row.content,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    moderatedAt: row.moderated_at?.toISOString() ?? null,
    moderatedByName: row.moderated_by_name,
  };
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}

export const createBlogCommentSchema = z.object({
  authorName: z.string().trim().min(2).max(120),
  authorEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  content: z.string().trim().min(3).max(2000),
  website: z.string().max(0).optional(),
});

export const moderateBlogCommentSchema = z.object({
  status: z.enum(["approved", "rejected", "spam"]),
});

export async function listApprovedBlogComments(postSlug: string): Promise<BlogCommentRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const { rows } = await query<BlogCommentRow>(
      `SELECT c.*, p.slug AS post_slug, p.title AS post_title
       FROM blog_comments c
       JOIN blog_posts p ON p.id = c.post_id
       WHERE p.slug = $1
         AND c.status = 'approved'
         AND p.status = 'published'
         AND p.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [postSlug],
    );
    return rows.map(mapRow);
  });
}

export async function listBlogCommentsForModeration(
  status: BlogCommentStatus = "pending",
  limit = 50,
): Promise<BlogCommentRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const { rows } = await query<BlogCommentRow>(
      `SELECT c.*, p.slug AS post_slug, p.title AS post_title
       FROM blog_comments c
       JOIN blog_posts p ON p.id = c.post_id
       WHERE c.status = $1
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [status, limit],
    );
    return rows.map(mapRow);
  });
}

export async function countPendingBlogComments(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM blog_comments WHERE status = 'pending'`,
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function createBlogComment(
  postSlug: string,
  input: z.infer<typeof createBlogCommentSchema>,
  ip?: string | null,
): Promise<BlogCommentRecord> {
  if (input.website) {
    throw new Error("Commentaire rejeté.");
  }

  return withDb(async (query) => {
    const { rows: posts } = await query<{ id: string }>(
      `SELECT id FROM blog_posts
       WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
       LIMIT 1`,
      [postSlug],
    );
    const postId = posts[0]?.id;
    if (!postId) {
      throw new Error("Article introuvable.");
    }

    if (ip) {
      const ipHash = hashIp(ip);
      const { rows: recent } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM blog_comments
         WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
        [ipHash],
      );
      if (Number(recent[0]?.count ?? 0) >= 3) {
        throw new Error("Trop de commentaires envoyés récemment. Réessayez plus tard.");
      }
    }

    const { rows } = await query<BlogCommentRow>(
      `INSERT INTO blog_comments (post_id, author_name, author_email, content, ip_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        postId,
        input.authorName.trim(),
        input.authorEmail?.trim() || null,
        input.content.trim(),
        ip ? hashIp(ip) : null,
      ],
    );

    const comment = mapRow(rows[0]!);
    return { ...comment, postSlug, postTitle: "" };
  });
}

export async function moderateBlogComment(
  id: string,
  status: "approved" | "rejected" | "spam",
  moderatorName?: string | null,
): Promise<BlogCommentRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<BlogCommentRow>(
      `UPDATE blog_comments SET
        status = $2,
        moderated_at = NOW(),
        moderated_by_name = $3
      WHERE id = $1
      RETURNING *`,
      [id, status, moderatorName ?? null],
    );
    if (!rows[0]) return null;

    const { rows: posts } = await query<{ slug: string; title: string }>(
      `SELECT slug, title FROM blog_posts WHERE id = $1 LIMIT 1`,
      [rows[0].post_id],
    );
    const post = posts[0];
    return {
      ...mapRow(rows[0]),
      postSlug: post?.slug ?? "",
      postTitle: post?.title ?? "",
    };
  });
}
