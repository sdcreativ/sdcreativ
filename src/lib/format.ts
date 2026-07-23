/** Formate un montant en francs CFA (XOF). */
export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Alias court pour affichage portail client. */
export const formatFcfaShort = formatFcfa;

/** Texte public quand un tarif optionnel n’est pas renseigné. */
export const PRICE_ON_REQUEST_LABEL = "Devis personnalisé gratuit";

export function hasPublicPrice(amount: number | null | undefined): boolean {
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0;
}

/** « À partir de X FCFA » ou libellé devis si montant absent / 0. */
export function formatPriceFrom(amount: number | null | undefined): string {
  if (!hasPublicPrice(amount)) return PRICE_ON_REQUEST_LABEL;
  return `À partir de ${formatFcfa(amount)} FCFA`;
}
