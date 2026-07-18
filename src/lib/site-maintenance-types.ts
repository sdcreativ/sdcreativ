import type { LucideIconName } from "@/lib/lucide-icon-map";
import {
  maintenanceFaq,
  maintenanceNote,
  maintenancePlans,
  slaComparison,
  type MaintenancePlan,
  type SlaComparisonRow,
} from "@/content/maintenance-plans";

export type MaintenanceHighlightStored = {
  icon: LucideIconName;
  title: string;
  description: string;
};

export type MaintenanceFaqStored = {
  question: string;
  answer: string;
};

export type SectionHeadingStored = {
  eyebrow: string;
  title: string;
  highlight: string;
  description?: string;
};

export type SiteMaintenanceSettings = {
  plansHeading: SectionHeadingStored;
  plans: MaintenancePlan[];
  slaComparison: SlaComparisonRow[];
  faq: MaintenanceFaqStored[];
  highlights: MaintenanceHighlightStored[];
  note: string;
  slaHeading: string;
  faqHeading: string;
};

export const defaultSiteMaintenanceSettings: SiteMaintenanceSettings = {
  plansHeading: {
    eyebrow: "Formules récurrentes",
    title: "Choisissez votre",
    highlight: "niveau de sérénité",
    description: "Paiement mensuel ou annuel en FCFA. L'abonnement annuel inclut 2 mois offerts.",
  },
  plans: maintenancePlans.map((p) => ({ ...p, features: [...p.features] })),
  slaComparison: slaComparison.map((r) => ({ ...r })),
  faq: maintenanceFaq.map((f) => ({ question: f.question, answer: f.answer })),
  highlights: [
    {
      icon: "RefreshCw",
      title: "Mises à jour",
      description: "CMS, plugins, dépendances et correctifs de sécurité.",
    },
    {
      icon: "Shield",
      title: "Sauvegardes",
      description: "Restauration rapide en cas d'incident ou de piratage.",
    },
    {
      icon: "Clock",
      title: "SLA garanti",
      description: "Délais de réponse contractuels selon votre formule.",
    },
    {
      icon: "Wrench",
      title: "Interventions",
      description: "Corrections, ajustements et assistance technique incluse.",
    },
  ],
  note: maintenanceNote,
  slaHeading: "Comparatif SLA",
  faqHeading: "Questions fréquentes",
};
