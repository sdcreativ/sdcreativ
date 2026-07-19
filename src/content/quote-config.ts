export type QuoteProjectType = {
  id: string;
  label: string;
  basePrice: number;
  supportsPages: boolean;
  defaultPages: number;
};

export type QuotePageTier = {
  id: string;
  label: string;
  minPages: number;
  maxPages: number;
  extraPrice: number;
};

export type QuoteAddon = {
  id: string;
  label: string;
  price: number;
  /** Si défini, option visible uniquement pour ces types de projet */
  forProjects?: string[];
};

export const quoteProjectTypes: QuoteProjectType[] = [
  { id: "site-vitrine", label: "Site vitrine", basePrice: 350_000, supportsPages: true, defaultPages: 5 },
  { id: "e-commerce", label: "E-commerce", basePrice: 1_800_000, supportsPages: false, defaultPages: 0 },
  { id: "refonte-web", label: "Refonte web", basePrice: 450_000, supportsPages: true, defaultPages: 5 },
  { id: "identite-visuelle", label: "Identité visuelle", basePrice: 200_000, supportsPages: false, defaultPages: 0 },
  { id: "seo-local", label: "SEO Local", basePrice: 150_000, supportsPages: false, defaultPages: 0 },
  { id: "maintenance", label: "Maintenance (forfait annuel)", basePrice: 480_000, supportsPages: false, defaultPages: 0 },
  { id: "agents-ia", label: "Agents IA", basePrice: 800_000, supportsPages: false, defaultPages: 0 },
  { id: "automatisation", label: "Automatisation", basePrice: 600_000, supportsPages: false, defaultPages: 0 },
  { id: "devops", label: "DevOps", basePrice: 700_000, supportsPages: false, defaultPages: 0 },
  { id: "cloud", label: "Cloud", basePrice: 500_000, supportsPages: false, defaultPages: 0 },
  { id: "applications-mobiles", label: "Applications mobiles", basePrice: 1_200_000, supportsPages: false, defaultPages: 0 },
  { id: "developpement-sur-mesure", label: "Développement sur mesure", basePrice: 1_500_000, supportsPages: false, defaultPages: 0 },
];

export const quotePageTiers: QuotePageTier[] = [
  { id: "1-5", label: "1 à 5 pages (inclus)", minPages: 1, maxPages: 5, extraPrice: 0 },
  { id: "6-10", label: "6 à 10 pages", minPages: 6, maxPages: 10, extraPrice: 200_000 },
  { id: "11-20", label: "11 à 20 pages", minPages: 11, maxPages: 20, extraPrice: 450_000 },
  { id: "20-plus", label: "Plus de 20 pages", minPages: 21, maxPages: 99, extraPrice: 750_000 },
];

export const quoteAddons: QuoteAddon[] = [
  { id: "blog", label: "Module blog", price: 150_000 },
  { id: "seo-avance", label: "SEO avancé", price: 200_000 },
  { id: "multilangue", label: "Site multilingue (FR/EN)", price: 250_000 },
  { id: "cms", label: "CMS autonome (gestion contenu)", price: 120_000 },
  {
    id: "mobile-money",
    label: "Paiement Mobile Money",
    price: 150_000,
    forProjects: ["e-commerce", "developpement-sur-mesure"],
  },
  { id: "whatsapp", label: "Intégration WhatsApp Business", price: 50_000 },
  { id: "formation", label: "Formation administration (2h)", price: 100_000 },
  { id: "maintenance-3mois", label: "Support prioritaire 3 mois", price: 180_000 },
  { id: "prise-rdv", label: "Module prise de rendez-vous en ligne", price: 120_000 },
  { id: "espace-client", label: "Espace client / portail", price: 350_000 },
  { id: "live-chat", label: "Live Chat conseiller", price: 80_000 },
  { id: "analytics-conversions", label: "Analytics & suivi conversions (GA4)", price: 90_000 },
  { id: "redaction-contenus", label: "Rédaction de contenus (pages clés)", price: 150_000 },
  { id: "pack-photo-video", label: "Pack photo / vidéo professionnel", price: 200_000 },
  {
    id: "hebergement-1an",
    label: "Hébergement & nom de domaine (1 an)",
    price: 120_000,
    forProjects: [
      "site-vitrine",
      "e-commerce",
      "refonte-web",
      "developpement-sur-mesure",
      "applications-mobiles",
    ],
  },
  { id: "securite-waf", label: "Sécurité renforcée (WAF, sauvegardes)", price: 100_000 },
  {
    id: "integrations-api-crm",
    label: "Intégrations API / CRM",
    price: 250_000,
    forProjects: [
      "e-commerce",
      "agents-ia",
      "automatisation",
      "developpement-sur-mesure",
      "applications-mobiles",
    ],
  },
  {
    id: "emailing",
    label: "Emailing transactionnel / newsletters",
    price: 130_000,
  },
  {
    id: "ui-ux-audit",
    label: "Audit & optimisation UI/UX",
    price: 180_000,
    forProjects: ["site-vitrine", "e-commerce", "refonte-web", "applications-mobiles"],
  },
  {
    id: "formation-equipe",
    label: "Formation équipe (demi-journée)",
    price: 200_000,
  },
];
