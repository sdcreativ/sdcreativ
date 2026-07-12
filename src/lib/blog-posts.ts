import { z } from "zod";
import type { BlogPost } from "@/content/blog";
import {
  BLOG_CATEGORIES,
  BLOG_POST_STATUSES,
  type BlogPostStatus,
} from "@/content/blog-labels";
import {
  estimateReadTime,
  htmlToParagraphs,
  isHtmlEmpty,
  resolveContentHtml,
} from "@/lib/blog-content";
import type { BlogPostRecord } from "@/lib/blog-posts-types";
import { slugifyBlogTitle, normalizeBlogTags } from "@/lib/blog-posts-types";
import { randomBytes } from "node:crypto";
import { revalidateBlogPaths } from "@/lib/blog-revalidate";
import { withDb, isDatabaseConfigured } from "@/lib/db";

export type { BlogPostRecord } from "@/lib/blog-posts-types";
export {
  formatContentParagraphs,
  parseContentParagraphs,
  slugifyBlogTitle,
  normalizeBlogTags,
} from "@/lib/blog-posts-types";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: Date;
  read_time: string;
  content: unknown;
  content_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: BlogPostStatus;
  cover_image: string | null;
  og_image: string | null;
  featured_order: number | null;
  author_name: string | null;
  published_at: Date | null;
  scheduled_at: Date | null;
  deleted_at: Date | null;
  tags: string[] | null;
  preview_token: string | null;
  view_count: number;
  click_count: number;
  created_at: Date;
  updated_at: Date;
};

function serializeContentJson(content: string[]): string {
  return JSON.stringify(content);
}

function parseContentJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

function createPreviewToken(): string {
  return randomBytes(24).toString("hex");
}

function mapRow(row: BlogPostRow): BlogPostRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    date: row.date.toISOString().slice(0, 10),
    readTime: row.read_time,
    content: parseContentJson(row.content),
    contentHtml: row.content_html,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    status: row.status,
    coverImage: row.cover_image,
    ogImage: row.og_image,
    featuredOrder: row.featured_order,
    authorName: row.author_name,
    publishedAt: row.published_at?.toISOString() ?? null,
    scheduledAt: row.scheduled_at?.toISOString() ?? null,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    tags: row.tags ?? [],
    previewToken: row.preview_token,
    viewCount: row.view_count ?? 0,
    clickCount: row.click_count ?? 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toPublicBlogPost(record: BlogPostRecord): BlogPost {
  const contentHtml = resolveContentHtml(record);
  return {
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    category: record.category,
    date: record.date,
    readTime: record.readTime,
    content: record.content.length > 0 ? record.content : htmlToParagraphs(contentHtml),
    contentHtml,
    coverImage: record.coverImage ?? undefined,
    ogImage: record.ogImage ?? undefined,
    featuredOrder: record.featuredOrder ?? undefined,
    metaTitle: record.metaTitle ?? undefined,
    metaDescription: record.metaDescription ?? record.excerpt,
    tags: record.tags.length > 0 ? record.tags : undefined,
  };
}

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (a-z, 0-9, tirets).");

const optionalImageUrl = z
  .string()
  .trim()
  .max(512)
  .optional()
  .nullable()
  .transform((v) => (!v ? null : v))
  .refine(
    (v) => v === null || /^https?:\/\/.+/i.test(v) || v.startsWith("/"),
    "URL d'image invalide.",
  );

const blogPostBaseSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(3).max(300),
  excerpt: z.string().trim().min(10).max(500),
  category: z.string().trim().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.string().trim().min(2).max(20).optional(),
  content: z.array(z.string().trim().min(1)).optional(),
  contentHtml: z.string().trim().optional().nullable(),
  metaTitle: z.string().trim().max(300).optional().nullable(),
  metaDescription: z.string().trim().max(500).optional().nullable(),
  status: z.enum(BLOG_POST_STATUSES).default("draft"),
  scheduledAt: z.string().optional().nullable(),
  coverImage: optionalImageUrl,
  ogImage: optionalImageUrl,
  featuredOrder: z
    .number()
    .int()
    .min(1)
    .max(3)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  authorName: z.string().trim().max(160).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
});

export const createBlogPostSchema = blogPostBaseSchema.superRefine((data, ctx) => {
  const html = data.contentHtml ?? "";
  const paragraphs = data.content ?? [];
  if (isHtmlEmpty(html) && paragraphs.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Le contenu est requis.",
      path: ["contentHtml"],
    });
  }
  if (data.status === "scheduled" && !data.scheduledAt) {
    ctx.addIssue({
      code: "custom",
      message: "Date de publication planifiée requise.",
      path: ["scheduledAt"],
    });
  }
});

