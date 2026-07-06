/** Formate un montant en francs CFA (XOF). */
export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Alias court pour affichage portail client. */
export const formatFcfaShort = formatFcfa;

export function formatPriceFrom(amount: number): string {
  return `À partir de ${formatFcfa(amount)} FCFA`;
}
