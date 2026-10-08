import type { PricingPlan, PricingTaxMention } from "@/content/pricing";
import { SUGGESTED_RATES_TO_XOF } from "@/lib/currencies";
import { PRICE_ON_REQUEST_LABEL, PRICE_ON_REQUEST_LABEL_EN } from "@/lib/format";

export type PlanPriceDisplay =
  | {
      kind: "amount";
      /** « À partir de » / « From » — uniquement en mode `from`. */
      prefix: string | null;
      /** Montant formaté avec séparateurs français (ex. « 287 000 »). */
      amount: string;
      /** Prix avant remise formaté, à afficher barré (null sans remise). */
      compareAt: string | null;
      /** Économie formatée (prix barré − prix final), null sans remise. */
      savings: string | null;
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
  plan: Pick<PricingPlan, "priceMode" | "priceAmount" | "currencyLabel" | "currencyCode" | "taxMention" | "priceNote"> &
    Partial<Pick<PricingPlan, "compareAtAmount">>,
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
    compareAt: plan.compareAtAmount != null && plan.compareAtAmount > amount ? formatPlanAmount(plan.compareAtAmount) : null,
    savings:
      plan.compareAtAmount != null && plan.compareAtAmount > amount
        ? formatPlanAmount(plan.compareAtAmount - amount)
        : null,
    suffix: [currency, TAX_LABELS[plan.taxMention]].filter(Boolean).join(" "),
    note,
  };
}

/** Charge HT ajoutée au prix de base d'une formule (licence, hébergement…) — admin uniquement. */
export type PricingCharge = { id: string; label: string; amount: number };

/** Ligne de calcul : une charge, ou l'hébergement parrainé avec sa remise (montant ou %). */
export type PricingChargeInput = { amount: number; discountPercent?: number; discountAmount?: number };

/** Taux de TVA par défaut (UEMOA / Côte d'Ivoire) si aucun réglage en base. */
export const DEFAULT_PRICING_VAT_RATE = 18;

/** Lien de parrainage Hostinger SD CREATIV (nouveau compte client). */
export const DEFAULT_PRICING_REFERRAL_URL = "https://www.hostinger.com/fr?REFERRALCODE=BMJAGENCEZMT";
/**
 * Mention sous l'avantage hébergement ({pourcentage} = remise totale calculée, si utilisé).
 * Seuls 20 % viennent du parrainage, le reste est la promo publique Hostinger : on le dit.
 */
export const DEFAULT_PRICING_REFERRAL_NOTE = "Tarif promo Hostinger + 20 % de remise parrainage SD CREATIV";
/** Valeur du paramètre `offre` transmis au devis quand la remise parrainage s'applique. */
export const PRICING_REFERRAL_OFFER = "parrainage-hebergement";

export function formatReferralNote(note: string, percent: number): string {
  return note.replaceAll("{pourcentage}", percent.toLocaleString("fr-FR")).trim();
}

/**
 * Lien du bouton d'une carte : ajoute `formule` (et `offre` si remise) aux destinations internes,
 * en conservant les paramètres existants (ex. ?type=e-commerce). Liens externes et ancres inchangés.
 */
