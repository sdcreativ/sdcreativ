import { getRealisations } from "@/lib/cms";
import {
  getServiceDetailSlugs as getStaticServiceDetailSlugs,
  hasServiceDetail as staticHasServiceDetail,
} from "@/content/service-details";
import { isDatabaseConfigured } from "@/lib/db";
import { getFormationCategorySlugs } from "@/lib/formations-resolver";
import { listPublicRealisations } from "@/lib/public-realisations";
import { listPublicServices } from "@/lib/public-services";
import { getSiteFormationsSettingsUpdatedAt } from "@/lib/site-formations-settings";
import { allowStaticContentFallback } from "@/lib/static-content-fallback";

export type SitemapSlugDate = {
  slug: string;
  lastModified: Date;
};

function yearToDate(year: string): Date {
  return /^\d{4}$/.test(year.trim()) ? new Date(`${year.trim()}-01-01`) : new Date();
}

export async function getRealisationSitemapDates(): Promise<SitemapSlugDate[]> {
  if (isDatabaseConfigured()) {
    try {
      const records = await listPublicRealisations({ locale: "fr", visibleOnly: true });
      if (records.length > 0) {
        return records.map((record) => ({
          slug: record.slug,
          lastModified: new Date(record.updatedAt),
        }));
      }
    } catch (error) {
      console.error("[sitemap] realisations dates:", error);
    }
  }

  if (!allowStaticContentFallback()) return [];

  const items = await getRealisations("fr");
  return items.map((item) => ({
    slug: item.id,
    lastModified: yearToDate(item.year),
  }));
}

export async function getServiceSitemapDates(): Promise<SitemapSlugDate[]> {
  if (isDatabaseConfigured()) {
    try {
      const records = await listPublicServices({ visibleOnly: true });
      const dated = records
        .filter((record) => Boolean(record.detail) || staticHasServiceDetail(record.slug))
        .map((record) => ({
          slug: record.slug,
          lastModified: new Date(record.updatedAt),
        }));
      if (dated.length > 0) return dated;
    } catch (error) {
      console.error("[sitemap] services dates:", error);
    }
  }

  if (!allowStaticContentFallback()) return [];

  return getStaticServiceDetailSlugs().map((slug) => ({
    slug,
    lastModified: new Date(),
  }));
}

export async function getFormationSitemapDates(): Promise<SitemapSlugDate[]> {
  const slugs = await getFormationCategorySlugs();
  const settingsUpdatedAt = await getSiteFormationsSettingsUpdatedAt();
  const lastModified = settingsUpdatedAt ?? new Date();

  return slugs.map((slug) => ({ slug, lastModified }));
}
