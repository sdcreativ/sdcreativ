export type PricingPlan = {
  id: string;
  name: string;
  tagline: string;
  /** Prix de départ en FCFA (HT) — non affiché sur le site public. */
  priceFrom?: number;
  priceNote?: string;
  features: string[];
  highlighted?: boolean;
  variant: "primary" | "accent";
};

/** Formules sans montants publics — devis personnalisé. */
export const pricingPlans: PricingPlan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Pour démarrer.",
    priceNote: "Devis personnalisé gratuit",
    variant: "primary",
    features: [
      "Site vitrine professionnel (jusqu'à 5 pages)",
      "Design responsive",
      "Formulaire de contact",
      "SEO initial",
      "Intégration WhatsApp",
    ],
  },
  {
    id: "professionnel",
    name: "Professionnel",
    tagline: "Pour accélérer.",
    priceNote: "Devis personnalisé gratuit",
    variant: "primary",
    highlighted: true,
    features: [
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
    priceNote: "Devis personnalisé gratuit",
    variant: "accent",
    features: [
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
    priceNote: "Free custom quote",
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
    priceNote: "Free custom quote",
    variant: "primary",
    highlighted: true,
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
    priceNote: "Free custom quote",
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
