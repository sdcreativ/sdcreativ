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

/** Destination de bouton acceptée : chemin interne, ancre ou URL https. */
export function isSafePlanCtaHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  if (value.startsWith("#")) return true;
  return /^https:\/\/[^\s/]+/i.test(value);
}
