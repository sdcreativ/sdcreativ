import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  defaultSiteHeroSettings,
  type SiteHeroSettings,
} from "@/lib/site-hero-types";

type SiteHeroRow = {
  site_hero: Partial<SiteHeroSettings> | null;
};

const highlightSchema = z.object({
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(200),
});

export const updateSiteHeroSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  titleBefore: z.string().trim().min(1).max(120),
  titleHighlight: z.string().trim().min(1).max(80),
  titleAfter: z.string().trim().max(120),
  description: z.string().trim().min(10).max(600),
  features: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  highlights: z.array(highlightSchema).min(1).max(8),
  ctaPrimaryLabel: z.string().trim().min(1).max(80),
  ctaPrimaryHref: z.string().trim().min(1).max(200),
  ctaSecondaryLabel: z.string().trim().min(1).max(80),
  ctaSecondaryHref: z.string().trim().min(1).max(200),
  backgroundImage: z.string().trim().min(1).max(512),
});

function mergeHeroSettings(raw: Partial<SiteHeroSettings> | null): SiteHeroSettings {
  if (!raw) return defaultSiteHeroSettings;
  const backgroundImage =
    raw.backgroundImage?.trim() || defaultSiteHeroSettings.backgroundImage;
  const merged: SiteHeroSettings = {
    ...defaultSiteHeroSettings,
    ...raw,
    backgroundImage,
    features: raw.features?.length ? raw.features : defaultSiteHeroSettings.features,
    highlights: raw.highlights?.length ? raw.highlights : defaultSiteHeroSettings.highlights,
  };
  if (merged.ctaPrimaryHref === "/contact" && /devis/i.test(merged.ctaPrimaryLabel)) {
    merged.ctaPrimaryHref = "/devis";
  }
  return merged;
}

export const getSiteHeroSettings = cache(async (): Promise<SiteHeroSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteHeroSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteHeroRow>(
        `SELECT site_hero FROM crm_settings WHERE id = 1`,
      );
      return mergeHeroSettings(rows[0]?.site_hero ?? null);
    });
  } catch (error) {
    console.error("[site-hero] getSiteHeroSettings fallback:", error);
    return defaultSiteHeroSettings;
  }
});

export async function getSiteHeroSettingsForAdmin(): Promise<SiteHeroSettings> {
  return getSiteHeroSettings();
}

export async function updateSiteHeroSettings(
  input: z.infer<typeof updateSiteHeroSchema>,
): Promise<SiteHeroSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_hero, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_hero = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeHeroSettings(input);
  });
}

export async function resetSiteHeroSettings(): Promise<SiteHeroSettings> {
  return updateSiteHeroSettings(defaultSiteHeroSettings);
}
