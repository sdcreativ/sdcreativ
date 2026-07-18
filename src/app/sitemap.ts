import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { localSeoPages } from "@/content/local-seo";
import { getServiceDetailSlugs } from "@/lib/public-services-resolver";
import { getBlogPosts, getRealisations } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogPosts, realisations] = await Promise.all([
    getBlogPosts(),
    getRealisations(),
  ]);

  const staticPages = [
    "",
    "/services",
    "/realisations",
    "/a-propos",
    "/tarifs",
    "/devis",
    "/audit-gratuit",
    "/solutions-ia",
    "/formations",
    "/maintenance",
    "/faq",
    "/blog",
    "/contact",
    "/carrieres",
    "/en",
    "/en/services",
    "/en/training",
    "/en/pricing",
    "/en/about",
    "/en/contact",
    "/mentions-legales",
    "/politique-confidentialite",
  ];

  const blogEntries = blogPosts.map((post) => ({
    url: `${SITE.url}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const realisationEntries = realisations.map((r) => ({
    url: `${SITE.url}/realisations/${r.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const serviceDetailEntries = (await getServiceDetailSlugs()).map((slug) => ({
    url: `${SITE.url}/services/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const localSeoEntries = localSeoPages.map((page) => ({
    url: `${SITE.url}${page.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.85,
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
    ...localSeoEntries,
    ...blogEntries,
  ];
}
