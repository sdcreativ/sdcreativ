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
import {
  computePlanPricing,
  DEFAULT_PRICING_HOSTING_EUR,
  DEFAULT_PRICING_REFERRAL_NOTE,
  DEFAULT_PRICING_REFERRAL_PERCENT,
  DEFAULT_PRICING_REFERRAL_URL,
  DEFAULT_PRICING_VAT_RATE,
  formatReferralNote,
  isSafePlanCtaHref,
  type PricingCharge,
} from "@/lib/pricing-display";

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
  /** Calcul automatique : quand renseigné, priceAmount = (base + charges) × (1 + TVA). */
  baseAmountHt: number | null;
  charges: PricingCharge[];
  /** Ajoute l'hébergement Hostinger 1 an (réglages) avec sa remise parrainage. */
  includeHosting: boolean;
  /** Prix barré calculé (TTC sans remise parrainage), null sans remise. */
  compareAtAmount: number | null;
  discountLabel: string | null;
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
  base_amount_ht: number | null;
  charges: unknown;
  include_hosting: boolean;
  price_compare_at: number | null;
  discount_label: string | null;
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
      ...(item.referralLink === true ? { referralLink: true } : {}),
    }];
  });
}

function parseCharges(value: unknown): PricingCharge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.label !== "string" || typeof item.amount !== "number") return [];
    return [{ id: typeof item.id === "string" && item.id ? item.id : `charge-${index}`, label: item.label, amount: item.amount }];
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
    baseAmountHt: row.base_amount_ht,
    charges: parseCharges(row.charges),
    includeHosting: row.include_hosting,
    compareAtAmount: row.price_compare_at,
    discountLabel: row.discount_label,
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

/**
 * `settings` : réglages courants. Les avantages marqués `referralLink` (hébergement) reçoivent le
 * lien de parrainage, et la mention de remise quand la remise s'applique à cette formule.
 */
export function toPricingPlan(
  record: PublicPricingPlanRecord,
  settings?: Pick<PricingSettings, "referralUrl" | "referralPercent" | "referralNote">,
): PricingPlan {
  const discounted = record.compareAtAmount != null && record.includeHosting;
  const note = discounted && settings ? formatReferralNote(settings.referralNote, settings.referralPercent) : "";
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
    perks: record.perks.map((perk) =>
      perk.referralLink
        ? {
            ...perk,
            ...(settings?.referralUrl ? { href: settings.referralUrl } : {}),
            ...(note ? { note } : {}),
          }
        : perk,
    ),
    compareAtAmount: record.compareAtAmount ?? undefined,
    discountLabel: record.discountLabel ?? undefined,
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
  referralLink: z.boolean().optional(),
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
  baseAmountHt: z.number().int().min(0).max(1_000_000_000).nullable(),
  discountLabel: z.string().trim().max(60),
  includeHosting: z.boolean(),
  charges: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(120),
        amount: z.number().int().min(0).max(1_000_000_000),
      }),
    )
    .max(20),
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
  baseAmountHt: pricingPlanFields.shape.baseAmountHt.optional(),
  discountLabel: pricingPlanFields.shape.discountLabel.optional(),
  includeHosting: pricingPlanFields.shape.includeHosting.default(false),
  charges: pricingPlanFields.shape.charges.default([]),
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

export const pricingSettingsSchema = z.object({
  vatRate: z.number().min(0).max(100).multipleOf(0.01),
  referralUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/[^\s/]+/i.test(v), "Lien de parrainage : URL https attendue."),
  referralPercent: z.number().min(0).max(100).multipleOf(0.01),
  /** Hébergement 1 an HT en euros (Hostinger), converti en FCFA à la parité fixe. */
  hostingEur: z.number().min(0).max(100_000).multipleOf(0.01),
  /** Mention sous l'avantage hébergement ; {pourcentage} = % de parrainage. */
  referralNote: z.string().trim().max(160),
});

export type PricingSettings = z.infer<typeof pricingSettingsSchema>;

const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  vatRate: DEFAULT_PRICING_VAT_RATE,
  referralUrl: DEFAULT_PRICING_REFERRAL_URL,
  referralPercent: DEFAULT_PRICING_REFERRAL_PERCENT,
  hostingEur: DEFAULT_PRICING_HOSTING_EUR,
  referralNote: DEFAULT_PRICING_REFERRAL_NOTE,
};

type EffectivePrice = { priceAmount: number | null; compareAtAmount: number | null; taxMention: PricingTaxMention };

/**
 * Montant affiché, prix barré et mention fiscale effectifs. En calcul automatique, le TTC est
 * dérivé de la base HT, des charges, de l'hébergement parrainé (remise sur l'hébergement seul)
 * et de la TVA globale ; sinon le montant saisi est conservé, sans prix barré.
 */
function resolveEffectivePrice(
  plan: {
    priceMode: PricingPriceMode;
    priceAmount: number | null | undefined;
    taxMention: PricingTaxMention;
    baseAmountHt: number | null | undefined;
    charges: PricingCharge[];
    includeHosting: boolean;
  },
  settings: PricingSettings,
): EffectivePrice {
  if (plan.priceMode === "quote") return { priceAmount: null, compareAtAmount: null, taxMention: "none" };
  if (plan.baseAmountHt != null) {
    const b = computePlanPricing({
      baseHt: plan.baseAmountHt,
      charges: plan.charges,
      includeHosting: plan.includeHosting,
      hostingEur: settings.hostingEur,
      referralPercent: settings.referralPercent,
      vatRate: settings.vatRate,
    });
    return {
      priceAmount: b.totalTtc,
      compareAtAmount: b.discountHt > 0 ? b.totalTtcBeforeDiscount : null,
      taxMention: "ttc",
    };
  }
  return { priceAmount: plan.priceAmount ?? null, compareAtAmount: null, taxMention: plan.taxMention };
}

