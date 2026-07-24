import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { localSeoPages, localSeoPagesEn } from "@/content/local-seo";
import { blogPostsEn } from "@/content/blog-en";
import { LOCALE_ROUTE_PAIRS } from "@/i18n/routes";
import { getFormationCategorySlugs } from "@/lib/formations-resolver";
import { getServiceDetailSlugs } from "@/lib/public-services-resolver";
import { getBlogPosts, getRealisations } from "@/lib/cms";

const EXTRA_STATIC_FR = ["/carrieres"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPosts, realisations, formationSlugs] = await Promise.all([
    getBlogPosts(),
    getRealisations(),
    getFormationCategorySlugs(),
  ]);

  const pairPaths = LOCALE_ROUTE_PAIRS.flatMap((pair) =>
    pair.fr === "/" ? ["", pair.en] : [pair.fr, pair.en],
  );

  const staticPages = Array.from(new Set([...pairPaths, ...EXTRA_STATIC_FR]));

  const blogEntries = blogPosts.map((post) => ({
    url: `${SITE.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const realisationEntries = realisations.flatMap((r) => [
    {
      url: `${SITE.url}/realisations/${r.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE.url}/en/portfolio/${r.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  const serviceDetailEntries = (await getServiceDetailSlugs()).flatMap((slug) => [
    {
      url: `${SITE.url}/services/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    },
    {
      url: `${SITE.url}/en/services/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    },
  ]);

  const formationDetailEntries = formationSlugs.flatMap((slug) => [
    {
      url: `${SITE.url}/formations/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE.url}/en/training/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ]);

  const localSeoEntries = [
    ...localSeoPages.map((page) => ({
      url: `${SITE.url}${page.path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...localSeoPagesEn.map((page) => ({
      url: `${SITE.url}${page.path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ];

  const blogEnEntries = blogPostsEn.map((post) => ({
    url: `${SITE.url}/en/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages.map((path) => ({
      url: `${SITE.url}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" || path === "/en" ? 1 : 0.8,
    })),
    ...realisationEntries,
    ...serviceDetailEntries,
    ...formationDetailEntries,
    ...localSeoEntries,
    ...blogEntries,
    ...blogEnEntries,
  ];
}
