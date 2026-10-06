import { z } from "zod";
import {
  pricingPlans as staticPlans,
  pricingReassurance as staticReassurance,
  type PricingPerk,
  type PricingPlan,
  type PricingPriceMode,
  type PricingTaxMention,
} from "@/content/pricing";
import { slugifyBlogTitle } from "@/lib/blog-posts-types";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { LUCIDE_ICON_NAME_ENUM, LUCIDE_ICON_NAMES, type LucideIconName } from "@/lib/lucide-icon-map";
import { isSafePlanCtaHref } from "@/lib/pricing-display";

export type PublicPricingPlanRecord = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  priceMode: PricingPriceMode;
  /** Montant entier (colonne `price_from`), null en mode « sur devis ». */
  priceAmount: number | null;
  currencyCode: string;
  currencyLabel: string;
  taxMention: PricingTaxMention;
  priceNote: string | null;
  features: string[];
  perks: PricingPerk[];
  highlighted: boolean;
  badgeLabel: string | null;
  variant: "primary" | "accent";
  ctaLabel: string | null;
  ctaHref: string | null;
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
  price_mode: string;
  price_from: number | null;
  currency_code: string;
  currency_label: string;
  tax_mention: string;
  price_note: string | null;
  features: string[];
  perks: unknown;
  highlighted: boolean;
  badge_label: string | null;
  variant: string;
  cta_label: string | null;
  cta_href: string | null;
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

const PRICE_MODES = ["fixed", "from", "quote"] as const satisfies readonly PricingPriceMode[];
const TAX_MENTIONS = ["ttc", "ht", "none"] as const satisfies readonly PricingTaxMention[];

/** Lecture tolérante du JSONB `perks` (données anciennes ou partielles). */
function parsePerks(value: unknown): PricingPerk[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title : "";
    if (!title) return [];
    const icon = typeof item.icon === "string" && LUCIDE_ICON_NAMES.includes(item.icon as LucideIconName)
      ? (item.icon as LucideIconName)
      : "HelpCircle";
    return [{
      id: typeof item.id === "string" && item.id ? item.id : `perk-${index}`,
      title,
      detail: typeof item.detail === "string" ? item.detail : "",
      icon,
      isVisible: item.isVisible !== false,
    }];
  });
}

function mapPlan(row: PlanRow): PublicPricingPlanRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    priceMode: PRICE_MODES.find((m) => m === row.price_mode) ?? "quote",
    priceAmount: row.price_from,
    currencyCode: row.currency_code,
    currencyLabel: row.currency_label,
    taxMention: TAX_MENTIONS.find((t) => t === row.tax_mention) ?? "none",
    priceNote: row.price_note,
    features: row.features ?? [],
    perks: parsePerks(row.perks),
    highlighted: row.highlighted,
    badgeLabel: row.badge_label,
    variant: row.variant === "accent" ? "accent" : "primary",
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
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
  const en = record.locale === "en";
  return {
    id: record.slug,
    name: record.name,
    tagline: record.tagline,
    priceMode: record.priceMode,
    priceAmount: record.priceAmount ?? undefined,
    currencyCode: record.currencyCode,
    currencyLabel: record.currencyLabel,
    taxMention: record.taxMention,
    priceNote: record.priceNote ?? undefined,
    features: record.features,
    perks: record.perks,
    highlighted: record.highlighted || undefined,
    badgeLabel: record.badgeLabel ?? undefined,
    variant: record.variant,
    // Repli sur le parcours devis historique si le bouton n'a pas été renseigné.
    ctaLabel: record.ctaLabel || (en ? "Get a quote" : "Demander un devis"),
    ctaHref: record.ctaHref || (en ? "/en/devis" : "/devis"),
  };
}

const pricingPerkSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  detail: z.string().trim().max(160).default(""),
  icon: z.enum(LUCIDE_ICON_NAME_ENUM),
  isVisible: z.boolean().default(true),
});

/** Champs sans valeurs par défaut : un PATCH partiel ne doit rien réinitialiser. */
const pricingPlanFields = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(120),
  priceMode: z.enum(PRICE_MODES),
  priceAmount: z.number().int().min(0).max(1_000_000_000).nullable(),
  currencyCode: z.enum(SUPPORTED_CURRENCIES),
  currencyLabel: z.string().trim().max(20),
  taxMention: z.enum(TAX_MENTIONS),
  priceNote: z.string().trim().max(120),
  features: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  perks: z.array(pricingPerkSchema).max(8),
  highlighted: z.boolean(),
  badgeLabel: z.string().trim().max(40),
  variant: z.enum(["primary", "accent"]),
  ctaLabel: z.string().trim().min(2).max(60),
  ctaHref: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .refine(isSafePlanCtaHref, "Destination du bouton invalide (chemin /…, #ancre ou URL https)."),
  locale: z.enum(["fr", "en"]),
  sortOrder: z.number().int().min(0).max(999),
  isVisible: z.boolean(),
});

