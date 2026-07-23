export type MaintenancePlan = {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  sla: string;
  responseTime: string;
  features: string[];
  highlighted?: boolean;
};

export type SlaComparisonRow = {
  label: string;
  essentiel: string;
  professionnel: string;
  premium: string;
};

export const maintenancePlans: MaintenancePlan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Sérénité au quotidien.",
    priceMonthly: 0,
    priceAnnual: 0,
    sla: "Standard",
    responseTime: "48h ouvrées",
    features: [
      "Sauvegardes hebdomadaires",
      "Mises à jour CMS & plugins",
      "Monitoring uptime",
      "Assistance email",
      "1 intervention/mois incluse",
    ],
  },
  {
    id: "professionnel",
    name: "Professionnel",
    tagline: "Pour les sites actifs.",
    priceMonthly: 0,
    priceAnnual: 0,
    sla: "Prioritaire",
    responseTime: "24h ouvrées",
    highlighted: true,
    features: [
      "Tout Essentiel +",
      "Sauvegardes quotidiennes",
      "Mises à jour prioritaires",
      "Support WhatsApp",
      "3 interventions/mois incluses",
      "Rapport mensuel performance",
    ],
  },
  {
    id: "premium",
    name: "Premium SLA",
    tagline: "Réactivité maximale.",
    priceMonthly: 0,
    priceAnnual: 0,
    sla: "Premium",
    responseTime: "4h ouvrées",
    features: [
      "Tout Professionnel +",
      "SLA réponse sous 4h",
      "Monitoring 24/7 + alertes",
      "Support téléphone direct",
      "Interventions illimitées*",
      "Évolutions mineures incluses",
      "Account manager dédié",
    ],
  },
];

export const slaComparison: SlaComparisonRow[] = [
  {
    label: "Délai de réponse",
    essentiel: "48h ouvrées",
    professionnel: "24h ouvrées",
    premium: "4h ouvrées",
  },
  {
    label: "Sauvegardes",
    essentiel: "Hebdomadaires",
    professionnel: "Quotidiennes",
    premium: "Quotidiennes + rétention 30j",
  },
  {
    label: "Canal support",
    essentiel: "Email",
    professionnel: "Email + WhatsApp",
    premium: "Email + WhatsApp + Téléphone",
  },
  {
    label: "Interventions/mois",
    essentiel: "1 incluse",
    professionnel: "3 incluses",
    premium: "Illimitées*",
  },
  {
    label: "Rapport performance",
    essentiel: "—",
    professionnel: "Mensuel",
    premium: "Mensuel + recommandations",
  },
  {
    label: "Uptime garanti",
    essentiel: "—",
    professionnel: "99,5 %",
    premium: "99,9 %",
  },
];

export const maintenanceFaq = [
  {
    question: "Puis-je payer mensuellement ou annuellement ?",
    answer:
      "Oui, les deux options sont disponibles. L'abonnement annuel inclut en général l'équivalent de 2 mois offerts — le détail figure sur votre devis personnalisé.",
  },
  {
    question: "Que couvre une intervention ?",
    answer:
      "Correction de bug, mise à jour de contenu simple, ajustement CSS, configuration plugin. Les évolutions majeures (nouvelles pages, refonte) font l'objet d'un devis séparé.",
  },
  {
    question: "Travaillez-vous sur des sites que vous n'avez pas créés ?",
    answer:
      "Oui, nous proposons la maintenance pour tout site WordPress, Next.js ou autre stack que nous auditons au préalable. Commencez par un audit gratuit.",
  },
  {
    question: "Que signifie « interventions illimitées* » ?",
    answer:
      "Interventions de maintenance courante sans limite mensuelle, dans le cadre du périmètre SLA. Les développements substantiels restent facturés séparément.",
  },
] as const;

export const maintenanceNote =
  "* Interventions de maintenance courante dans le cadre du SLA. Développements majeurs sur devis.";