type CrmSettingsPricingRow = {
  pricing_vat_rate: string | number;
  pricing_referral_url: string;
  pricing_referral_percent: string | number;
  pricing_hosting_eur: string | number;
  pricing_referral_note: string;
};

/** Réglages tarifs globaux (crm_settings) : TVA, hébergement et parrainage Hostinger. */
export async function getPricingSettings(): Promise<PricingSettings> {
  if (!isDatabaseConfigured()) return DEFAULT_PRICING_SETTINGS;
  return withDb(async (query) => {
    const { rows } = await query<CrmSettingsPricingRow>(
      `SELECT pricing_vat_rate, pricing_referral_url, pricing_referral_percent, pricing_hosting_eur,
         pricing_referral_note
       FROM crm_settings WHERE id = 1`,
    );
    const row = rows[0];
    if (!row) return DEFAULT_PRICING_SETTINGS;
    return {
      vatRate: Number(row.pricing_vat_rate),
      referralUrl: row.pricing_referral_url,
      referralPercent: Number(row.pricing_referral_percent),
      hostingEur: Number(row.pricing_hosting_eur),
      referralNote: row.pricing_referral_note,
    };
  });
}

/** Enregistre les réglages puis recalcule le TTC (et le prix barré) des formules en calcul automatique. */
export async function updatePricingSettings(
  input: PricingSettings,
): Promise<PricingSettings & { plansUpdated: number }> {
  await withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, pricing_vat_rate, pricing_referral_url, pricing_referral_percent,
         pricing_hosting_eur, pricing_referral_note, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET pricing_vat_rate = $1, pricing_referral_url = $2,
         pricing_referral_percent = $3, pricing_hosting_eur = $4, pricing_referral_note = $5, updated_at = NOW()`,
      [input.vatRate, input.referralUrl, input.referralPercent, input.hostingEur, input.referralNote],
    );
  });

  const autoPlans = (await listPublicPricingPlans()).filter(
    (plan) => plan.baseAmountHt != null && plan.priceMode !== "quote",
  );
  await withDb(async (query) => {
    for (const plan of autoPlans) {
      const effective = resolveEffectivePrice(plan, input);
      await query(
        `UPDATE public_pricing_plans SET price_from=$2, price_compare_at=$3, tax_mention='ttc', updated_at=NOW()
         WHERE id=$1`,
        [plan.id, effective.priceAmount, effective.compareAtAmount],
      );
    }
  });
  return { ...input, plansUpdated: autoPlans.length };
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
  const effective = resolveEffectivePrice(
    { ...input, priceAmount: input.priceAmount ?? null, baseAmountHt: input.baseAmountHt ?? null },
    input.baseAmountHt != null ? await getPricingSettings() : DEFAULT_PRICING_SETTINGS,
  );
  assertPlanPricingConsistent({ priceMode: input.priceMode, priceAmount: effective.priceAmount });
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
         tax_mention, price_note, base_amount_ht, charges, features, perks, highlighted, badge_label, variant,
         cta_label, cta_href, locale, sort_order, is_visible, price_compare_at, discount_label, include_hosting)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,
      [
        slug,
        input.name.trim(),
        input.tagline.trim(),
        input.priceMode,
        effective.priceAmount,
        input.currencyCode,
        input.currencyLabel,
        effective.taxMention,
        input.priceNote?.trim() || null,
        input.baseAmountHt ?? null,
        JSON.stringify(input.charges),
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
        effective.compareAtAmount,
        input.discountLabel?.trim() || null,
        input.includeHosting,
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
  const pick = <T,>(value: T | undefined, fallback: T): T => (value !== undefined ? value : fallback);
  const priceMode = pick(input.priceMode, existing.priceMode);
  const baseAmountHt = pick(input.baseAmountHt, existing.baseAmountHt);
  const charges = pick(input.charges, existing.charges);
  const includeHosting = pick(input.includeHosting, existing.includeHosting);
  const effective = resolveEffectivePrice(
    {
      priceMode,
      priceAmount: pick(input.priceAmount, existing.priceAmount),
      taxMention: pick(input.taxMention, existing.taxMention),
      baseAmountHt,
      charges,
      includeHosting,
    },
    baseAmountHt != null ? await getPricingSettings() : DEFAULT_PRICING_SETTINGS,
  );
  assertPlanPricingConsistent({ priceMode, priceAmount: effective.priceAmount });
  const optionalText = (value: string | undefined, fallback: string | null) =>
    value !== undefined ? value.trim() || null : fallback;

  return withDb(async (query) => {
    const { rows } = await query<PlanRow>(
      `UPDATE public_pricing_plans SET slug=$2, name=$3, tagline=$4, price_mode=$5, price_from=$6,
        currency_code=$7, currency_label=$8, tax_mention=$9, price_note=$10, features=$11, perks=$12,
        highlighted=$13, badge_label=$14, variant=$15, cta_label=$16, cta_href=$17, locale=$18,
        sort_order=$19, is_visible=$20, base_amount_ht=$21, charges=$22, price_compare_at=$23,
        discount_label=$24, include_hosting=$25, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        id,
        nextSlug,
        nextName,
        input.tagline?.trim() ?? existing.tagline,
        priceMode,
        effective.priceAmount,
        pick(input.currencyCode, existing.currencyCode),
        pick(input.currencyLabel, existing.currencyLabel),
        effective.taxMention,
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
        baseAmountHt,
        JSON.stringify(charges),
        effective.compareAtAmount,
        optionalText(input.discountLabel, existing.discountLabel),
        includeHosting,
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