export const updateBlogPostSchema = blogPostBaseSchema.partial();

/** Sauvegarde automatique — validation assouplie */
export const autosaveBlogPostSchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().max(300).optional(),
    excerpt: z.string().trim().max(500).optional(),
    category: z.string().trim().max(100).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    readTime: z.string().trim().max(20).optional(),
    content: z.array(z.string()).optional(),
    contentHtml: z.string().optional().nullable(),
    metaTitle: z.string().trim().max(300).optional().nullable(),
    metaDescription: z.string().trim().max(500).optional().nullable(),
    status: z.enum(BLOG_POST_STATUSES).optional(),
    scheduledAt: z.string().optional().nullable(),
    coverImage: optionalImageUrl,
    ogImage: optionalImageUrl,
    featuredOrder: z.number().int().min(1).max(3).optional().nullable(),
    authorName: z.string().trim().max(160).optional().nullable(),
    tags: z.array(z.string().trim().max(50)).max(30).optional(),
  })
  .partial();

export type BlogPostListFilters = {
  status?: BlogPostStatus;
  q?: string;
  trash?: boolean;
  tag?: string;
};

function normalizeContent(input: {
  content?: string[];
  contentHtml?: string | null;
}): { content: string[]; contentHtml: string | null; readTime?: string } {
  const html = input.contentHtml?.trim() || null;
  if (html && !isHtmlEmpty(html)) {
    return {
      content: htmlToParagraphs(html),
      contentHtml: html,
      readTime: estimateReadTime(html),
    };
  }
  const paragraphs = input.content ?? [];
  return { content: paragraphs, contentHtml: null, readTime: undefined };
}

function resolvePublishState(
  status: BlogPostStatus,
  scheduledAt: string | null | undefined,
  existingPublishedAt: string | null,
): {
  status: BlogPostStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
} {
  const now = Date.now();

  if (status === "scheduled" && scheduledAt) {
    const scheduledMs = new Date(scheduledAt).getTime();
    if (scheduledMs <= now) {
      return {
        status: "published",
        publishedAt: existingPublishedAt ? new Date(existingPublishedAt) : new Date(),
        scheduledAt: null,
      };
    }
    return {
      status: "scheduled",
      publishedAt: null,
      scheduledAt: new Date(scheduledAt),
    };
  }

  if (status === "published") {
    return {
      status: "published",
      publishedAt: existingPublishedAt ? new Date(existingPublishedAt) : new Date(),
      scheduledAt: null,
    };
  }

  return { status: "draft", publishedAt: null, scheduledAt: null };
}

export async function publishDueScheduledPosts(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const count = await withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE blog_posts
       SET status = 'published',
           published_at = COALESCE(published_at, NOW()),
           scheduled_at = NULL,
           updated_at = NOW()
       WHERE status = 'scheduled'
         AND scheduled_at IS NOT NULL
         AND scheduled_at <= NOW()
         AND deleted_at IS NULL`,
    );
    return rowCount ?? 0;
  });

  if (count > 0) {
    revalidateBlogPaths();
  }

  return count;
}

export async function listPublishedBlogPosts(): Promise<BlogPostRecord[]> {
  if (!isDatabaseConfigured()) return [];

  await publishDueScheduledPosts();

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `SELECT * FROM blog_posts
       WHERE status = 'published'
         AND deleted_at IS NULL
       ORDER BY featured_order ASC NULLS LAST, date DESC, created_at DESC`,
    );
    return rows.map(mapRow);
  });
}

export async function listBlogPosts(filters?: BlogPostListFilters): Promise<BlogPostRecord[]> {
  await publishDueScheduledPosts();

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.trash) {
      conditions.push("deleted_at IS NOT NULL");
    } else {
      conditions.push("deleted_at IS NULL");
    }

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }

    if (filters?.q?.trim()) {
      params.push(`%${filters.q.trim()}%`);
      conditions.push(
        `(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR slug ILIKE $${params.length}
          OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE $${params.length}))`,
      );
    }

    if (filters?.tag?.trim()) {
      params.push(filters.tag.trim().toLowerCase());
      conditions.push(`$${params.length} = ANY(tags)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy = filters?.trash
      ? "ORDER BY deleted_at DESC"
      : "ORDER BY updated_at DESC";

    const { rows } = await query<BlogPostRow>(
      `SELECT * FROM blog_posts ${where} ${orderBy}`,
      params,
    );
    return rows.map(mapRow);
  });
}

