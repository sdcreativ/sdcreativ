import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteMethodSettings,
  type SiteMethodSettings,
} from "@/lib/site-method-types";

type SiteMethodRow = {
  site_method: Partial<SiteMethodSettings> | null;
};

const methodStepSchema = z.object({
  number: z.string().trim().min(1).max(4),
  icon: z.enum(LUCIDE_ICON_NAME_ENUM),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(5).max(400),
});

export const updateSiteMethodSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  highlight: z.string().trim().min(1).max(120),
  steps: z.array(methodStepSchema).min(1).max(12),
});

function mergeMethodSettings(raw: Partial<SiteMethodSettings> | null): SiteMethodSettings {
  if (!raw) return defaultSiteMethodSettings;
  return {
    ...defaultSiteMethodSettings,
    ...raw,
    steps: raw.steps?.length ? raw.steps : defaultSiteMethodSettings.steps,
  };
}

export const getSiteMethodSettings = cache(async (): Promise<SiteMethodSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteMethodSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteMethodRow>(
        `SELECT site_method FROM crm_settings WHERE id = 1`,
      );
      return mergeMethodSettings(rows[0]?.site_method ?? null);
    });
  } catch (error) {
    console.error("[site-method] fallback:", error);
    return defaultSiteMethodSettings;
  }
});

export async function getSiteMethodSettingsForAdmin(): Promise<SiteMethodSettings> {
  return getSiteMethodSettings();
}

export async function updateSiteMethodSettings(
  input: z.infer<typeof updateSiteMethodSchema>,
): Promise<SiteMethodSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_method, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_method = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeMethodSettings(input);
  });
}

export async function resetSiteMethodSettings(): Promise<SiteMethodSettings> {
  return updateSiteMethodSettings(defaultSiteMethodSettings);
}
