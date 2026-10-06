import type { PricingPlan, PricingTaxMention } from "@/content/pricing";
import { PRICE_ON_REQUEST_LABEL, PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";

export type PlanPriceDisplay =
  | {
      kind: "amount";
      /** « À partir de » / « From » — uniquement en mode `from`. */
      prefix: string | null;
      /** Montant formaté avec séparateurs français (ex. « 287 000 »). */
      amount: string;
      /** Prix avant remise formaté, à afficher barré (null sans remise). */
      compareAt: string | null;
      /** Devise + mention fiscale (ex. « FCFA TTC »). */
      suffix: string;
      note: string | null;
    }
  | { kind: "quote"; label: string };

const TAX_LABELS: Record<PricingTaxMention, string> = { ttc: "TTC", ht: "HT", none: "" };

/** Formate un montant entier avec les séparateurs français (espaces fines insécables). */
export function formatPlanAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
}

export function resolvePlanPriceDisplay(
  plan: Pick<PricingPlan, "priceMode" | "priceAmount" | "currencyLabel" | "currencyCode" | "taxMention" | "priceNote"> &
    Partial<Pick<PricingPlan, "compareAtAmount">>,
  locale: "fr" | "en" = "fr",
): PlanPriceDisplay {
  const note = plan.priceNote?.trim() || null;
  const amount = plan.priceAmount;

  if (plan.priceMode === "quote" || amount == null || amount <= 0) {
    return { kind: "quote", label: note ?? (locale === "en" ? PRICE_ON_REQUEST_LABEL_EN : PRICE_ON_REQUEST_LABEL) };
  }

  const currency = plan.currencyLabel.trim() || plan.currencyCode;
  return {
    kind: "amount",
    prefix: plan.priceMode === "from" ? (locale === "en" ? "From" : "À partir de") : null,
    amount: formatPlanAmount(amount),
    compareAt: plan.compareAtAmount != null && plan.compareAtAmount > amount ? formatPlanAmount(plan.compareAtAmount) : null,
    suffix: [currency, TAX_LABELS[plan.taxMention]].filter(Boolean).join(" "),
    note,
  };
}

/** Charge HT ajoutée au prix de base d'une formule (licence, hébergement…) — admin uniquement. */
export type PricingCharge = {
  id: string;
  label: string;
  amount: number;
  /** Remise parrainage (%) sur cette charge, ex. 20 pour l'hébergement Hostinger. */
  discountPercent?: number;
};

export type PricingChargeInput = Pick<PricingCharge, "amount" | "discountPercent">;

/** Taux de TVA par défaut (UEMOA / Côte d'Ivoire) si aucun réglage en base. */
export const DEFAULT_PRICING_VAT_RATE = 18;

/** Parrainage Hostinger SD CREATIV : -20 % pour le nouveau compte client. */
export const DEFAULT_PRICING_REFERRAL_URL = "https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT";
export const DEFAULT_PRICING_REFERRAL_PERCENT = 20;

export type PlanTtcBreakdown = {
  baseHt: number;
  /** Charges HT avant remise. */
  chargesHt: number;
  /** Total des remises parrainage HT. */
  discountHt: number;
  /** Base + charges − remises. */
  subtotalHt: number;
  vatRate: number;
  vatAmount: number;
  totalTtc: number;
  /** TTC sans remise — prix barré quand discountHt > 0. */
  totalTtcBeforeDiscount: number;
};

/** Points de base (centièmes de %) pour calculer en entiers, sans erreur de flottant. */
const toBp = (percent: number) => Math.round(percent * 100);

/**
 * TTC = (base HT + charges HT − remises parrainage HT) × (1 + TVA).
 * Chaque remise s'applique à sa charge (ex. hébergement -20 %) ; arrondis au franc près.
 */
export function computePlanTtc(baseHt: number, charges: PricingChargeInput[], vatRate: number): PlanTtcBreakdown {
  const chargesHt = charges.reduce((sum, c) => sum + c.amount, 0);
  const discountHt = charges.reduce(
    (sum, c) => sum + Math.round((c.amount * Math.min(toBp(c.discountPercent ?? 0), 10000)) / 10000),
    0,
  );
  const subtotalHt = baseHt + chargesHt - discountHt;
  const rateBp = toBp(vatRate);
  const withVat = (ht: number) => Math.round((ht * (10000 + rateBp)) / 10000);
  const totalTtc = withVat(subtotalHt);
  return {
    baseHt,
    chargesHt,
    discountHt,
    subtotalHt,
    vatRate: rateBp / 100,
    vatAmount: totalTtc - subtotalHt,
    totalTtc,
    totalTtcBeforeDiscount: withVat(baseHt + chargesHt),
  };
}

/** Destination de bouton acceptée : chemin interne, ancre ou URL https. */
export function isSafePlanCtaHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  if (value.startsWith("#")) return true;
  return /^https:\/\/[^\s/]+/i.test(value);
}
