import { z } from "zod";
import type { QuoteStatus } from "@/content/quotes-labels";
import type { QuoteCalculatorConfig, QuoteLine } from "@/lib/quote-calculator";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

/**
 * Chiffrage d'un devis existant (demande du configurateur, devis à ajuster) — pur, partagé client / serveur.
 * Le devis garde sa référence et son prospect ; seuls les statuts d'avant signature sont modifiables.
 */
export const QUOTE_PRICING_STATUSES: QuoteStatus[] = ["draft", "sent", "viewed", "follow_up", "negotiation"];

export function canPriceQuote(quote: { status: QuoteStatus; archivedAt?: string | null }): boolean {
  return !quote.archivedAt && QUOTE_PRICING_STATUSES.includes(quote.status);
}

export const quotePricingSchema = z.object({
  projectLabel: z.string().trim().min(1, "Indiquez l'intitulé du projet.").max(200),
  lines: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Chaque ligne doit avoir un libellé.").max(300),
        quantity: z.number().positive().max(100_000),
        unitPrice: z.number().int().min(0),
        catalogItemId: z.string().uuid().optional(),
      }),
    )
    .min(1, "Ajoutez au moins une ligne.")
    .max(100),
  currency: z.enum(SUPPORTED_CURRENCIES),
  exchangeRateToXof: z.number().positive().optional().nullable(),
  /** Code avantage du popup : absent = inchangé, null / vide = retiré. */
  promoCode: z.string().trim().max(40).optional().nullable(),
});
export type QuotePricingInput = z.infer<typeof quotePricingSchema>;

/** Lignes enregistrées : montant recalculé (jamais celui envoyé par le navigateur), lignes à 0 écartées. */
export function pricedQuoteLines(lines: QuotePricingInput["lines"]): { lines: QuoteLine[]; subtotal: number } {
  const priced = lines
    .map((line) => {
      const amount = Math.max(0, Math.round(line.quantity * line.unitPrice));
      const label = line.quantity > 1 ? `${stripQuantitySuffix(line.label)} (×${line.quantity})` : stripQuantitySuffix(line.label);
      return { label, amount, quantity: line.quantity, unitPrice: line.unitPrice, catalogItemId: line.catalogItemId };
    })
    .filter((line) => line.amount > 0);
  return { lines: priced, subtotal: priced.reduce((sum, line) => sum + line.amount, 0) };
}

/** « Page d'accueil (×3) » → « Page d'accueil » (le suffixe est recalculé à l'enregistrement). */
export function stripQuantitySuffix(label: string): string {
  return label.replace(/\s*\(×\d+(?:[.,]\d+)?\)\s*$/, "").trim();
}

export type QuoteRequestSummary = {
  projectLabel: string;
  pageTier: string | null;
  addons: string[];
  pricingPlan: string | null;
};

export type SuggestedPricingLine = { label: string; quantity: number; unitPrice: number };

/**
 * Demande du client reconstituée depuis le configurateur (type de projet, nombre de pages, options)
 * et lignes de départ au tarif de la grille, converties dans la devise du devis.
 */
export function quoteRequestFromConfig(
  quote: {
    projectTypeId: string | null;
    projectLabel: string;
    pageTierId: string | null;
    addonIds: string[];
    metadata: Record<string, unknown>;
  },
  config: QuoteCalculatorConfig,
  rateToXof: number | null,
): { request: QuoteRequestSummary; suggestedLines: SuggestedPricingLine[] } {
  const toCurrency = (xof: number) => (rateToXof ? Math.round(xof / rateToXof) : xof);
  const project = config.projectTypes.find((p) => p.id === quote.projectTypeId);
  const tier = project?.supportsPages ? config.pageTiers.find((t) => t.id === quote.pageTierId) : undefined;
  const addons = quote.addonIds
    .map((id) => config.addons.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const text = (key: string) => (typeof quote.metadata[key] === "string" ? (quote.metadata[key] as string) : null);

  const suggestedLines: SuggestedPricingLine[] = [
    { label: project?.label ?? quote.projectLabel, quantity: 1, unitPrice: toCurrency(project?.basePrice ?? 0) },
  ];
  if (tier && tier.extraPrice > 0) {
    suggestedLines.push({ label: `Pages supplémentaires — ${tier.label}`, quantity: 1, unitPrice: toCurrency(tier.extraPrice) });
  }
  for (const addon of addons) {
    suggestedLines.push({ label: addon.label, quantity: 1, unitPrice: toCurrency(addon.price) });
  }

  return {
    request: {
      projectLabel: project?.label ?? quote.projectLabel,
      pageTier: tier?.label ?? null,
      addons: addons.map((a) => a.label),
      pricingPlan: text("pricingPlan"),
    },
    suggestedLines,
  };
}

/** Avantage du code popup, écrit sur le devis : « Code SDC-XXXX : -50 % sur la maintenance de la 2e année ». */
export function quotePromoText(quote: { metadata: Record<string, unknown> }): string | null {
  const code = quote.metadata?.promoCode;
  if (typeof code !== "string" || !code) return null;
  const offer = quote.metadata?.promoOffer;
  return typeof offer === "string" && offer.trim() ? `Code ${code} : ${offer.trim()}` : `Code avantage ${code}`;
}
