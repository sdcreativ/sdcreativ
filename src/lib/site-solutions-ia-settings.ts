import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteSolutionsIaSettings,
  type SiteSolutionsIaSettings,
} from "@/lib/site-solutions-ia-types";

type SiteSolutionsIaRow = {
  site_solutions_ia: Partial<SiteSolutionsIaSettings> | null;
};

const headingSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  highlight: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
});

export const updateSiteSolutionsIaSchema = z.object({
  demoSection: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(10).max(600),
    hint: z.string().trim().min(1).max(200),
  }),
  headings: z.object({
    useCases: headingSchema,
    stack: headingSchema,
    process: headingSchema,
    packs: headingSchema,
  }),
  ctaSection: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(10).max(400),
  }),
  useCases: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        icon: z.enum(LUCIDE_ICON_NAME_ENUM),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(10).max(600),
        benefits: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
      }),
    )
    .min(1)
    .max(12),
  stack: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        category: z.string().trim().min(1).max(80),
        description: z.string().trim().min(5).max(300),
      }),
    )
    .min(1)
    .max(20),
  process: z
    .array(
      z.object({
        step: z.number().int().min(1).max(20),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(5).max(500),
      }),
    )
    .min(1)
    .max(12),
  packs: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(80),
        tagline: z.string().trim().min(1).max(200),
        priceFrom: z.number().int().min(0),
        features: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
        highlighted: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(8),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(10).max(2000),
      }),
    )
    .min(1)
    .max(20),
  demoHighlights: z
    .array(
      z.object({
        icon: z.enum(LUCIDE_ICON_NAME_ENUM),
        label: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(10),
});

function mergeSolutionsIaSettings(
  raw: Partial<SiteSolutionsIaSettings> | null,
): SiteSolutionsIaSettings {
  if (!raw) return defaultSiteSolutionsIaSettings;
  return {
    ...defaultSiteSolutionsIaSettings,
    ...raw,
    demoSection: { ...defaultSiteSolutionsIaSettings.demoSection, ...raw.demoSection },
    headings: {
      useCases: { ...defaultSiteSolutionsIaSettings.headings.useCases, ...raw.headings?.useCases },
      stack: { ...defaultSiteSolutionsIaSettings.headings.stack, ...raw.headings?.stack },
      process: { ...defaultSiteSolutionsIaSettings.headings.process, ...raw.headings?.process },
      packs: { ...defaultSiteSolutionsIaSettings.headings.packs, ...raw.headings?.packs },
    },
    ctaSection: { ...defaultSiteSolutionsIaSettings.ctaSection, ...raw.ctaSection },
    useCases: raw.useCases?.length ? raw.useCases : defaultSiteSolutionsIaSettings.useCases,
    stack: raw.stack?.length ? raw.stack : defaultSiteSolutionsIaSettings.stack,
    process: raw.process?.length ? raw.process : defaultSiteSolutionsIaSettings.process,
    packs: raw.packs?.length ? raw.packs : defaultSiteSolutionsIaSettings.packs,
    faq: raw.faq?.length ? raw.faq : defaultSiteSolutionsIaSettings.faq,
    demoHighlights: raw.demoHighlights?.length
      ? raw.demoHighlights
      : defaultSiteSolutionsIaSettings.demoHighlights,
  };
}

export const getSiteSolutionsIaSettings = cache(async (): Promise<SiteSolutionsIaSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteSolutionsIaSettings;

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SiteSolutionsIaRow>(
        `SELECT site_solutions_ia FROM crm_settings WHERE id = 1`,
      );
      return mergeSolutionsIaSettings(rows[0]?.site_solutions_ia ?? null);
    });
  } catch (error) {
    console.error("[site-solutions-ia] fallback:", error);
    return defaultSiteSolutionsIaSettings;
  }
});

export async function getSiteSolutionsIaSettingsForAdmin(): Promise<SiteSolutionsIaSettings> {
  return getSiteSolutionsIaSettings();
}

export async function updateSiteSolutionsIaSettings(
  input: z.infer<typeof updateSiteSolutionsIaSchema>,
): Promise<SiteSolutionsIaSettings> {
  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_solutions_ia, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_solutions_ia = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(input)],
    );
    return mergeSolutionsIaSettings(input);
  });
}

export async function resetSiteSolutionsIaSettings(): Promise<SiteSolutionsIaSettings> {
  return updateSiteSolutionsIaSettings(defaultSiteSolutionsIaSettings);
}
