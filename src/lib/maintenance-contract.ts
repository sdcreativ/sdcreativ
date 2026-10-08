import { z } from "zod";
import { maintenancePlans } from "@/content/maintenance-plans";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import { SUBSCRIPTION_INTERVALS, type SubscriptionInterval } from "@/content/subscriptions-labels";
import { addMonths, applyBenefitToLines } from "@/lib/client-benefits-types";

/**
 * Contrat de maintenance (pur, sans accès base) : conditions saisies dans le CRM, clauses du document
 * et abonnement de facturation qui en découle. Stocké dans `crm_contracts.metadata.maintenance`.
 */
export const MAINTENANCE_LEVELS = ["essentiel", "professionnel", "premium"] as const;
export type MaintenanceLevel = (typeof MAINTENANCE_LEVELS)[number];

export const MAINTENANCE_INTERVAL_LABELS: Record<SubscriptionInterval, { adjective: string; per: string }> = {
  monthly: { adjective: "mensuelle", per: "mois" },
  yearly: { adjective: "annuelle", per: "an" },
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ.");

/** Avantage promis au client (ex. code popup -50 % la 2ᵉ année), figé dans le contrat à sa création. */
export const maintenanceBenefitSchema = z.object({
  promoCode: z.string().trim().min(2).max(40),
  percent: z.number().min(1).max(100),
  startsOn: isoDate,
  endsOn: isoDate,
});

export const maintenanceTermsSchema = z.object({
  level: z.enum(MAINTENANCE_LEVELS),
  siteName: z.string().trim().min(2, "Indiquez le site concerné.").max(200),
  siteUrl: z.string().trim().max(300).nullable().optional(),
  /** Mois de maintenance compris dans le prix de création du site (12 pour toutes les formules). */
  includedMonths: z.number().int().min(0).max(36),
  /** Rythme choisi par le client à partir de la période payante. */
  billingInterval: z.enum(SUBSCRIPTION_INTERVALS),
  /** Prix HT (FCFA) par période : par mois ou par an selon `billingInterval`. */
  priceHt: z.number().int().min(1, "Indiquez le prix de la maintenance."),
  vatRate: z.number().min(0).max(100),
  noticeDays: z.number().int().min(0).max(180),
  benefit: maintenanceBenefitSchema.nullable().optional(),
  /** Abonnement de facturation créé à la signature. */
  subscriptionId: z.string().uuid().nullable().optional(),
});
export type MaintenanceTerms = z.infer<typeof maintenanceTermsSchema>;

/** Saisie admin : l'avantage et l'abonnement sont renseignés par le serveur, jamais par le formulaire. */
export const maintenanceTermsInputSchema = maintenanceTermsSchema.omit({ benefit: true, subscriptionId: true });
export type MaintenanceTermsInput = z.infer<typeof maintenanceTermsInputSchema>;

export const DEFAULT_MAINTENANCE_TERMS: Omit<MaintenanceTermsInput, "siteName" | "priceHt"> = {
  level: "essentiel",
  siteUrl: null,
  includedMonths: 12,
  billingInterval: "yearly",
  vatRate: 18,
  noticeDays: 30,
};

/** Conditions de maintenance d'un contrat, ou null pour un contrat classique. */
export function readMaintenanceTerms(metadata: Record<string, unknown> | null | undefined): MaintenanceTerms | null {
  const parsed = maintenanceTermsSchema.safeParse(metadata?.maintenance);
  return parsed.success ? parsed.data : null;
}

export function maintenanceLevel(level: MaintenanceLevel) {
  const plan = maintenancePlans.find((p) => p.id === level) ?? maintenancePlans[0]!;
  return plan;
}

export function ttcFromHt(amountHt: number, vatRate: number): number {
  return Math.round((amountHt * (100 + vatRate)) / 100);
}

/** Calendrier : période incluse puis première échéance payante. */
export function maintenanceSchedule(terms: Pick<MaintenanceTerms, "includedMonths">, startDate: string) {
  return { startDate, paidFrom: addMonths(startDate, terms.includedMonths) };
}

/** Prix d'une période (HT / TTC), et prix remisé si un avantage est figé au contrat. */
export function maintenancePricing(terms: Pick<MaintenanceTerms, "priceHt" | "vatRate" | "benefit">) {
  const ttc = ttcFromHt(terms.priceHt, terms.vatRate);
  if (!terms.benefit) return { ht: terms.priceHt, ttc, discountedHt: null, discountedTtc: null };
  const [line] = applyBenefitToLines([{ label: "", amount: terms.priceHt }], terms.benefit.percent, "").lines;
  return { ht: terms.priceHt, ttc, discountedHt: line!.amount, discountedTtc: ttcFromHt(line!.amount, terms.vatRate) };
}

/** Libellé de l'abonnement : contient « Maintenance » pour que les avantages promis s'appliquent. */
export function maintenanceSubscriptionTitle(terms: Pick<MaintenanceTerms, "level" | "siteName">): string {
  return `Maintenance ${maintenanceLevel(terms.level).name} — ${terms.siteName}`.slice(0, 200);
}

/** « 2027-10-08 » → « 8 octobre 2027 » (sans décalage de fuseau). */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

export type ContractClause = { title: string; paragraphs: string[]; bullets?: string[] };

/** Clauses du contrat de maintenance (texte brut, échappé au rendu). */
export function buildMaintenanceClauses(
  terms: MaintenanceTerms,
  ctx: { startDate: string; clientName: string },
): ContractClause[] {
  const plan = maintenanceLevel(terms.level);
  const { paidFrom } = maintenanceSchedule(terms, ctx.startDate);
  const interval = MAINTENANCE_INTERVAL_LABELS[terms.billingInterval];
  const price = maintenancePricing(terms);
  const money = (n: number) => formatInvoiceAmount(n);
  const site = terms.siteUrl ? `« ${terms.siteName} » (${terms.siteUrl})` : `« ${terms.siteName} »`;

  const clauses: ContractClause[] = [
    {
      title: "Objet",
      paragraphs: [
        `Le présent contrat a pour objet la maintenance du site internet ${site}, réalisé par SD CREATIV pour ${ctx.clientName} (le « Client »), selon le niveau de service « ${plan.name} » décrit ci-après.`,
      ],
    },
    {
      title: "Durée et période incluse",
      paragraphs: [
        terms.includedMonths > 0
          ? `Le contrat prend effet le ${formatDateLong(ctx.startDate)}. Les ${terms.includedMonths} premiers mois de maintenance sont compris dans le prix de création du site et ne donnent lieu à aucune facturation, jusqu'au ${formatDateLong(paidFrom)}.`
          : `Le contrat prend effet le ${formatDateLong(ctx.startDate)}.`,
        `À compter du ${formatDateLong(paidFrom)}, la maintenance se poursuit par périodes ${terms.billingInterval === "monthly" ? "mensuelles" : "annuelles"} successives, renouvelées tacitement, sauf résiliation dans les conditions de l'article « Résiliation ».`,
      ],
    },
    {
      title: "Prestations incluses",
      paragraphs: [
        `Niveau de service « ${plan.name} » (${plan.sla.toLowerCase()}) : délai de prise en charge de ${plan.responseTime} après signalement par le Client.`,
      ],
      // « Tout Essentiel + » (fiche commerciale) → formulation contractuelle.
      bullets: plan.features.map((f) =>
        f.replace(/^Tout (.+?) \+$/, "Toutes les prestations du niveau « $1 »").replace(/\*$/, ""),
      ),
    },
    {
      title: "Exclusions",
      paragraphs: [
        "Ne sont pas compris dans la maintenance et font l'objet d'un devis séparé : la refonte graphique, le développement de nouvelles fonctionnalités, la rédaction ou la saisie de contenus, ainsi que la remise en état après une intervention du Client ou d'un tiers non autorisé par SD CREATIV.",
        "L'hébergement et le nom de domaine ne sont pas compris : à partir de leur renouvellement, ils sont facturés directement au Client par l'hébergeur (Hostinger), sans intermédiation de SD CREATIV.",
      ],
    },
    {
      title: "Prix et facturation",
      paragraphs: [
        `À compter du ${formatDateLong(paidFrom)}, la maintenance est facturée ${money(price.ht)} HT par ${interval.per}, soit ${money(price.ttc)} TTC (TVA ${terms.vatRate} %).`,
        `Le Client a choisi une facturation ${interval.adjective}, émise au début de chaque période. Il peut passer d'un rythme mensuel à annuel, ou inversement, à chaque date anniversaire sur simple demande écrite.`,
        "Les factures sont payables sous quinze (15) jours à réception, par virement, Mobile Money ou carte bancaire. Après mise en demeure restée sans effet pendant quinze (15) jours, SD CREATIV peut suspendre ses interventions jusqu'au paiement.",
        "Le prix peut être révisé une fois par an, à la date anniversaire, après information du Client au moins soixante (60) jours à l'avance.",
      ],
    },
  ];

  if (terms.benefit && price.discountedHt != null && price.discountedTtc != null) {
    clauses.push({
      title: "Avantage accordé",
      paragraphs: [
        `En application de l'offre « ${terms.benefit.promoCode} », le Client bénéficie d'une remise de ${terms.benefit.percent} % sur la maintenance du ${formatDateLong(terms.benefit.startsOn)} au ${formatDateLong(terms.benefit.endsOn)}, soit ${money(price.discountedHt)} HT (${money(price.discountedTtc)} TTC) par ${interval.per} sur cette période.`,
        "La remise est appliquée automatiquement sur chaque facture de la période et y est mentionnée avec le code de l'offre.",
      ],
    });
  }

  clauses.push(
    {
      title: "Obligations du Client",
      paragraphs: [
        "Le Client fournit les accès nécessaires aux interventions, signale tout dysfonctionnement par écrit (e-mail ou espace client) et informe SD CREATIV avant toute modification du site réalisée par lui-même ou par un tiers.",
      ],
    },
    {
      title: "Responsabilité",
      paragraphs: [
        "SD CREATIV est tenue d'une obligation de moyens. Elle n'est pas responsable des interruptions imputables à l'hébergeur, aux réseaux, à un cas de force majeure ou à une intervention non autorisée sur le site.",
        "Sa responsabilité est limitée, toutes causes confondues, aux sommes payées par le Client au titre du présent contrat au cours des douze (12) derniers mois.",
      ],
    },
    {
      title: "Résiliation",
      paragraphs: [
        `Chaque partie peut mettre fin au contrat à l'échéance de la période en cours, par écrit (e-mail avec accusé de réception ou lettre), en respectant un préavis de ${terms.noticeDays} jours. La période incluse ne donne lieu à aucun remboursement.`,
        "En cas de manquement grave de l'une des parties, l'autre peut résilier le contrat après mise en demeure restée sans effet pendant quinze (15) jours.",
      ],
    },
    {
      title: "Confidentialité et données personnelles",
      paragraphs: [
        "SD CREATIV traite les données auxquelles elle accède uniquement pour l'exécution du contrat, conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, et en garantit la confidentialité.",
      ],
    },
    {
      title: "Droit applicable et litiges",
      paragraphs: [
        "Le contrat est régi par le droit ivoirien et les Actes uniformes de l'OHADA. Les parties recherchent d'abord une solution amiable ; à défaut, le litige est porté devant le Tribunal de commerce d'Abidjan.",
      ],
    },
  );

  return clauses;
}
