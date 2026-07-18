import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteAuditSettings,
  type SiteAuditSettings,
} from "@/lib/site-audit-types";

type Row = { site_audit: Partial<SiteAuditSettings> | null };

export const updateSiteAuditSchema = z.object({
  points: z
    .array(
      z.object({
        icon: z.enum(LUCIDE_ICON_NAME_ENUM),
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().min(5).max(300),
      }),
    )
    .min(1)
    .max(8),
  checklist: z.array(z.string().trim().min(1).max(200)).min(1).max(12),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(10).max(2000),
      }),
    )
    .min(1)
    .max(12),
  formTitle: z.string().trim().min(1).max(200),
  ctaPrimaryLabel: z.string().trim().min(1).max(80),
  ctaSecondaryLabel: z.string().trim().min(1).max(80),
  ctaSecondaryHref: z.string().trim().min(1).max(200),
  formFooter: z.string().trim().min(1).max(200),
});

function merge(raw: Partial<SiteAuditSettings> | null): SiteAuditSettings {
  if (!raw) return defaultSiteAuditSettings;
  return {
    ...defaultSiteAuditSettings,
    ...raw,
    points: raw.points?.length ? raw.points : defaultSiteAuditSettings.points,
    checklist: raw.checklist?.length ? raw.checklist : defaultSiteAuditSettings.checklist,
    faq: raw.faq?.length ? raw.faq : defaultSiteAuditSettings.faq,
  };
}

export const getSiteAuditSettings = cache(async (): Promise<SiteAuditSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteAuditSettings;
  try {
    return await withDb(async (query) => {
      const { rows } = await query<Row>(`SELECT site_audit FROM crm_settings WHERE id = 1`);
      return merge(rows[0]?.site_audit ?? null);
    });
  } catch (error) {
    console.error("[site-audit] fallback:", error);
    return defaultSiteAuditSettings;
  }
});

export async function getSiteAuditSettingsForAdmin() {
  return getSiteAuditSettings();
}

export async function updateSiteAuditSettings(
  input: z.infer<typeof updateSiteAuditSchema>,
): Promise<SiteAuditSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_audit, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_audit = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return merge(input);
  });
}

export async function resetSiteAuditSettings() {
  return updateSiteAuditSettings(defaultSiteAuditSettings);
}