export function buildPlanCtaHref(href: string, planSlug: string, withOffer: boolean): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathAndQuery = "", hash] = href.split("#", 2);
  const [path = "", query = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("formule", planSlug);
  if (withOffer) params.set("offre", PRICING_REFERRAL_OFFER);
  else params.delete("offre");
  return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

/**
 * Hébergement Hostinger 1 an, prix HT relevés au panier : normal (Pack Premium 143,88 € + domaine
 * 6,99 €) et payé avec le lien de parrainage. Seul poste concerné par la remise.
 */
export const DEFAULT_PRICING_HOSTING_EUR = 150.87;
/** Relevé en Côte d'Ivoire : promo 35,88 € − parrainage 20 % = 28,70 € (taxes 0 €). */
export const DEFAULT_PRICING_HOSTING_REFERRAL_EUR = 28.7;
/** Renouvellement Hostinger après 12 mois : 9,99 €/mois × 12 (HT). */
export const DEFAULT_PRICING_HOSTING_RENEWAL_EUR = 119.88;
/** Date du relevé des prix Hostinger (AAAA-MM-JJ). */
export const DEFAULT_PRICING_HOSTING_CHECKED_ON = "2026-10-07";
/** Au-delà, l'admin invite à revérifier les prix Hostinger (promos fréquentes). */
export const PRICING_HOSTING_CHECK_MAX_DAYS = 60;

/** Jours écoulés depuis le relevé des prix (null si date invalide). */
export function daysSinceHostingCheck(checkedOn: string, now: Date = new Date()): number | null {
  const date = new Date(`${checkedOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

/** Renouvellement annuel du nom de domaine .com (catalogue Hostinger : 16,99 €). */
export const DEFAULT_PRICING_DOMAIN_RENEWAL_EUR = 16.99;
/** Valeur HT du nom de domaine offert la 1re année (panier Hostinger : 6,99 €). */
export const DEFAULT_PRICING_DOMAIN_EUR = 6.99;
/** Remise parrainage Hostinger (nouveaux clients, 1re commande, 12 / 24 / 48 mois). */
export const DEFAULT_PRICING_REFERRAL_PERCENT = 20;
/** Durées d'hébergement proposées dans les formules (mois). */
export const HOSTING_MONTH_OPTIONS = [12, 24, 48] as const;

/** Prix d'un pack Hostinger pour une durée, issus de l'API (centimes HT, prix appliqués). */
export type HostingCatalogEntry = {
  packId: string;
  packName: string;
  months: number;
  currency: string;
  /** Prix promo de la 1re période (avant parrainage). */
  promoCents: number;
  /** Prix de renouvellement de la période. */
  renewalCents: number;
  /** Prix « normal » barré : tarif mensuel × durée. */
  listCents: number;
  /** Nouveaux prix relevés par la synchro, en attente de validation (null si identiques). */
  pending: { promoCents: number; renewalCents: number; listCents: number } | null;
};

/** Hébergement résolu pour une formule : prix HT en euros + durée. */
export type ResolvedHosting = {
  source: "catalog" | "manual";
  packName: string | null;
  months: number;
  normalEur: number;
  paidEur: number;
  /** Renouvellement ramené à l'année (HT, €). */
  renewalEurPerYear: number;
};

const cents = (value: number) => Math.round(value) / 100;

/**
 * Hébergement d'une formule : pack + durée du catalogue Hostinger (prix appliqués) si choisis
 * et disponibles, sinon les prix manuels des réglages (12 mois). Parrainage = promo × (1 − %).
 */
export function resolvePlanHosting(
  plan: { includeHosting: boolean; hostingPackId?: string | null; hostingMonths?: number | null },
  settings: {
    hostingEur: number;
    hostingReferralEur: number;
    hostingRenewalEur: number;
    domainEur?: number;
    referralPercent?: number;
  },
  catalog: HostingCatalogEntry[] = [],
): ResolvedHosting | null {
  if (!plan.includeHosting) return null;
  const entry = plan.hostingPackId
    ? catalog.find((c) => c.packId === plan.hostingPackId && c.months === (plan.hostingMonths ?? 12))
    : undefined;
  if (entry) {
    const percent = settings.referralPercent ?? DEFAULT_PRICING_REFERRAL_PERCENT;
    const domainCents = Math.round((settings.domainEur ?? DEFAULT_PRICING_DOMAIN_EUR) * 100);
    return {
      source: "catalog",
      packName: entry.packName,
      months: entry.months,
      normalEur: cents(entry.listCents + domainCents),
      paidEur: cents(Math.round((entry.promoCents * (10000 - toBp(percent))) / 10000)),
      renewalEurPerYear: cents((entry.renewalCents * 12) / entry.months),
    };
  }
  return {
    source: "manual",
    packName: null,
    months: 12,
    normalEur: settings.hostingEur,
    paidEur: settings.hostingReferralEur,
    renewalEurPerYear: settings.hostingRenewalEur,
  };
}

/**
 * Coût annuel du renouvellement payé par le client, en FCFA : hébergement + nom de domaine,
 * facturés directement par Hostinger (aucune TVA SD CREATIV, pas de taxe Hostinger en Côte d'Ivoire).
 */
export function renewalXofPerYear(hostingRenewalEurPerYear: number, domainRenewalEur: number): number {
  return eurToXof(Math.round((hostingRenewalEurPerYear + domainRenewalEur) * 100) / 100);
}

/** Année à partir de laquelle le renouvellement s'applique (12 mois → 2e, 24 → 3e, 48 → 5e). */
export function renewalFromYear(months: number): number {
  return Math.floor(months / 12) + 1;
}

/** Montant HT en euros → TTC en FCFA (parité fixe puis TVA), arrondi au franc. */
export function eurHtToXofTtc(eur: number, vatRate: number): number {
  return computePlanTtc(eurToXof(eur), [], vatRate).totalTtc;
}

/** Parité fixe FCFA (XOF) / euro. */
const EUR_TO_XOF = SUGGESTED_RATES_TO_XOF.EUR;

/** Convertit un montant en euros en FCFA (parité fixe 655,957), arrondi au franc. */
export function eurToXof(eur: number): number {
  return Math.round((Math.round(eur * 100) * EUR_TO_XOF) / 100);
}

export type PlanTtcBreakdown = {
  baseHt: number;
  /** Charges HT avant remise. */
  chargesHt: number;
  /** Total des remises parrainage HT. */
  discountHt: number;
  /** Base + charges − remises. */
  subtotalHt: number;
  vatRate: number;
  vatAmount: number;
  totalTtc: number;
  /** TTC sans remise — prix barré quand discountHt > 0. */
  totalTtcBeforeDiscount: number;
};

/** Points de base (centièmes de %) pour calculer en entiers, sans erreur de flottant. */
const toBp = (percent: number) => Math.round(percent * 100);

/**
 * TTC = (base HT + charges HT − remises parrainage HT) × (1 + TVA).
 * Chaque remise s'applique à sa charge (ex. hébergement -20 %) ; arrondis au franc près.
 */
export function computePlanTtc(baseHt: number, charges: PricingChargeInput[], vatRate: number): PlanTtcBreakdown {
  const chargesHt = charges.reduce((sum, c) => sum + c.amount, 0);
  const discountHt = charges.reduce(
    (sum, c) =>
      sum +
      (c.discountAmount != null
        ? Math.min(Math.max(c.discountAmount, 0), c.amount)
        : Math.round((c.amount * Math.min(toBp(c.discountPercent ?? 0), 10000)) / 10000)),
    0,
  );
  const subtotalHt = baseHt + chargesHt - discountHt;
  const rateBp = toBp(vatRate);
  const withVat = (ht: number) => Math.round((ht * (10000 + rateBp)) / 10000);
  const totalTtc = withVat(subtotalHt);
  return {
    baseHt,
    chargesHt,
    discountHt,
    subtotalHt,
    vatRate: rateBp / 100,
    vatAmount: totalTtc - subtotalHt,
    totalTtc,
    totalTtcBeforeDiscount: withVat(baseHt + chargesHt),
  };
}

export type PlanPricingInput = {
  baseHt: number;
  charges: PricingChargeInput[];
  includeHosting: boolean;
  /** Prix normal HT (€) de l'hébergement 1 an. */
  hostingEur: number;
  /** Prix HT (€) payé avec le lien de parrainage. */
  hostingReferralEur: number;
  vatRate: number;
};

export type PlanPricingBreakdown = PlanTtcBreakdown & {
  /** Charges saisies, hors hébergement. */
  otherChargesHt: number;
  /** Hébergement 1 an au prix normal, en FCFA (0 si non inclus). */
  hostingHt: number;
  /** Hébergement 1 an au prix parrainage, en FCFA. */
  hostingPaidHt: number;
};

/** Prix TTC de l'hébergement sans / avec parrainage, pour l'affichage barré sous l'avantage. */
export function hostingTtcPrices(
  hostingEur: number,
  hostingReferralEur: number,
  vatRate: number,
): { before: number; after: number } {
  const normal = eurToXof(hostingEur);
  const paid = Math.min(eurToXof(hostingReferralEur), normal);
  return { before: computePlanTtc(normal, [], vatRate).totalTtc, after: computePlanTtc(paid, [], vatRate).totalTtc };
}

/** Remise de l'hébergement en % (arrondie), déduite des deux prix. */
export function hostingDiscountPercent(hostingEur: number, hostingReferralEur: number): number {
  const normal = eurToXof(hostingEur);
  if (normal <= 0) return 0;
  const paid = Math.min(eurToXof(hostingReferralEur), normal);
  return Math.round(((normal - paid) / normal) * 100);
}

/**
 * Calcul complet d'une formule : base + charges + hébergement Hostinger 1 an (remise
 * parrainage appliquée à l'hébergement seulement), puis TVA.
 */
export function computePlanPricing(input: PlanPricingInput): PlanPricingBreakdown {
  const hostingHt = input.includeHosting ? eurToXof(input.hostingEur) : 0;
  const hostingPaidHt = Math.min(input.includeHosting ? eurToXof(input.hostingReferralEur) : 0, hostingHt);
  const lines: PricingChargeInput[] = input.charges.map((c) => ({ amount: c.amount }));
  if (hostingHt > 0) lines.push({ amount: hostingHt, discountAmount: hostingHt - hostingPaidHt });
  const breakdown = computePlanTtc(input.baseHt, lines, input.vatRate);
  return { ...breakdown, otherChargesHt: breakdown.chargesHt - hostingHt, hostingHt, hostingPaidHt };
}

/** Base HT qui redonne (à l'arrondi près) un TTC donné — pré-remplissage au passage en calcul auto. */
export function baseHtFromTtc(ttc: number, vatRate: number): number {
  const estimate = Math.round((ttc * 10000) / (10000 + toBp(vatRate)));
  // Certains TTC ne sont pas atteignables au franc près (1 F HT = 1,18 F TTC) : on prend la base
  // dont le TTC est le plus proche, en privilégiant l'égalité exacte.
  const distance = (base: number) => Math.abs(computePlanTtc(base, [], vatRate).totalTtc - ttc);
  return [estimate, estimate - 1, estimate + 1].reduce((best, base) => (distance(base) < distance(best) ? base : best));
}

/** Destination de bouton acceptée : chemin interne, ancre ou URL https. */
export function isSafePlanCtaHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  if (value.startsWith("#")) return true;
  return /^https:\/\/[^\s/]+/i.test(value);
}