export async function getBlogPostById(
  id: string,
  options?: { trash?: boolean },
): Promise<BlogPostRecord | null> {
  await publishDueScheduledPosts();
  return withDb(async (query) => {
    const trashFilter = options?.trash
      ? "AND deleted_at IS NOT NULL"
      : "AND deleted_at IS NULL";
    const { rows } = await query<BlogPostRow>(
      `SELECT * FROM blog_posts WHERE id = $1 ${trashFilter} LIMIT 1`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostRecord | null> {
  await publishDueScheduledPosts();
  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `SELECT * FROM blog_posts WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
      [slug],
    );
    const row = rows[0];
    if (!row) return null;
    if (row.status !== "published") return null;
    return mapRow(row);
  });
}

export async function getBlogPostByPreviewToken(
  slug: string,
  token: string,
): Promise<BlogPostRecord | null> {
  if (!token.trim()) return null;

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `SELECT * FROM blog_posts
       WHERE slug = $1
         AND preview_token = $2
         AND deleted_at IS NULL
       LIMIT 1`,
      [slug, token.trim()],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

async function ensurePreviewTokenForPost(id: string): Promise<string> {
  return withDb(async (query) => {
    const { rows } = await query<{ preview_token: string | null }>(
      `SELECT preview_token FROM blog_posts WHERE id = $1 LIMIT 1`,
      [id],
    );
    const existing = rows[0]?.preview_token;
    if (existing) return existing;

    const token = createPreviewToken();
    await query(
      `UPDATE blog_posts SET preview_token = $2, updated_at = NOW() WHERE id = $1`,
      [id, token],
    );
    return token;
  });
}

async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  return withDb(async (query) => {
    const params: unknown[] = [slug];
    let sql = `SELECT 1 FROM blog_posts WHERE slug = $1`;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $2`;
    }
    sql += " LIMIT 1";
    const { rows } = await query<{ "?column?": number }>(sql, params);
    return rows.length > 0;
  });
}

async function assertFeaturedOrderAvailable(
  order: number | null,
  excludeId?: string,
): Promise<void> {
  if (order === null) return;

  await withDb(async (query) => {
    const params: unknown[] = [order];
    let sql = `SELECT id FROM blog_posts
      WHERE featured_order = $1
        AND deleted_at IS NULL`;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id != $2`;
    }
    sql += " LIMIT 1";
    const { rows } = await query<{ id: string }>(sql, params);
    if (rows.length > 0) {
      throw new Error(`La position « à la une » ${order} est déjà occupée.`);
    }
  });
}

export async function createBlogPost(
  input: z.infer<typeof createBlogPostSchema>,
): Promise<BlogPostRecord> {
  const slug = input.slug?.trim() || slugifyBlogTitle(input.title);
  if (!slug) {
    throw new Error("Impossible de générer un slug à partir du titre.");
  }

  if (await isSlugTaken(slug)) {
    throw new Error("Ce slug est déjà utilisé.");
  }

  const normalized = normalizeContent(input);
  const publish = resolvePublishState(
    input.status ?? "draft",
    input.scheduledAt,
    null,
  );
  const readTime = input.readTime?.trim() || normalized.readTime || "5 min";
  const tags = normalizeBlogTags(input.tags);
  const previewToken = createPreviewToken();
  const featuredOrder = input.featuredOrder ?? null;

  if (featuredOrder !== null) {
    await assertFeaturedOrderAvailable(featuredOrder);
  }

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `INSERT INTO blog_posts (
        slug, title, excerpt, category, date, read_time, content, content_html,
        meta_title, meta_description, status, cover_image, og_image, featured_order,
        author_name, published_at, scheduled_at, tags, preview_token
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        slug,
        input.title,
        input.excerpt,
        input.category,
        input.date,
        readTime,
        serializeContentJson(normalized.content),
        normalized.contentHtml,
        input.metaTitle ?? null,
        input.metaDescription ?? null,
        publish.status,
        input.coverImage ?? null,
        input.ogImage ?? null,
        featuredOrder,
        input.authorName ?? null,
        publish.publishedAt,
        publish.scheduledAt,
        tags,
        previewToken,
      ],
    );
    return mapRow(rows[0]!);
  });
}

