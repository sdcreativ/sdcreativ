export type SiteCareersSettings = {
  benefits: string[];
};

export const defaultSiteCareersSettings: SiteCareersSettings = {
  benefits: [
    "Commissions attractives sur ventes conclues",
    "Formation produits (web, IA, maintenance)",
    "Outils CRM et configurateur de devis",
    "Marque en croissance sur le marché ivoirien",
    "Équipe technique basée à Abidjan",
  ],
};

export type JobOfferStored = {
  slug: string;
  title: string;
  type: string;
  location: string;
  department: string;
  description: string;
  missions: string[];
  profile: string[];
};
