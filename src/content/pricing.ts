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

export const pricingReassurance = [
  { label: "15-30 Jours", description: "Délai de livraison moyen" },
  { label: "100% Sites responsive", description: "Mobile, tablette, desktop" },
  { label: "Support", description: "Après livraison" },
  { label: "Objectif Visibilité", description: "Visibilité + conversion" },
] as const;
