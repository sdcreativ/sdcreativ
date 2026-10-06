import type { LucideIconName } from "@/lib/lucide-icon-map";

/** fixed = montant exact · from = « À partir de » · quote = sur devis (aucun montant). */
export type PricingPriceMode = "fixed" | "from" | "quote";
export type PricingTaxMention = "ttc" | "ht" | "none";

/** Avantage inclus affiché dans le bloc coloré de la carte (hébergement, maintenance…). */
export type PricingPerk = {
  id: string;
  title: string;
  detail: string;
  icon: LucideIconName;
  isVisible: boolean;
  /** Le titre pointe vers le lien de parrainage réglé dans l'admin (rel="sponsored"). */
  referralLink?: boolean;
  /** Résolu à la lecture depuis `referralLink` — jamais saisi directement. */
  href?: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  tagline: string;
  priceMode: PricingPriceMode;
  /** Montant entier, sans séparateur ni devise (ignoré en mode « quote »). */
  priceAmount?: number;
  currencyCode: string;
  /** Libellé public de la devise, ex. « FCFA ». */
  currencyLabel: string;
  taxMention: PricingTaxMention;
  /** Prix avant remise (barré) — présent seulement s'il est supérieur au montant affiché. */
  compareAtAmount?: number;
  /** Pastille près du prix, ex. « Hébergement -20 % ». */
  discountLabel?: string;
  /** Texte complémentaire sous le prix (ou libellé « sur devis »). */
  priceNote?: string;
  features: string[];
  perks: PricingPerk[];
  highlighted?: boolean;
  badgeLabel?: string;
  variant: "primary" | "accent";
  ctaLabel: string;
  ctaHref: string;
};

const perksFr: PricingPerk[] = [
  { id: "hosting", title: "Hébergement + nom de domaine inclus", detail: "Pendant 1 an", icon: "Server", isVisible: true },
  {
    id: "maintenance",
    title: "Maintenance gratuite pendant 1 an",
    detail: "Payante à partir de la deuxième année",
    icon: "Settings",
    isVisible: true,
  },
];

const priceFr = { currencyCode: "XOF", currencyLabel: "FCFA", taxMention: "ttc" } as const;
const ctaFr = { ctaLabel: "Demander un devis", ctaHref: "/devis" } as const;
const quoteEn: Pick<
  PricingPlan,
  "priceMode" | "priceNote" | "currencyCode" | "currencyLabel" | "taxMention" | "perks" | "ctaLabel" | "ctaHref"
> = {
  priceMode: "quote",
  priceNote: "Free custom quote",
  currencyCode: "XOF",
  currencyLabel: "FCFA",
  taxMention: "none",
  perks: [],
  ctaLabel: "Get a quote",
  ctaHref: "/en/devis",
};

/** Catalogue code — repli si la base est vide, et source de « Importer depuis le code ». */
export const pricingPlans: PricingPlan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Pour démarrer.",
    priceMode: "from",
    priceAmount: 287000,
    ...priceFr,
    variant: "primary",
    perks: perksFr,
    ...ctaFr,
    features: [
      "Développé avec WordPress",
      "Développement sur mesure",
      "Site vitrine professionnel (jusqu'à 5 pages)",
      "Design responsive",
      "Formulaire de contact",
      "SEO initial",
    ],
  },
  {
    id: "professionnel",
    name: "Professionnel",
    tagline: "Pour accélérer.",
    priceMode: "fixed",
    priceAmount: 450000,
    ...priceFr,
    variant: "primary",
    highlighted: true,
    badgeLabel: "Populaire",
    perks: perksFr,
    ...ctaFr,
    features: [
      "Développé avec WordPress",
      "Développement sur mesure",
      "Plus de pages & sections",
      "Galerie & portfolio",
      "Module blog",
      "Sécurité renforcée",
      "Optimisation SEO avancée",
      "Support prioritaire 3 mois",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour vendre.",
    priceMode: "fixed",
    priceAmount: 790000,
    ...priceFr,
    variant: "accent",
    perks: perksFr,
    ...ctaFr,
    features: [
      "Développé avec WordPress",
      "Développement sur mesure",
      "Boutique e-commerce complète",
      "Catalogue produits",
      "Paiement en ligne (Mobile Money, carte)",
      "Gestion des commandes",
      "Accompagnement dédié",
      "Formation administration",
    ],
  },
];

export const pricingPlansEn: PricingPlan[] = [
  {
    id: "essentiel",
    name: "Essential",
    tagline: "To get started.",
    ...quoteEn,
    variant: "primary",
    features: [
      "Professional showcase site (up to 5 pages)",
      "Responsive design",
      "Contact form",
      "Initial SEO",
      "WhatsApp integration",
    ],
  },
  {
    id: "professionnel",
    name: "Professional",
    tagline: "To accelerate.",
    ...quoteEn,
    variant: "primary",
    highlighted: true,
    badgeLabel: "Popular",
    features: [
      "More pages & sections",
      "Gallery & portfolio",
      "Blog module",
      "Hardened security",
      "Advanced SEO optimization",
      "Priority support for 3 months",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "To sell online.",
    ...quoteEn,
    variant: "accent",
    features: [
      "Full e-commerce store",
      "Product catalog",
      "Online payments (Mobile Money, card)",
      "Order management",
      "Dedicated support",
      "Admin training",
    ],
  },
];

export const pricingReassurance = [
  { label: "15-30 Jours", description: "Délai de livraison moyen" },
  { label: "100% Sites responsive", description: "Mobile, tablette, desktop" },
  { label: "Support", description: "Après livraison" },
  { label: "Objectif Visibilité", description: "Visibilité + conversion" },
] as const;

export const pricingReassuranceEn = [
  { label: "15-30 days", description: "Average delivery time" },
  { label: "100% responsive", description: "Mobile, tablet, desktop" },
  { label: "Support", description: "After launch" },
  { label: "Visibility goal", description: "Visibility + conversion" },
] as const;
