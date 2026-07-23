/** Formate un montant en francs CFA (XOF). Usage CRM / portail — pas le site public. */
export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Alias court pour affichage portail client. */
export const formatFcfaShort = formatFcfa;

/** Texte public à la place de tout montant tarifaire. */
export const PRICE_ON_REQUEST_LABEL = "Devis personnalisé gratuit";

/** Libellé EN équivalent. */
export const PRICE_ON_REQUEST_LABEL_EN = "Free custom quote";

/**
 * Politique site public : aucun prix n’est affiché.
 * Les montants restent éditables en CRM / catalogue interne.
 */
export function hasPublicPrice(_amount: number | null | undefined): boolean {
  return false;
}

/** Toujours le libellé devis (jamais de montant sur le site public). */
export function formatPriceFrom(_amount: number | null | undefined): string {
  return PRICE_ON_REQUEST_LABEL;
}
