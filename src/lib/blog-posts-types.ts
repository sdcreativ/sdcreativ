import type { BlogPostStatus } from "@/content/blog-labels";

export type BlogPostRecord = {
  id: string;
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
  featuredOrder: number | null;
  authorName: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  deletedAt: string | null;
  tags: string[];
  previewToken: string | null;
  viewCount: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
};

export function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function parseContentParagraphs(raw: string): string[] {
  return raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatContentParagraphs(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function normalizeBlogTags(input: string[] | string | undefined | null): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  const normalized = raw
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.slice(0, 50));
  return [...new Set(normalized)].slice(0, 30);
}
