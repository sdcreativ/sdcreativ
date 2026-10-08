import { z } from "zod";

/** Popup de capture (façon Mailchimp) — partagé admin / site public (aucun accès base ici). */
export const POPUP_LAYOUTS = ["modal", "slide"] as const;
export const POPUP_AUDIENCES = ["all", "new", "returning"] as const;
export const POPUP_VARIANTS = ["primary", "accent"] as const;

/** Types de projet proposés à l'étape 2 du formulaire. */
export const POPUP_PROJECT_TYPES = [
  "Site vitrine",
  "Site e-commerce",
  "Refonte de site",
  "Référencement (SEO)",
  "Autre",
] as const;

/** Pages où un popup n'apparaît jamais (espaces privés, outils internes). */
export const POPUP_FORBIDDEN_PREFIXES = ["/admin", "/espace-client", "/espace-equipe", "/espace-prestataire", "/presentation", "/c/", "/promo/", "/rsvp/", "/verifier/"];

const pathList = z
  .array(z.string().trim().regex(/^\/[A-Za-z0-9/_-]*$/, "Chemin invalide (ex. /tarifs)."))
  .max(30);

const popupFields = z.object({
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
  locale: z.enum(["fr", "en"]),
  layout: z.enum(POPUP_LAYOUTS),
  variant: z.enum(POPUP_VARIANTS),
  eyebrow: z.string().trim().max(80),
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().max(600),
  offerLabel: z.string().trim().min(2).max(120),
  ctaLabel: z.string().trim().min(2).max(60),
  successTitle: z.string().trim().min(2).max(140),
  successBody: z.string().trim().max(600),
  consentText: z.string().trim().min(10).max(400),
  askPhone: z.boolean(),
  askProject: z.boolean(),
  codePrefix: z.string().trim().regex(/^[A-Z0-9]{2,12}$/, "Préfixe : 2 à 12 majuscules ou chiffres."),
  codeValidDays: z.number().int().min(1).max(365),
  triggerDelaySeconds: z.number().int().min(0).max(600).nullable(),
  triggerScrollPercent: z.number().int().min(5).max(100).nullable(),
  triggerExitIntent: z.boolean(),
  showOnMobile: z.boolean(),
  audience: z.enum(POPUP_AUDIENCES),
  includePaths: pathList,
  excludePaths: pathList,
  frequencyDays: z.number().int().min(0).max(365),
  sortOrder: z.number().int().min(0).max(999),
});

export const createSitePopupSchema = popupFields
  .partial()
  .required({ name: true, title: true, offerLabel: true, ctaLabel: true, successTitle: true, consentText: true });
/** PATCH partiel : aucune valeur par défaut réinjectée. */
export const updateSitePopupSchema = popupFields.partial();

export type SitePopupInput = z.infer<typeof popupFields>;

export type SitePopup = SitePopupInput & {
  id: string;
  impressions: number;
  closes: number;
  signups: number;
  createdAt: string;
  updatedAt: string;
};

/** Ce que le site public reçoit (sans statistiques). */
export type PublicSitePopup = Omit<SitePopup, "impressions" | "closes" | "signups" | "createdAt" | "updatedAt" | "name" | "sortOrder" | "isActive" | "codePrefix" | "includePaths" | "excludePaths">;

export const DEFAULT_SITE_POPUP: SitePopupInput = {
  name: "Nouveau popup",
  isActive: false,
  locale: "fr",
  layout: "modal",
  variant: "primary",
  eyebrow: "Offre réservée",
  title: "Votre site pro, avec 3 mois de maintenance en plus",
  body: "Recevez votre code personnel, valable 30 jours.",
  offerLabel: "3 mois de maintenance offerts",
  ctaLabel: "Recevoir mon code",
  successTitle: "Votre code est prêt !",
  successBody: "Nous vous l'avons aussi envoyé par e-mail.",
  consentText:
    "J'accepte que SD CREATIV utilise mes coordonnées pour m'envoyer mon code et des offres. Désinscription possible à tout moment.",
  askPhone: true,
  askProject: true,
  codePrefix: "SDC",
  codeValidDays: 30,
  triggerDelaySeconds: 30,
  triggerScrollPercent: 50,
  triggerExitIntent: true,
  showOnMobile: true,
  audience: "all",
  includePaths: [],
  excludePaths: ["/devis", "/contact", "/en/devis", "/en/contact"],
  frequencyDays: 14,
  sortOrder: 0,
};

/** Correspondance de chemin par préfixe (« /tarifs » couvre « /tarifs » et « /tarifs/… »). */
function matchesPrefix(path: string, prefix: string): boolean {
  if (prefix === "/") return path === "/";
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Le popup peut-il s'afficher sur cette page ? (pages interdites, inclusions, exclusions) */
export function popupMatchesPath(popup: Pick<SitePopupInput, "includePaths" | "excludePaths">, path: string): boolean {
  if (POPUP_FORBIDDEN_PREFIXES.some((p) => path.startsWith(p))) return false;
  if (popup.excludePaths.some((p) => matchesPrefix(path, p))) return false;
  if (popup.includePaths.length === 0) return true;
  return popup.includePaths.some((p) => matchesPrefix(path, p));
}

/** Audience : nouveau visiteur (1re visite) ou visiteur qui revient. */
export function popupMatchesAudience(audience: SitePopupInput["audience"], visitCount: number): boolean {
  if (audience === "new") return visitCount <= 1;
  if (audience === "returning") return visitCount > 1;
  return true;
}

/** Fréquence : jamais après inscription ; sinon au plus une fois tous les `frequencyDays` jours. */
export function popupAllowedByFrequency(
  state: { lastShownAt?: number; signedUp?: boolean } | null,
  frequencyDays: number,
  now: number = Date.now(),
): boolean {
  if (!state) return true;
  if (state.signedUp) return false;
  if (!state.lastShownAt) return true;
  return now - state.lastShownAt >= frequencyDays * 86_400_000;
}

/** Alphabet sans caractères ambigus (0/O, 1/I/L) pour un code facile à dicter au téléphone. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Code personnel : PRÉFIXE-PRÉNOM(3)-XXXX, ex. SDC-AWA-7K2Q. `randomBytes` injectable pour les tests. */
export function generatePopupCode(prefix: string, name: string, randomBytes: Uint8Array): string {
  const initials =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3) || "WEB";
  const suffix = Array.from(randomBytes.slice(0, 4), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${prefix}-${initials}-${suffix}`;
}

export const POPUP_CODE_PATTERN = /^[A-Z0-9]{2,12}-[A-Z]{1,3}-[A-Z0-9]{4}$/;

/** Inscription depuis le popup (site public). */
export const popupSignupSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre prénom.").max(120),
  email: z.string().trim().email("Adresse e-mail invalide.").max(255),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+0-9 ().-]*$/, "Numéro invalide.")
    .optional()
    .transform((v) => v || undefined),
  projectType: z.enum(POPUP_PROJECT_TYPES).optional(),
  consent: z.literal(true, { message: "Merci d'accepter pour recevoir votre code." }),
  pagePath: z.string().trim().max(300).optional(),
});

export const popupEventSchema = z.object({ type: z.enum(["impression", "close"]) });