export async function updateBlogPost(
  id: string,
  input: z.infer<typeof updateBlogPostSchema>,
  options?: { skipRevision?: boolean; author?: { name?: string | null; email?: string | null } },
): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  if (!options?.skipRevision) {
    const { saveBlogRevision } = await import("@/lib/blog-revisions");
    await saveBlogRevision(existing, options?.author);
  }

  const nextSlug = input.slug?.trim() ?? existing.slug;
  if (nextSlug !== existing.slug && (await isSlugTaken(nextSlug, id))) {
    throw new Error("Ce slug est déjà utilisé.");
  }

  if (nextSlug !== existing.slug) {
    const { recordBlogSlugChange } = await import("@/lib/blog-slug-redirects");
    await recordBlogSlugChange(id, existing.slug, nextSlug);
  }

  const normalized = normalizeContent({
    content: input.content ?? existing.content,
    contentHtml: input.contentHtml !== undefined ? input.contentHtml : existing.contentHtml,
  });

  const nextStatus = input.status ?? existing.status;
  const nextScheduledAt =
    input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt;

  const publish = resolvePublishState(nextStatus, nextScheduledAt, existing.publishedAt);
  const readTime =
    input.readTime?.trim() ||
    normalized.readTime ||
    existing.readTime;
  const tags =
    input.tags !== undefined ? normalizeBlogTags(input.tags) : existing.tags;
  const nextFeaturedOrder =
    input.featuredOrder !== undefined ? input.featuredOrder : existing.featuredOrder;

  if (nextFeaturedOrder !== existing.featuredOrder) {
    await assertFeaturedOrderAvailable(nextFeaturedOrder, id);
  }

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `UPDATE blog_posts SET
        slug = $2,
        title = $3,
        excerpt = $4,
        category = $5,
        date = $6,
        read_time = $7,
        content = $8,
        content_html = $9,
        meta_title = $10,
        meta_description = $11,
        status = $12,
        cover_image = $13,
        og_image = $14,
        featured_order = $15,
        author_name = $16,
        published_at = $17,
        scheduled_at = $18,
        tags = $19,
        preview_token = COALESCE(preview_token, $20),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        nextSlug,
        input.title ?? existing.title,
        input.excerpt ?? existing.excerpt,
        input.category ?? existing.category,
        input.date ?? existing.date,
        readTime,
        serializeContentJson(normalized.content),
        normalized.contentHtml,
        input.metaTitle !== undefined ? input.metaTitle : existing.metaTitle,
        input.metaDescription !== undefined ? input.metaDescription : existing.metaDescription,
        publish.status,
        input.coverImage !== undefined ? input.coverImage : existing.coverImage,
        input.ogImage !== undefined ? input.ogImage : existing.ogImage,
        nextFeaturedOrder,
        input.authorName !== undefined ? input.authorName : existing.authorName,
        publish.publishedAt,
        publish.scheduledAt,
        tags,
        createPreviewToken(),
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function autosaveBlogPost(
  id: string,
  input: z.infer<typeof autosaveBlogPostSchema>,
): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  const merged = {
    title: input.title ?? existing.title,
    excerpt: input.excerpt ?? existing.excerpt,
    category: input.category ?? existing.category,
    date: input.date ?? existing.date,
    contentHtml: input.contentHtml !== undefined ? input.contentHtml : existing.contentHtml,
    content: input.content ?? existing.content,
    metaTitle: input.metaTitle !== undefined ? input.metaTitle : existing.metaTitle,
    metaDescription:
      input.metaDescription !== undefined ? input.metaDescription : existing.metaDescription,
    coverImage: input.coverImage !== undefined ? input.coverImage : existing.coverImage,
    ogImage: input.ogImage !== undefined ? input.ogImage : existing.ogImage,
    featuredOrder:
      input.featuredOrder !== undefined ? input.featuredOrder : existing.featuredOrder,
    authorName: input.authorName !== undefined ? input.authorName : existing.authorName,
    tags: input.tags !== undefined ? input.tags : existing.tags,
    readTime: input.readTime ?? existing.readTime,
    slug: input.slug ?? existing.slug,
    status: input.status ?? existing.status,
    scheduledAt: input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt,
  };

  if (merged.slug !== existing.slug && (await isSlugTaken(merged.slug, id))) {
    merged.slug = existing.slug;
  }

  const normalized = normalizeContent({
    content: merged.content,
    contentHtml: merged.contentHtml,
  });

  const publish = resolvePublishState(
    merged.status,
    merged.scheduledAt,
    existing.publishedAt,
  );

  const readTime =
    merged.readTime?.trim() || normalized.readTime || existing.readTime;
  const tags = normalizeBlogTags(merged.tags);

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `UPDATE blog_posts SET
        slug = $2,
        title = $3,
        excerpt = $4,
        category = $5,
        date = $6,
        read_time = $7,
        content = $8,
        content_html = $9,
        meta_title = $10,
        meta_description = $11,
        status = $12,
        cover_image = $13,
        og_image = $14,
        author_name = $15,
        published_at = $16,
        scheduled_at = $17,
        tags = $18,
        preview_token = COALESCE(preview_token, $19),
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *`,
      [
        id,
        merged.slug,
        merged.title,
        merged.excerpt || existing.excerpt,
        merged.category,
        merged.date,
        readTime,
        serializeContentJson(normalized.content),
        normalized.contentHtml,
        merged.metaTitle,
        merged.metaDescription,
        publish.status,
        merged.coverImage,
        merged.ogImage,
        merged.authorName,
        publish.publishedAt,
        publish.scheduledAt,
        tags,
        createPreviewToken(),
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function getOrCreatePreviewToken(id: string): Promise<string | null> {
  const post = await getBlogPostById(id);
  if (!post) return null;
  if (post.previewToken) return post.previewToken;
  return ensurePreviewTokenForPost(id);
}

export async function duplicateBlogPost(id: string): Promise<BlogPostRecord> {
  const source = await getBlogPostById(id);
  if (!source) {
    throw new Error("Article introuvable.");
  }

  const baseSlug = `${source.slug}-copie`;
  let slug = baseSlug;
  let suffix = 2;
  while (await isSlugTaken(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return createBlogPost({
    slug,
    title: `${source.title} (copie)`,
    excerpt: source.excerpt,
    category: source.category,
    date: new Date().toISOString().slice(0, 10),
    readTime: source.readTime,
    content: source.content,
    contentHtml: source.contentHtml,
    metaTitle: source.metaTitle,
    metaDescription: source.metaDescription,
    status: "draft",
    coverImage: source.coverImage,
    ogImage: source.ogImage,
    authorName: source.authorName,
    tags: source.tags,
  });
}

export async function trashBlogPost(id: string): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `UPDATE blog_posts
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function restoreBlogPost(id: string): Promise<BlogPostRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<BlogPostRow>(
      `UPDATE blog_posts
       SET deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING *`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

export async function purgeBlogPost(id: string): Promise<BlogPostRecord | null> {
  const existing = await getBlogPostById(id, { trash: true });
  if (!existing) return null;

  await withDb(async (query) => {
    await query(`DELETE FROM blog_posts WHERE id = $1 AND deleted_at IS NOT NULL`, [id]);
  });

  return existing;
}

export async function bulkBlogPostAction(
  ids: string[],
  action: "trash" | "restore" | "purge",
): Promise<{ affected: number }> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return { affected: 0 };

  return withDb(async (query) => {
    if (action === "trash") {
      const { rowCount } = await query(
        `UPDATE blog_posts
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [uniqueIds],
      );
      return { affected: rowCount ?? 0 };
    }

    if (action === "restore") {
      const { rowCount } = await query(
        `UPDATE blog_posts
         SET deleted_at = NULL, updated_at = NOW()
         WHERE id = ANY($1::uuid[]) AND deleted_at IS NOT NULL`,
        [uniqueIds],
      );
      return { affected: rowCount ?? 0 };
    }

    const { rowCount } = await query(
      `DELETE FROM blog_posts
       WHERE id = ANY($1::uuid[]) AND deleted_at IS NOT NULL`,
      [uniqueIds],
    );
    return { affected: rowCount ?? 0 };
  });
}

/** @deprecated Use trashBlogPost — kept as alias for compatibility */
export async function deleteBlogPost(id: string): Promise<BlogPostRecord | null> {
  return trashBlogPost(id);
}

export async function countTrashedBlogPosts(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  return withDb(async (query) => {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM blog_posts WHERE deleted_at IS NOT NULL`,
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function importStaticBlogPosts(): Promise<{ imported: number; skipped: number }> {
  const { blogPosts } = await import("@/content/blog");
  const { paragraphsToHtml } = await import("@/lib/blog-content");

  let imported = 0;
  let skipped = 0;

  for (const post of blogPosts) {
    if (await isSlugTaken(post.slug)) {
      skipped += 1;
      continue;
    }

    const contentHtml = post.contentHtml ?? paragraphsToHtml(post.content);

    await createBlogPost({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      date: post.date,
      readTime: post.readTime,
      contentHtml,
      metaTitle: post.metaTitle ?? null,
      metaDescription: post.metaDescription ?? post.excerpt,
      status: "published",
      coverImage: post.coverImage ?? null,
      ogImage: null,
    });
    imported += 1;
  }

  return { imported, skipped };
}

export function isBlogCategory(value: string): boolean {
  return (BLOG_CATEGORIES as readonly string[]).includes(value);
}

export async function validateBlogCategoryName(name: string): Promise<boolean> {
  const { isBlogCategoryName } = await import("@/lib/blog-categories");
  return isBlogCategoryName(name);
}
