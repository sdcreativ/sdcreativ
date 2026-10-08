/**
 * Mentions du papier à en-tête (pur, utilisable côté client) : valeurs du modèle Word et
 * résolution depuis les Paramètres du site. Le rendu HTML/PDF est dans `@/lib/billing/letterhead`.
 */
export type LetterheadInfo = {
  tagline: string;
  website: string;
  email: string;
  phones: string[];
  legalName: string;
  /** Forme juridique et capital, ex. « SARL au capital de 1 000 000 F CFA ». */
  legalForm: string;
  headOffice: string;
  rccm: string;
  idu: string;
  /** Compte contribuable : affiché dans le corps des documents (le pied du modèle ne le prévoit pas). */
  ncc: string;
};

/** Valeurs du modèle Word : utilisées tant que les Paramètres du site ne les remplacent pas. */
export const LETTERHEAD: Readonly<LetterheadInfo> = {
  tagline: "SOLUTIONS DIGITALES • WEB • CLOUD • IA",
  website: "www.sdcreativ.com",
  email: "contact@sdcreativ.com",
  phones: ["+225 0565911347", "+225 0768704858"],
  legalName: "SDCREATIV",
  legalForm: "SARL au capital de 1 000 000 F CFA",
  headOffice: "Abidjan Cocody Angré, 22ème arrondissement SICOGI, LGT 344, Côte d’Ivoire",
  rccm: "CI-ABJ-03-2026-B12-06135",
  idu: "CI-2026-0074317 R",
  ncc: "",
};

/** Champs des Paramètres du site (crm_settings.site_public) qui alimentent le papier à en-tête. */
export type LetterheadSettingsSource = Partial<{
  letterheadTagline: string;
  letterheadWebsite: string;
  letterheadEmail: string;
  letterheadPhone: string;
  letterheadPhone2: string;
  legalName: string;
  legalForm: string;
  headOffice: string;
  rccm: string;
  idu: string;
  ncc: string;
}>;

/** Réglages admin → papier à en-tête ; un champ vide reprend la valeur du modèle. */
export function resolveLetterhead(source: LetterheadSettingsSource | null | undefined): LetterheadInfo {
  const pick = (value: string | undefined, fallback: string) => value?.trim() || fallback;
  const phones = [source?.letterheadPhone, source?.letterheadPhone2]
    .map((p) => p?.trim() ?? "")
    .filter(Boolean);
  return {
    tagline: pick(source?.letterheadTagline, LETTERHEAD.tagline),
    website: pick(source?.letterheadWebsite, LETTERHEAD.website),
    email: pick(source?.letterheadEmail, LETTERHEAD.email),
    phones: phones.length ? phones : [...LETTERHEAD.phones],
    legalName: pick(source?.legalName, LETTERHEAD.legalName),
    legalForm: pick(source?.legalForm, LETTERHEAD.legalForm).replace(/^•\s*/, ""),
    headOffice: pick(source?.headOffice, LETTERHEAD.headOffice),
    rccm: pick(source?.rccm, LETTERHEAD.rccm),
    idu: pick(source?.idu, LETTERHEAD.idu),
    ncc: source?.ncc?.trim() ?? "",
  };
}
