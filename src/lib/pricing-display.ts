import type { PricingPlan, PricingTaxMention } from "@/content/pricing";
import { PRICE_ON_REQUEST_LABEL, PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";

export type PlanPriceDisplay =
  | {
      kind: "amount";
      /** « À partir de » / « From » — uniquement en mode `from`. */
      prefix: string | null;
      /** Montant formaté avec séparateurs français (ex. « 287 000 »). */
      amount: string;
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
  plan: Pick<PricingPlan, "priceMode" | "priceAmount" | "currencyLabel" | "currencyCode" | "taxMention" | "priceNote">,
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
    suffix: [currency, TAX_LABELS[plan.taxMention]].filter(Boolean).join(" "),
    note,
  };
}

/** Charge HT ajoutée au prix de base d'une formule (licence, hébergement…) — admin uniquement. */
export type PricingCharge = { id: string; label: string; amount: number };

export type PricingChargeInput = Pick<PricingCharge, "amount">;

/** Taux de TVA par défaut (UEMOA / Côte d'Ivoire) si aucun réglage en base. */
export const DEFAULT_PRICING_VAT_RATE = 18;

export type PlanTtcBreakdown = {
  baseHt: number;
  chargesHt: number;
  subtotalHt: number;
  vatRate: number;
  vatAmount: number;
  totalTtc: number;
};

/**
 * TTC = (base HT + charges HT) × (1 + TVA). Calcul en entiers (taux au centième)
 * pour éviter les erreurs de flottants ; arrondi au franc près.
 */
export function computePlanTtc(baseHt: number, charges: PricingChargeInput[], vatRate: number): PlanTtcBreakdown {
  const chargesHt = charges.reduce((sum, c) => sum + c.amount, 0);
  const subtotalHt = baseHt + chargesHt;
  const rateBp = Math.round(vatRate * 100);
  const totalTtc = Math.round((subtotalHt * (10000 + rateBp)) / 10000);
  return { baseHt, chargesHt, subtotalHt, vatRate: rateBp / 100, vatAmount: totalTtc - subtotalHt, totalTtc };
}

/** Destination de bouton acceptée : chemin interne, ancre ou URL https. */
export function isSafePlanCtaHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  if (value.startsWith("#")) return true;
  return /^https:\/\/[^\s/]+/i.test(value);
}
