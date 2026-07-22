/** Proposition de valeur affichée à la place des prix sur le site public. */
export const SITE_VALUE_PROP =
  "Une qualité internationale à un prix accessible aux entreprises";

/** Détecte un libellé « tarif » (FCFA, montants) pour le remplacer côté UI. */
export function looksLikePriceLabel(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /\d[\d\s.,]*\s*(fcfa|€|\$|eur)/i.test(text) || /^\d[\d\s.,]+(\s*ht)?$/i.test(text.trim());
}

export function resolveServiceValueBadge(startingFrom: string | null | undefined): string {
  const raw = startingFrom?.trim() ?? "";
  if (!raw || looksLikePriceLabel(raw)) return SITE_VALUE_PROP;
  return raw;
}
