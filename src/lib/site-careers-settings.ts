import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  defaultSiteCareersSettings,
  type SiteCareersSettings,
} from "@/lib/site-careers-types";

type SiteCareersRow = {
  site_careers: Partial<SiteCareersSettings> | null;
};

export const updateSiteCareersSchema = z.object({
  benefits: z.array(z.string().trim().min(1).max(200)).min(1).max(12),
});

function mergeCareersSettings(raw: Partial<SiteCareersSettings> | null): SiteCareersSettings {
  if (!raw) return defaultSiteCareersSettings;
  return {
    ...defaultSiteCareersSettings,
    ...raw,
    benefits: raw.benefits?.length ? raw.benefits : defaultSiteCareersSettings.benefits,
  };
}

export const getSiteCareersSettings = cache(async (): Promise<SiteCareersSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteCareersSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteCareersRow>(
        `SELECT site_careers FROM crm_settings WHERE id = 1`,
      );
      return mergeCareersSettings(rows[0]?.site_careers ?? null);
    });
  } catch (error) {
    console.error("[site-careers] fallback:", error);
    return defaultSiteCareersSettings;
  }
});

export async function getSiteCareersSettingsForAdmin(): Promise<SiteCareersSettings> {
  return getSiteCareersSettings();
}

export async function updateSiteCareersSettings(
  input: z.infer<typeof updateSiteCareersSchema>,
): Promise<SiteCareersSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_careers, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_careers = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeCareersSettings(input);
  });
}

export async function resetSiteCareersSettings(): Promise<SiteCareersSettings> {
  return updateSiteCareersSettings(defaultSiteCareersSettings);
}