export const createPublicPricingPlanSchema = pricingPlanFields.extend({
  priceMode: pricingPlanFields.shape.priceMode.default("quote"),
  priceAmount: pricingPlanFields.shape.priceAmount.optional(),
  currencyCode: pricingPlanFields.shape.currencyCode.default("XOF"),
  currencyLabel: pricingPlanFields.shape.currencyLabel.default("FCFA"),
  taxMention: pricingPlanFields.shape.taxMention.default("none"),
  priceNote: pricingPlanFields.shape.priceNote.optional(),
  perks: pricingPlanFields.shape.perks.default([]),
  highlighted: pricingPlanFields.shape.highlighted.default(false),
  badgeLabel: pricingPlanFields.shape.badgeLabel.optional(),
  variant: pricingPlanFields.shape.variant.default("primary"),
  ctaLabel: pricingPlanFields.shape.ctaLabel.optional(),
  ctaHref: pricingPlanFields.shape.ctaHref.optional(),
  locale: pricingPlanFields.shape.locale.default("fr"),
  sortOrder: pricingPlanFields.shape.sortOrder.optional(),
  isVisible: pricingPlanFields.shape.isVisible.default(true),
});

export const updatePublicPricingPlanSchema = pricingPlanFields.partial();

/** Message 400 lisible : préfixe le champ fautif (ex. « perks.0.title : … »). */
export function formatPlanIssue(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return "Données invalides.";
  const path = issue.path.join(".");
  return path ? `${path} : ${issue.message}` : issue.message;
}

/** Erreur métier renvoyée en 400 par les routes admin. */
export class PricingPlanValidationError extends Error {}

/** Cohérence prix ↔ mode, vérifiée sur l'état final (création ou fusion PATCH). */
export function assertPlanPricingConsistent(plan: {
  priceMode: PricingPriceMode;
  priceAmount: number | null | undefined;
}): void {
  if (plan.priceMode !== "quote" && (plan.priceAmount == null || plan.priceAmount <= 0)) {
    throw new PricingPlanValidationError("Montant requis pour un prix fixe ou « À partir de ».");
  }
}

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
  assertPlanPricingConsistent({ priceMode: input.priceMode, priceAmount: input.priceAmount });
  const en = input.locale === "en";
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
      `INSERT INTO public_pricing_plans (slug, name, tagline, price_mode, price_from, currency_code, currency_label,
         tax_mention, price_note, features, perks, highlighted, badge_label, variant, cta_label, cta_href,
         locale, sort_order, is_visible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        slug,
        input.name.trim(),
        input.tagline.trim(),
        input.priceMode,
        input.priceMode === "quote" ? null : (input.priceAmount ?? null),
        input.currencyCode,
        input.currencyLabel,
        input.priceMode === "quote" ? "none" : input.taxMention,
        input.priceNote?.trim() || null,
        input.features,
        JSON.stringify(input.perks),
        input.highlighted,
        input.badgeLabel?.trim() || null,
        input.variant,
        input.ctaLabel?.trim() || (en ? "Get a quote" : "Demander un devis"),
        input.ctaHref?.trim() || (en ? "/en/devis" : "/devis"),
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
  const priceMode = input.priceMode ?? existing.priceMode;
  const priceAmount = input.priceAmount !== undefined ? input.priceAmount : existing.priceAmount;
  assertPlanPricingConsistent({ priceMode, priceAmount });
  const pick = <T,>(value: T | undefined, fallback: T): T => (value !== undefined ? value : fallback);
  const optionalText = (value: string | undefined, fallback: string | null) =>
    value !== undefined ? value.trim() || null : fallback;

  return withDb(async (query) => {
    const { rows } = await query<PlanRow>(
      `UPDATE public_pricing_plans SET slug=$2, name=$3, tagline=$4, price_mode=$5, price_from=$6,
        currency_code=$7, currency_label=$8, tax_mention=$9, price_note=$10, features=$11, perks=$12,
        highlighted=$13, badge_label=$14, variant=$15, cta_label=$16, cta_href=$17, locale=$18,
        sort_order=$19, is_visible=$20, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        id,
        nextSlug,
        nextName,
        input.tagline?.trim() ?? existing.tagline,
        priceMode,
        priceMode === "quote" ? null : priceAmount,
        pick(input.currencyCode, existing.currencyCode),
        pick(input.currencyLabel, existing.currencyLabel),
        priceMode === "quote" ? "none" : pick(input.taxMention, existing.taxMention),
        optionalText(input.priceNote, existing.priceNote),
        pick(input.features, existing.features),
        JSON.stringify(pick(input.perks, existing.perks)),
        pick(input.highlighted, existing.highlighted),
        optionalText(input.badgeLabel, existing.badgeLabel),
        pick(input.variant, existing.variant),
        optionalText(input.ctaLabel, existing.ctaLabel),
        optionalText(input.ctaHref, existing.ctaHref),
        pick(input.locale, existing.locale),
        pick(input.sortOrder, existing.sortOrder),
        pick(input.isVisible, existing.isVisible),
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
        // Insertion seule : une formule déjà en base (même slug) n'est jamais écrasée.
        if (rows[0]) {
          plansSkipped += 1;
          return;
        }
        await query(
          `INSERT INTO public_pricing_plans (slug, name, tagline, price_mode, price_from, currency_code, currency_label,
             tax_mention, price_note, features, perks, highlighted, badge_label, variant, cta_label, cta_href,
             locale, sort_order, is_visible)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'fr',$17,true)`,
          [
            plan.id,
            plan.name,
            plan.tagline,
            plan.priceMode,
            plan.priceAmount ?? null,
            plan.currencyCode,
            plan.currencyLabel,
            plan.taxMention,
            plan.priceNote ?? null,
            plan.features,
            JSON.stringify(plan.perks),
            plan.highlighted ?? false,
            plan.badgeLabel ?? null,
            plan.variant,
            plan.ctaLabel,
            plan.ctaHref,
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
