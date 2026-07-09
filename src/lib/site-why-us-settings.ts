import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteWhyUsSettings,
  type SiteWhyUsSettings,
} from "@/lib/site-why-us-types";

type SiteWhyUsRow = {
  site_why_us: Partial<SiteWhyUsSettings> | null;
};

const whyUsItemSchema = z.object({
  icon: z.enum(LUCIDE_ICON_NAME_ENUM),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(500),
});

export const updateSiteWhyUsSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  highlight: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(10).max(800),
  items: z.array(whyUsItemSchema).min(1).max(8),
});

function mergeWhyUsSettings(raw: Partial<SiteWhyUsSettings> | null): SiteWhyUsSettings {
  if (!raw) return defaultSiteWhyUsSettings;
  return {
    ...defaultSiteWhyUsSettings,
    ...raw,
    items: raw.items?.length ? raw.items : defaultSiteWhyUsSettings.items,
  };
}

export const getSiteWhyUsSettings = cache(async (): Promise<SiteWhyUsSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteWhyUsSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteWhyUsRow>(
        `SELECT site_why_us FROM crm_settings WHERE id = 1`,
      );
      return mergeWhyUsSettings(rows[0]?.site_why_us ?? null);
    });
  } catch (error) {
    console.error("[site-why-us] fallback:", error);
    return defaultSiteWhyUsSettings;
  }
});

export async function getSiteWhyUsSettingsForAdmin(): Promise<SiteWhyUsSettings> {
  return getSiteWhyUsSettings();
}

export async function updateSiteWhyUsSettings(
  input: z.infer<typeof updateSiteWhyUsSchema>,
): Promise<SiteWhyUsSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_why_us, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_why_us = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeWhyUsSettings(input);
  });
}

export async function resetSiteWhyUsSettings(): Promise<SiteWhyUsSettings> {
  return updateSiteWhyUsSettings(defaultSiteWhyUsSettings);
}
