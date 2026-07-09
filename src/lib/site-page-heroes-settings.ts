import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  defaultSitePageHeroesSettings,
  PAGE_HERO_KEYS,
  type PageHeroConfig,
  type PageHeroKey,
  type SitePageHeroesSettings,
} from "@/lib/site-page-heroes-types";

type SitePageHeroesRow = {
  site_page_heroes: Partial<SitePageHeroesSettings> | null;
};

const breadcrumbSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().max(200).optional(),
});

const pageHeroSchema = z.object({
  eyebrow: z.string().trim().max(120).optional(),
  title: z.string().trim().min(1).max(160),
  highlight: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional(),
  backgroundImage: z.string().trim().max(512).optional(),
  backgroundAlt: z.string().trim().max(300).optional(),
  breadcrumb: z.array(breadcrumbSchema).max(6).optional(),
});

const pageHeroesShape = Object.fromEntries(
  PAGE_HERO_KEYS.map((key) => [key, pageHeroSchema]),
) as Record<PageHeroKey, typeof pageHeroSchema>;

export const updateSitePageHeroesSchema = z.object(pageHeroesShape);

function mergePageHeroesSettings(
  raw: Partial<SitePageHeroesSettings> | null,
): SitePageHeroesSettings {
  const merged = { ...defaultSitePageHeroesSettings };
  if (!raw) return merged;

  for (const key of PAGE_HERO_KEYS) {
    merged[key] = { ...defaultSitePageHeroesSettings[key], ...raw[key] };
  }
  return merged;
}

export const getSitePageHeroesSettings = cache(async (): Promise<SitePageHeroesSettings> => {
  if (!isDatabaseConfigured()) return defaultSitePageHeroesSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SitePageHeroesRow>(
        `SELECT site_page_heroes FROM crm_settings WHERE id = 1`,
      );
      return mergePageHeroesSettings(rows[0]?.site_page_heroes ?? null);
    });
  } catch (error) {
    console.error("[site-page-heroes] fallback:", error);
    return defaultSitePageHeroesSettings;
  }
});

export async function getSitePageHeroesSettingsForAdmin(): Promise<SitePageHeroesSettings> {
  return getSitePageHeroesSettings();
}

export async function getPageHeroConfig(pageKey: PageHeroKey): Promise<PageHeroConfig> {
  const settings = await getSitePageHeroesSettings();
  return settings[pageKey];
}

export async function updateSitePageHeroesSettings(
  input: z.infer<typeof updateSitePageHeroesSchema>,
): Promise<SitePageHeroesSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_page_heroes, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_page_heroes = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergePageHeroesSettings(input);
  });
}

export async function resetSitePageHeroesSettings(): Promise<SitePageHeroesSettings> {
  return updateSitePageHeroesSettings(defaultSitePageHeroesSettings);
}
