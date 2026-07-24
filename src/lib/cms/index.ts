import { blogPosts, getBlogPost as getStaticBlogPost } from "@/content/blog";
import {
  getBlogPostBySlug,
  getBlogPostByPreviewToken,
  listPublishedBlogPosts,
  toPublicBlogPost,
} from "@/lib/blog-posts";
import { allowLocaleStaticSeed } from "@/lib/cms-locale";
import { isDatabaseConfigured } from "@/lib/db";
import {
  realisations,
  getRealisation as getStaticRealisation,
} from "@/content/realisations";
import type { BlogPost } from "@/content/blog";
import type { Realisation } from "@/content/realisations";
import {
  fetchBlogPostFromSanity,
  fetchBlogPostsFromSanity,
  fetchRealisationFromSanity,
  fetchRealisationsFromSanity,
  isSanityConfigured,
} from "@/lib/cms/sanity";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

export async function getBlogPosts(): Promise<BlogPost[]> {
  if (isDatabaseConfigured()) {
    try {
      const records = await listPublishedBlogPosts();
      if (records.length > 0) {
        return records.map(toPublicBlogPost);
      }
    } catch (error) {
      console.error("[CMS] Database blog fallback:", error);
    }
  }

  if (isSanityConfigured()) {
    try {
      const posts = await fetchBlogPostsFromSanity();
      if (posts.length > 0) return posts;
    } catch (error) {
      console.error("[CMS] Sanity blog fallback:", error);
    }
  }
  return allowStaticContentFallback() ? blogPosts : [];
}

export async function getBlogPost(
  slug: string,
  options?: { previewToken?: string },
): Promise<BlogPost | undefined> {
  if (isDatabaseConfigured()) {
    try {
      if (options?.previewToken) {
        const preview = await getBlogPostByPreviewToken(slug, options.previewToken);
        if (preview) return toPublicBlogPost(preview);
      }

      const record = await getBlogPostBySlug(slug);
      if (record) {
        return toPublicBlogPost(record);
      }
    } catch (error) {
      console.error("[CMS] Database blog post fallback:", error);
    }
  }

  if (isSanityConfigured()) {
    try {
      const post = await fetchBlogPostFromSanity(slug);
      if (post) return post;
    } catch (error) {
      console.error("[CMS] Sanity blog post fallback:", error);
    }
  }
  return allowStaticContentFallback() ? getStaticBlogPost(slug) : undefined;
}

export async function getRealisations(locale = "fr"): Promise<Realisation[]> {
  if (isDatabaseConfigured()) {
    try {
      const { listPublicRealisations, toRealisation } = await import("@/lib/public-realisations");
      const records = await listPublicRealisations({ locale, visibleOnly: true });
      if (records.length > 0) return records.map(toRealisation);
    } catch (error) {
      console.error("[CMS] Database realisations fallback:", error);
    }
  }

  // Sanity / seed = contenu FR uniquement — jamais servi sur locale=en.
  if (locale === "en") return [];

  if (isSanityConfigured()) {
    try {
      const items = await fetchRealisationsFromSanity();
      if (items.length > 0) return items;
    } catch (error) {
      console.error("[CMS] Sanity projects fallback:", error);
    }
  }
  return allowLocaleStaticSeed(locale) ? realisations : [];
}

export async function getRealisation(
  id: string,
  locale = "fr",
): Promise<Realisation | undefined> {
  if (isDatabaseConfigured()) {
    try {
      const { getPublicRealisationBySlug, toRealisation } = await import(
        "@/lib/public-realisations"
      );
      const record = await getPublicRealisationBySlug(id, locale);
      if (record) return toRealisation(record);
    } catch (error) {
      console.error("[CMS] Database realisation fallback:", error);
    }
  }

  if (locale === "en") return undefined;

  if (isSanityConfigured()) {
    try {
      const item = await fetchRealisationFromSanity(id);
      if (item) return item;
    } catch (error) {
      console.error("[CMS] Sanity project fallback:", error);
    }
  }
  return allowLocaleStaticSeed(locale) ? getStaticRealisation(id) : undefined;
}

export async function getRelatedRealisations(
  currentId: string,
  category: string,
  limit = 3,
  locale = "fr",
): Promise<Realisation[]> {
  const all = await getRealisations(locale);
  return all
    .filter((r) => r.id !== currentId && r.category === category)
    .slice(0, limit);
}

export { isSanityConfigured };
