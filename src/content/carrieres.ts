export type JobOffer = {
  id: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
};

export const jobOffers: JobOffer[] = [
  {
    id: "commercial-terrain-abidjan",
    title: "Commercial terrain — Abidjan",
    type: "CDI / Freelance",
    location: "Abidjan, Côte d'Ivoire",
    department: "Commercial",
    description:
      "Développez le portefeuille clients PME et entrepreneurs en prospection directe sur le terrain à Abidjan et en périphérie.",
    missions: [
      "Prospection physique (Cocody, Plateau, Marcory, Yopougon…)",
      "Présentation de l'offre SD CREATIV (sites web, IA, maintenance)",
      "Qualification des besoins et prise de RDV avec l'équipe projet",
      "Suivi des devis et relance commerciale",
      "Reporting hebdomadaire pipeline CRM",
    ],
    profile: [
      "Expérience commerciale B2B, idéalement secteur digital ou services",
      "Excellente communication orale en français",
      "Autonomie, rigueur et sens du résultat",
      "Permis B et mobilité sur Abidjan appréciés",
      "Réseau local PME / entrepreneurs : un plus",
    ],
  },
  {
    id: "commercial-terrain-interieur",
    title: "Commercial terrain — Intérieur du pays",
    type: "Freelance / Commission",
    location: "Bouaké, Yamoussoukro, San-Pédro…",
    department: "Commercial",
    description:
      "Représentez SD CREATIV dans les villes de l'intérieur et développez notre présence au-delà d'Abidjan.",
    missions: [
      "Prospection PME et institutions locales",
      "Organisation de rendez-vous visio avec l'équipe technique",
      "Animation de réseaux locaux (CCI, associations pro…)",
      "Suivi clients et upsell maintenance",
    ],
    profile: [
      "Connaissance du tissu économique local",
      "À l'aise avec WhatsApp et outils digitaux",
      "Motivation pour le développement commercial",
      "Disponibilité pour déplacements réguliers",
    ],
  },
  {
    id: "business-developer-diaspora",
    title: "Business Developer — Diaspora",
    type: "Freelance / Remote",
    location: "Remote (FR, US, CA…)",
    department: "Commercial",
    description:
      "Ciblez les entrepreneurs de la diaspora ivoirienne souhaitant lancer ou digitaliser leur activité au pays.",
    missions: [
      "Prospection LinkedIn, email et événements diaspora",
      "Présentation bilingue FR/EN de nos offres",
      "Coordination avec l'équipe Abidjan pour la livraison",
      "Génération de leads qualifiés pour le configurateur de devis",
    ],
    profile: [
      "Français et anglais courants",
      "Compréhension des enjeux diaspora ↔ CI",
      "Expérience vente de services ou SaaS",
      "Autonomie en télétravail",
    ],
  },
];

export const careerBenefits = [
  "Commissions attractives sur ventes conclues",
  "Formation produits (web, IA, maintenance)",
  "Outils CRM et configurateur de devis",
  "Marque en croissance sur le marché ivoirien",
  "Équipe technique basée à Abidjan",
] as const;

export function getJobOffer(id: string) {
  return jobOffers.find((job) => job.id === id);
}

export const jobSelectOptions = [
  ...jobOffers.map((job) => ({ value: job.id, label: job.title })),
  { value: "candidature-spontanee", label: "Candidature spontanée" },
] as const;

export const experienceOptions = [
  { value: "debutant", label: "Débutant (0–1 an)" },
  { value: "1-3", label: "1 à 3 ans" },
  { value: "3-5", label: "3 à 5 ans" },
  { value: "5-plus", label: "Plus de 5 ans" },
] as const;

export const availabilityOptions = [
  { value: "immediate", label: "Immédiate" },
  { value: "1-mois", label: "Sous 1 mois" },
  { value: "2-mois-plus", label: "2 mois ou plus" },
] as const;

export function getJobLabel(id: string): string {
  return jobSelectOptions.find((o) => o.value === id)?.label ?? id;
}

export function getExperienceLabel(value: string): string {
  return experienceOptions.find((o) => o.value === value)?.label ?? value;
}

export function getAvailabilityLabel(value: string): string {
  return availabilityOptions.find((o) => o.value === value)?.label ?? value;
}
