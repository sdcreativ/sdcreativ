import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  defaultSiteLegalSettings,
  type SiteLegalSettings,
} from "@/lib/site-legal-types";

type Row = { site_legal: Partial<SiteLegalSettings> | null };

const proseSectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  paragraphs: z.array(z.string().trim().min(1).max(4000)).optional(),
  bullets: z.array(z.string().trim().min(1).max(500)).optional(),
});

const privacySectionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  intro: z.string().trim().max(1000).optional(),
  bullets: z.array(z.string().trim().min(1).max(500)).optional(),
  paragraphs: z.array(z.string().trim().min(1).max(4000)).optional(),
  dataCategories: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        details: z.string().trim().min(1).max(500),
      }),
    )
    .optional(),
  subprocessors: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        role: z.string().trim().min(1).max(300),
      }),
    )
    .optional(),
  footer: z.string().trim().max(2000).optional(),
});

export const updateSiteLegalSchema = z.object({
  legalForm: z.string().trim().min(1).max(200),
  publicationDirector: z.string().trim().min(1).max(400),
  mentionsSections: z.array(proseSectionSchema).min(1).max(20),
  privacySections: z.array(privacySectionSchema).min(1).max(30),
  privacyUpdatedLabel: z.string().trim().min(1).max(80),
});

function merge(raw: Partial<SiteLegalSettings> | null): SiteLegalSettings {
  if (!raw) return defaultSiteLegalSettings;
  return {
    ...defaultSiteLegalSettings,
    ...raw,
    mentionsSections: raw.mentionsSections?.length
      ? raw.mentionsSections
      : defaultSiteLegalSettings.mentionsSections,
    privacySections: raw.privacySections?.length
      ? raw.privacySections
      : defaultSiteLegalSettings.privacySections,
  };
}

export const getSiteLegalSettings = cache(async (): Promise<SiteLegalSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteLegalSettings;
  try {
    return await withDb(async (query) => {
      const { rows } = await query<Row>(`SELECT site_legal FROM crm_settings WHERE id = 1`);
      return merge(rows[0]?.site_legal ?? null);
    });
  } catch (error) {
    console.error("[site-legal] fallback:", error);
    return defaultSiteLegalSettings;
  }
});

export async function getSiteLegalSettingsForAdmin() {
  return getSiteLegalSettings();
}

export async function updateSiteLegalSettings(
  input: z.infer<typeof updateSiteLegalSchema>,
): Promise<SiteLegalSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_legal, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_legal = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return merge(input);
  });
}

export async function resetSiteLegalSettings() {
  return updateSiteLegalSettings(defaultSiteLegalSettings);
}
