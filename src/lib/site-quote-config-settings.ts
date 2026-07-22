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
  basePrice: z.number().int().min(0).optional().default(0),
  supportsPages: z.boolean(),
  defaultPages: z.number().int().min(0).max(999),
});

const pageTierSchema = z.object({
  id: slugSchema,
  label: z.string().trim().min(1).max(120),
  minPages: z.number().int().min(0).max(999),
  maxPages: z.number().int().min(0).max(999),
  extraPrice: z.number().int().min(0).optional().default(0),
});

const addonSchema = z.object({
  id: slugSchema,
  label: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).optional().default(0),
  forProjects: z.array(slugSchema).optional(),
});

export const updateSiteQuoteConfigSchema = z.object({
  formTitle: z.string().trim().min(1).max(120),
  formSubtitle: z.string().trim().min(1).max(300),
  estimateNote: z.string().trim().min(1).max(500),
  projectTypes: z.array(projectTypeSchema).min(1).max(30),
  pageTiers: z.array(pageTierSchema).min(1).max(10),
  addons: z.array(addonSchema).max(40),
});

/** Fusionne les options seed manquantes (par id) sans écraser la config CRM. */
function mergeAddonsWithDefaults(
  stored: SiteQuoteConfigSettings["addons"] | undefined,
): SiteQuoteConfigSettings["addons"] {
  const defaults = defaultSiteQuoteConfigSettings.addons;
  if (!stored?.length) return defaults;
  const byId = new Map(stored.map((a) => [a.id, a]));
  const merged = [...stored];
  for (const addon of defaults) {
    if (!byId.has(addon.id)) merged.push(addon);
  }
  return merged;
}

const LEGACY_PUBLIC_COPY = {
  formSubtitle: "Sélectionnez vos options — l'estimation se met à jour en temps réel.",
  estimateNote:
    "Estimation indicative HT. Un devis définitif vous sera transmis après étude de votre projet.",
} as const;

function mergeQuoteConfig(raw: Partial<SiteQuoteConfigSettings> | null): SiteQuoteConfigSettings {
  if (!raw) return defaultSiteQuoteConfigSettings;

  const storedSubtitle = raw.formSubtitle?.trim() ?? "";
  const storedNote = raw.estimateNote?.trim() ?? "";

  return {
    formTitle: raw.formTitle?.trim() || defaultSiteQuoteConfigSettings.formTitle,
    formSubtitle:
      !storedSubtitle || storedSubtitle === LEGACY_PUBLIC_COPY.formSubtitle
        ? defaultSiteQuoteConfigSettings.formSubtitle
        : storedSubtitle,
    estimateNote:
      !storedNote || storedNote === LEGACY_PUBLIC_COPY.estimateNote
        ? defaultSiteQuoteConfigSettings.estimateNote
        : storedNote,
    projectTypes: raw.projectTypes?.length ? raw.projectTypes : defaultSiteQuoteConfigSettings.projectTypes,
    pageTiers: raw.pageTiers?.length ? raw.pageTiers : defaultSiteQuoteConfigSettings.pageTiers,
    addons: mergeAddonsWithDefaults(raw.addons),
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
