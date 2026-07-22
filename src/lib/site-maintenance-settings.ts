import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteMaintenanceSettings,
  type SiteMaintenanceSettings,
} from "@/lib/site-maintenance-types";

type Row = { site_maintenance: Partial<SiteMaintenanceSettings> | null };

const headingSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  highlight: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
});

export const updateSiteMaintenanceSchema = z.object({
  plansHeading: headingSchema,
  plans: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(80),
        tagline: z.string().trim().min(1).max(200),
        priceMonthly: z.number().int().min(0).optional().default(0),
        priceAnnual: z.number().int().min(0).optional().default(0),
        sla: z.string().trim().min(1).max(80),
        responseTime: z.string().trim().min(1).max(80),
        features: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
        highlighted: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(8),
  slaComparison: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        essentiel: z.string().trim().min(1).max(120),
        professionnel: z.string().trim().min(1).max(120),
        premium: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(20),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(10).max(2000),
      }),
    )
    .min(1)
    .max(20),
  highlights: z
    .array(
      z.object({
        icon: z.enum(LUCIDE_ICON_NAME_ENUM),
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().min(5).max(300),
      }),
    )
    .min(1)
    .max(8),
  note: z.string().trim().min(1).max(500),
  slaHeading: z.string().trim().min(1).max(120),
  faqHeading: z.string().trim().min(1).max(120),
});

function merge(raw: Partial<SiteMaintenanceSettings> | null): SiteMaintenanceSettings {
  if (!raw) return defaultSiteMaintenanceSettings;
  return {
    ...defaultSiteMaintenanceSettings,
    ...raw,
    plansHeading: { ...defaultSiteMaintenanceSettings.plansHeading, ...raw.plansHeading },
    plans: raw.plans?.length ? raw.plans : defaultSiteMaintenanceSettings.plans,
    slaComparison: raw.slaComparison?.length
      ? raw.slaComparison
      : defaultSiteMaintenanceSettings.slaComparison,
    faq: raw.faq?.length ? raw.faq : defaultSiteMaintenanceSettings.faq,
    highlights: raw.highlights?.length
      ? raw.highlights
      : defaultSiteMaintenanceSettings.highlights,
  };
}

export const getSiteMaintenanceSettings = cache(async (): Promise<SiteMaintenanceSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteMaintenanceSettings;
  try {
    return await withDb(async (query) => {
      const { rows } = await query<Row>(`SELECT site_maintenance FROM crm_settings WHERE id = 1`);
      return merge(rows[0]?.site_maintenance ?? null);
    });
  } catch (error) {
    console.error("[site-maintenance] fallback:", error);
    return defaultSiteMaintenanceSettings;
  }
});

export async function getSiteMaintenanceSettingsForAdmin() {
  return getSiteMaintenanceSettings();
}

export async function updateSiteMaintenanceSettings(
  input: z.infer<typeof updateSiteMaintenanceSchema>,
): Promise<SiteMaintenanceSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_maintenance, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_maintenance = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return merge(input);
  });
}

export async function resetSiteMaintenanceSettings() {
  return updateSiteMaintenanceSettings(defaultSiteMaintenanceSettings);
}
