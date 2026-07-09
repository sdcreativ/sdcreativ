import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  defaultSiteQuoteConfigSettings,
  type SiteQuoteConfigSettings,
} from "@/lib/site-quote-config-types";

type SiteQuoteConfigRow = {
  site_quote_config: Partial<SiteQuoteConfigSettings> | null;
};

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Identifiant : minuscules, chiffres et tirets uniquement.");

const projectTypeSchema = z.object({
  id: slugSchema,
  label: z.string().trim().min(1).max(120),
  basePrice: z.number().int().min(0),
  supportsPages: z.boolean(),
  defaultPages: z.number().int().min(0).max(999),
});

const pageTierSchema = z.object({
  id: slugSchema,
  label: z.string().trim().min(1).max(120),
  minPages: z.number().int().min(0).max(999),
  maxPages: z.number().int().min(0).max(999),
  extraPrice: z.number().int().min(0),
});

const addonSchema = z.object({
  id: slugSchema,
  label: z.string().trim().min(1).max(120),
  price: z.number().int().min(0),
  forProjects: z.array(slugSchema).optional(),
});

export const updateSiteQuoteConfigSchema = z.object({
  formTitle: z.string().trim().min(1).max(120),
  formSubtitle: z.string().trim().min(1).max(300),
  estimateNote: z.string().trim().min(1).max(500),
  projectTypes: z.array(projectTypeSchema).min(1).max(30),
  pageTiers: z.array(pageTierSchema).min(1).max(10),
  addons: z.array(addonSchema).max(30),
});

function mergeQuoteConfig(raw: Partial<SiteQuoteConfigSettings> | null): SiteQuoteConfigSettings {
  if (!raw) return defaultSiteQuoteConfigSettings;
  return {
    formTitle: raw.formTitle?.trim() || defaultSiteQuoteConfigSettings.formTitle,
    formSubtitle: raw.formSubtitle?.trim() || defaultSiteQuoteConfigSettings.formSubtitle,
    estimateNote: raw.estimateNote?.trim() || defaultSiteQuoteConfigSettings.estimateNote,
    projectTypes: raw.projectTypes?.length ? raw.projectTypes : defaultSiteQuoteConfigSettings.projectTypes,
    pageTiers: raw.pageTiers?.length ? raw.pageTiers : defaultSiteQuoteConfigSettings.pageTiers,
    addons: raw.addons?.length ? raw.addons : defaultSiteQuoteConfigSettings.addons,
  };
}

export const getSiteQuoteConfigSettings = cache(async (): Promise<SiteQuoteConfigSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteQuoteConfigSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteQuoteConfigRow>(
        `SELECT site_quote_config FROM crm_settings WHERE id = 1`,
      );
      return mergeQuoteConfig(rows[0]?.site_quote_config ?? null);
    });
  } catch (error) {
    console.error("[site-quote-config] getSiteQuoteConfigSettings fallback:", error);
    return defaultSiteQuoteConfigSettings;
  }
});

export async function getSiteQuoteConfigSettingsForAdmin(): Promise<SiteQuoteConfigSettings> {
  return getSiteQuoteConfigSettings();
}

export async function updateSiteQuoteConfigSettings(
  input: z.infer<typeof updateSiteQuoteConfigSchema>,
): Promise<SiteQuoteConfigSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_quote_config, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_quote_config = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeQuoteConfig(input);
  });
}

export async function resetSiteQuoteConfigSettings(): Promise<SiteQuoteConfigSettings> {
  return updateSiteQuoteConfigSettings(defaultSiteQuoteConfigSettings);
}
