import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { localSeoPages, localSeoPagesEn } from "@/content/local-seo";
import { blogPostsEn } from "@/content/blog-en";
import { isEnglishLocaleEnabled } from "@/i18n/config";
import { LOCALE_ROUTE_PAIRS } from "@/i18n/routes";
import { getBlogPosts } from "@/lib/cms";
import {
  getFormationSitemapDates,
  getRealisationSitemapDates,
  getServiceSitemapDates,
} from "@/lib/sitemap-content-dates";

const EXTRA_STATIC_FR = ["/carrieres"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const enEnabled = isEnglishLocaleEnabled();
  const [blogPosts, realisationDates, serviceDates, formationDates] = await Promise.all([
    getBlogPosts(),
    getRealisationSitemapDates(),
    getServiceSitemapDates(),
    getFormationSitemapDates(),
  ]);

  const pairPaths = LOCALE_ROUTE_PAIRS.flatMap((pair) => {
    if (pair.fr === "/") {
      return enEnabled ? ["", pair.en] : [""];
    }
    return enEnabled ? [pair.fr, pair.en] : [pair.fr];
  });

  const staticPages = Array.from(new Set([...pairPaths, ...EXTRA_STATIC_FR]));

  const blogEntries = blogPosts.map((post) => ({
    url: `${SITE.url}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const realisationEntries = realisationDates.flatMap(({ slug, lastModified }) => {
    const fr = {
      url: `${SITE.url}/realisations/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
    if (!enEnabled) return [fr];
    return [
      fr,
      {
        url: `${SITE.url}/en/portfolio/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
    ];
  });

  const serviceDetailEntries = serviceDates.flatMap(({ slug, lastModified }) => {
    const fr = {
      url: `${SITE.url}/services/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    };
    if (!enEnabled) return [fr];
    return [
      fr,
      {
        url: `${SITE.url}/en/services/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.85,
      },
    ];
  });

  const formationDetailEntries = formationDates.flatMap(({ slug, lastModified }) => {
    const fr = {
      url: `${SITE.url}/formations/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
    if (!enEnabled) return [fr];
    return [
      fr,
      {
        url: `${SITE.url}/en/training/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
    ];
  });

  const localSeoEntries = [
    ...localSeoPages.map((page) => ({
      url: `${SITE.url}${page.path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...(enEnabled
      ? localSeoPagesEn.map((page) => ({
          url: `${SITE.url}${page.path}`,
          lastModified: new Date(),
          changeFrequency: "monthly" as const,
          priority: 0.85,
        }))
      : []),
  ];

  const blogEnEntries = enEnabled
    ? blogPostsEn.map((post) => ({
        url: `${SITE.url}/en/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt ?? post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }))
    : [];

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
