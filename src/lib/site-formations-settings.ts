import { cache } from "react";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM } from "@/lib/lucide-icon-map";
import {
  defaultSiteFormationsSettings,
  type FormationDetailStored,
  type SiteFormationsSettings,
} from "@/lib/site-formations-types";

type Row = { site_formations: Partial<SiteFormationsSettings> | null };

const headingSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  highlight: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
});

const courseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  duration: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.string().trim().max(80).optional(),
  ),
  price: z.preprocess(
    (value) => (value === "" || Number.isNaN(value) ? null : value),
    z.number().int().min(0).nullable().optional(),
  ),
});

const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems);

const detailSchema = z.object({
  heroDescription: z.string().trim().min(1).max(500),
  metaDescription: z.string().trim().min(1).max(320),
  format: z.string().trim().min(1).max(160),
  durationSummary: z.string().trim().min(1).max(120),
  level: z.string().trim().min(1).max(80),
  audience: stringList(20, 200),
  objectives: stringList(20, 240),
  prerequisites: stringList(20, 240),
  outcomes: stringList(20, 240),
  methodology: stringList(20, 240),
  process: z
    .array(
      z.object({
        step: z.number().int().min(1).max(20),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(400),
      }),
    )
    .max(12),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(10).max(2000),
      }),
    )
    .max(20),
});

export const updateSiteFormationsSchema = z.object({
  intro: headingSchema,
  catalog: headingSchema,
  cta: z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(400),
    primary: z.string().trim().min(1).max(80),
    secondary: z.string().trim().min(1).max(80),
  }),
  faqHeading: z.string().trim().min(1).max(120),
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
  categories: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        icon: z.enum(LUCIDE_ICON_NAME_ENUM),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(400),
        image: z.string().trim().min(1).max(800),
        imageAlt: z.string().trim().max(200).optional(),
        isServices: z.boolean().optional(),
        courses: z.array(courseSchema).min(1).max(40),
        detail: detailSchema,
      }),
    )
    .min(1)
    .max(30),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(5).max(300),
        answer: z.string().trim().min(10).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

function normalizeCourse(
  course: z.infer<typeof courseSchema>,
): SiteFormationsSettings["categories"][number]["courses"][number] {
  const duration = course.duration?.trim() || undefined;
  const price =
    course.price === null || course.price === undefined ? null : course.price;
  return {
    title: course.title,
    ...(duration ? { duration } : {}),
    ...(price !== null && price !== undefined ? { price } : { price: null }),
  };
}

function mergeDetail(
  raw: Partial<FormationDetailStored> | undefined,
  fallback: FormationDetailStored,
): FormationDetailStored {
  if (!raw) return fallback;
  return {
    ...fallback,
    ...raw,
    audience: raw.audience?.length ? raw.audience : fallback.audience,
    objectives: raw.objectives?.length ? raw.objectives : fallback.objectives,
    prerequisites: raw.prerequisites?.length ? raw.prerequisites : fallback.prerequisites,
    outcomes: raw.outcomes?.length ? raw.outcomes : fallback.outcomes,
    methodology: raw.methodology?.length ? raw.methodology : fallback.methodology,
    process: raw.process?.length ? raw.process : fallback.process,
    faq: raw.faq?.length ? raw.faq : fallback.faq,
  };
}

function mergeCategories(
  raw: SiteFormationsSettings["categories"] | undefined,
): SiteFormationsSettings["categories"] {
  if (!raw?.length) return defaultSiteFormationsSettings.categories;
  const defaultsById = new Map(
    defaultSiteFormationsSettings.categories.map((cat) => [cat.id, cat]),
  );
  return raw.map((cat) => {
    const fallback = defaultsById.get(cat.id);
    const fallbackDetail =
      fallback?.detail ??
      defaultSiteFormationsSettings.categories[0]!.detail;
    return {
      ...fallback,
      ...cat,
      image:
        cat.image?.trim() ||
        fallback?.image ||
        "/images/formations/developpement-web-mobile.jpg",
      imageAlt: cat.imageAlt?.trim() || fallback?.imageAlt || cat.title,
      courses: cat.courses?.length ? cat.courses : fallback?.courses ?? [],
      detail: mergeDetail(cat.detail, fallbackDetail),
    };
  });
}

function merge(raw: Partial<SiteFormationsSettings> | null): SiteFormationsSettings {
  if (!raw) return defaultSiteFormationsSettings;
  return {
    ...defaultSiteFormationsSettings,
    ...raw,
    intro: { ...defaultSiteFormationsSettings.intro, ...raw.intro },
    catalog: { ...defaultSiteFormationsSettings.catalog, ...raw.catalog },
    cta: { ...defaultSiteFormationsSettings.cta, ...raw.cta },
    highlights: raw.highlights?.length
      ? raw.highlights
      : defaultSiteFormationsSettings.highlights,
    categories: mergeCategories(raw.categories),
    faq: raw.faq?.length ? raw.faq : defaultSiteFormationsSettings.faq,
  };
}

export const getSiteFormationsSettings = cache(async (): Promise<SiteFormationsSettings> => {
  if (!isDatabaseConfigured()) return defaultSiteFormationsSettings;
  try {
    return await withDb(async (query) => {
      const { rows } = await query<Row>(`SELECT site_formations FROM crm_settings WHERE id = 1`);
      return merge(rows[0]?.site_formations ?? null);
    });
  } catch (error) {
    console.error("[site-formations] fallback:", error);
    return defaultSiteFormationsSettings;
  }
});

export async function getSiteFormationsSettingsForAdmin() {
  return getSiteFormationsSettings();
}

export async function updateSiteFormationsSettings(
  input: z.infer<typeof updateSiteFormationsSchema>,
): Promise<SiteFormationsSettings> {
  const normalized: SiteFormationsSettings = {
    ...input,
    categories: input.categories.map((cat) => ({
      ...cat,
      courses: cat.courses.map(normalizeCourse),
    })),
  };

  return withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_formations, updated_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET site_formations = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(normalized)],
    );
    return merge(normalized);
  });
}

export async function resetSiteFormationsSettings() {
  return updateSiteFormationsSettings(defaultSiteFormationsSettings);
}
