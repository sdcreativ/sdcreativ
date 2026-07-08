import { z } from "zod";
import {
  pricingPlans as staticPlans,
  pricingReassurance as staticReassurance,
  type PricingPlan,
} from "@/content/pricing";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type PublicPricingPlanRecord = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  priceFrom: number;
  priceNote: string | null;
  features: string[];
  highlighted: boolean;
  variant: "primary" | "accent";
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicPricingReassuranceRecord = {
  id: string;
  label: string;
  description: string;
  locale: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price_from: number;
  price_note: string | null;
  features: string[];
  highlighted: boolean;
  variant: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

type ReassuranceRow = {
  id: string;
  label: string;
  description: string;
  locale: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapPlan(row: PlanRow): PublicPricingPlanRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    priceFrom: row.price_from,
    priceNote: row.price_note,
    features: row.features ?? [],
    highlighted: row.highlighted,
    variant: row.variant === "accent" ? "accent" : "primary",
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapReassurance(row: ReassuranceRow): PublicPricingReassuranceRecord {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    locale: row.locale,
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toPricingPlan(record: PublicPricingPlanRecord): PricingPlan {
  return {
    id: record.slug,
    name: record.name,
    tagline: record.tagline,
    priceFrom: record.priceFrom,
    priceNote: record.priceNote ?? undefined,
    features: record.features,
    highlighted: record.highlighted || undefined,
    variant: record.variant,
  };
}

export const createPublicPricingPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(120),
  priceFrom: z.number().int().min(0),
  priceNote: z.string().trim().max(120).optional(),
  features: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  highlighted: z.boolean().default(false),
  variant: z.enum(["primary", "accent"]).default("primary"),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicPricingPlanSchema = createPublicPricingPlanSchema.partial();

export const createPublicPricingReassuranceSchema = z.object({
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(200),
  locale: z.enum(["fr", "en"]).default("fr"),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isVisible: z.boolean().default(true),
});

export const updatePublicPricingReassuranceSchema = createPublicPricingReassuranceSchema.partial();

export async function listPublicPricingPlans(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicPricingPlanRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) conditions.push("is_visible = true");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<PlanRow>(
      `SELECT * FROM public_pricing_plans ${where} ORDER BY sort_order ASC, name ASC`,
      params,
    );
    return rows.map(mapPlan);
  });
}

export async function listPublicPricingReassurance(options?: {
  locale?: string;
  visibleOnly?: boolean;
}): Promise<PublicPricingReassuranceRecord[]> {
  if (!isDatabaseConfigured()) return [];

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (options?.locale) {
      params.push(options.locale);
      conditions.push(`locale = $${params.length}`);
    }
    if (options?.visibleOnly) conditions.push("is_visible = true");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query<ReassuranceRow>(
      `SELECT * FROM public_pricing_reassurance ${where} ORDER BY sort_order ASC, label ASC`,
      params,
    );
    return rows.map(mapReassurance);
  });
}

async function getPlanById(id: string): Promise<PublicPricingPlanRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<PlanRow>(`SELECT * FROM public_pricing_plans WHERE id=$1`, [id]);
    return rows[0] ? mapPlan(rows[0]) : null;
  });
}

async function getReassuranceById(id: string): Promise<PublicPricingReassuranceRecord | null> {
  return withDb(async (query) => {
    const { rows } = await query<ReassuranceRow>(
      `SELECT * FROM public_pricing_reassurance WHERE id=$1`,
      [id],
    );
    return rows[0] ? mapReassurance(rows[0]) : null;
  });
}

export async function createPublicPricingPlan(
  input: z.infer<typeof createPublicPricingPlanSchema>,
): Promise<PublicPricingPlanRecord> {
  const slug = slugifyBlogTitle(input.name).slice(0, 120) || "plan";
  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_pricing_plans WHERE locale=$1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<PlanRow>(
      `INSERT INTO public_pricing_plans (slug, name, tagline, price_from, price_note, features, highlighted, variant, locale, sort_order, is_visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        slug,
        input.name.trim(),
        input.tagline.trim(),
        input.priceFrom,
        input.priceNote?.trim() || null,
        input.features,
        input.highlighted,
        input.variant,
        input.locale,
        sortOrder,
        input.isVisible,
      ],
    );
    return mapPlan(rows[0]!);
  });
}

export async function updatePublicPricingPlan(
  id: string,
  input: z.infer<typeof updatePublicPricingPlanSchema>,
): Promise<PublicPricingPlanRecord | null> {
  const existing = await getPlanById(id);
  if (!existing) return null;
  const nextName = input.name?.trim() ?? existing.name;
  const nextSlug = nextName !== existing.name ? slugifyBlogTitle(nextName).slice(0, 120) : existing.slug;

  return withDb(async (query) => {
    const { rows } = await query<PlanRow>(
      `UPDATE public_pricing_plans SET slug=$2, name=$3, tagline=$4, price_from=$5, price_note=$6,
        features=$7, highlighted=$8, variant=$9, locale=$10, sort_order=$11, is_visible=$12, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        id,
        nextSlug,
        nextName,
        input.tagline?.trim() ?? existing.tagline,
        input.priceFrom ?? existing.priceFrom,
        input.priceNote !== undefined ? input.priceNote?.trim() || null : existing.priceNote,
        input.features ?? existing.features,
        input.highlighted ?? existing.highlighted,
        input.variant ?? existing.variant,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapPlan(rows[0]) : null;
  });
}

