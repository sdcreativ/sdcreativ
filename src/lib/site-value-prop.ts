/** Proposition de valeur affichée à la place des prix sur le site public. */
export const SITE_VALUE_PROP =
  "Des résultats marketing accessibles aux PME — pas seulement de la technique";

export const SITE_VALUE_PROP_EN =
  "Marketing results accessible to SMEs — not just technology";

/** Détecte un libellé « tarif » (FCFA, montants) pour le remplacer côté UI. */
export function looksLikePriceLabel(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /\d[\d\s.,]*\s*(fcfa|€|\$|eur)/i.test(text) || /^\d[\d\s.,]+(\s*ht)?$/i.test(text.trim());
}

export function resolveServiceValueBadge(
  startingFrom: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const raw = startingFrom?.trim() ?? "";
  const fallback = locale === "en" ? SITE_VALUE_PROP_EN : SITE_VALUE_PROP;
  if (!raw || looksLikePriceLabel(raw)) return fallback;
  return raw;
}