export async function deletePublicPricingPlan(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_pricing_plans WHERE id=$1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function reorderPublicPricingPlan(
  id: string,
  direction: "up" | "down",
): Promise<PublicPricingPlanRecord | null> {
  const item = await getPlanById(id);
  if (!item) return null;
  return withDb(async (query) => {
    const cmp = direction === "up" ? "<" : ">";
    const ord = direction === "up" ? "DESC" : "ASC";
    const { rows: neighbors } = await query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM public_pricing_plans WHERE locale=$1 AND sort_order ${cmp} $2 ORDER BY sort_order ${ord} LIMIT 1`,
      [item.locale, item.sortOrder],
    );
    const neighbor = neighbors[0];
    if (!neighbor) return item;
    await query(`UPDATE public_pricing_plans SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [item.id, neighbor.sort_order]);
    await query(`UPDATE public_pricing_plans SET sort_order=$2, updated_at=NOW() WHERE id=$1`, [neighbor.id, item.sortOrder]);
    return getPlanById(id);
  });
}

export async function createPublicPricingReassurance(
  input: z.infer<typeof createPublicPricingReassuranceSchema>,
): Promise<PublicPricingReassuranceRecord> {
  return withDb(async (query) => {
    const sortOrder =
      input.sortOrder ??
      (await query<{ next: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM public_pricing_reassurance WHERE locale=$1`,
        [input.locale],
      )).rows[0]?.next ??
      0;

    const { rows } = await query<ReassuranceRow>(
      `INSERT INTO public_pricing_reassurance (label, description, locale, sort_order, is_visible)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [input.label.trim(), input.description.trim(), input.locale, sortOrder, input.isVisible],
    );
    return mapReassurance(rows[0]!);
  });
}

export async function updatePublicPricingReassurance(
  id: string,
  input: z.infer<typeof updatePublicPricingReassuranceSchema>,
): Promise<PublicPricingReassuranceRecord | null> {
  const existing = await getReassuranceById(id);
  if (!existing) return null;

  return withDb(async (query) => {
    const { rows } = await query<ReassuranceRow>(
      `UPDATE public_pricing_reassurance SET label=$2, description=$3, locale=$4, sort_order=$5, is_visible=$6, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        id,
        input.label?.trim() ?? existing.label,
        input.description?.trim() ?? existing.description,
        input.locale ?? existing.locale,
        input.sortOrder ?? existing.sortOrder,
        input.isVisible ?? existing.isVisible,
      ],
    );
    return rows[0] ? mapReassurance(rows[0]) : null;
  });
}

export async function deletePublicPricingReassurance(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM public_pricing_reassurance WHERE id=$1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function importStaticPricing(): Promise<{
  plansImported: number;
  plansSkipped: number;
  reassuranceImported: number;
  reassuranceSkipped: number;
}> {
  let plansImported = 0;
  let plansSkipped = 0;
  let reassuranceImported = 0;
  let reassuranceSkipped = 0;

  for (let i = 0; i < staticPlans.length; i += 1) {
    const plan = staticPlans[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_pricing_plans WHERE slug=$1`,
          [plan.id],
        );
        if (rows[0]) {
          plansSkipped += 1;
          return;
        }
        await query(
          `INSERT INTO public_pricing_plans (slug, name, tagline, price_from, price_note, features, highlighted, variant, locale, sort_order, is_visible)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'fr',$9,true)`,
          [
            plan.id,
            plan.name,
            plan.tagline,
            plan.priceFrom,
            plan.priceNote ?? null,
            plan.features,
            plan.highlighted ?? false,
            plan.variant,
            i,
          ],
        );
        plansImported += 1;
      });
    } catch {
      plansSkipped += 1;
    }
  }

  for (let i = 0; i < staticReassurance.length; i += 1) {
    const item = staticReassurance[i]!;
    try {
      await withDb(async (query) => {
        const { rows } = await query<{ id: string }>(
          `SELECT id FROM public_pricing_reassurance WHERE label=$1 AND locale='fr'`,
          [item.label],
        );
        if (rows[0]) {
          reassuranceSkipped += 1;
          return;
        }
        await query(
          `INSERT INTO public_pricing_reassurance (label, description, locale, sort_order, is_visible)
           VALUES ($1,$2,'fr',$3,true)`,
          [item.label, item.description, i],
        );
        reassuranceImported += 1;
      });
    } catch {
      reassuranceSkipped += 1;
    }
  }

  return { plansImported, plansSkipped, reassuranceImported, reassuranceSkipped };
}
