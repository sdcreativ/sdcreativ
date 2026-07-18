import type { LucideIconName } from "@/lib/lucide-icon-map";

export type AuditPointStored = {
  icon: LucideIconName;
  title: string;
  description: string;
};

export type AuditFaqStored = {
  question: string;
  answer: string;
};

export type SiteAuditSettings = {
  points: AuditPointStored[];
  checklist: string[];
  faq: AuditFaqStored[];
  formTitle: string;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  formFooter: string;
};

export const defaultSiteAuditSettings: SiteAuditSettings = {
  points: [
    {
      icon: "Gauge",
      title: "Performance",
      description: "Vitesse de chargement, score Lighthouse et optimisations possibles.",
    },
    {
      icon: "Search",
      title: "SEO & visibilité",
      description: "Référencement Google, structure, balises et présence locale à Abidjan.",
    },
    {
      icon: "Smartphone",
      title: "Expérience mobile",
      description: "Responsive, lisibilité et parcours utilisateur sur smartphone.",
    },
    {
      icon: "Shield",
      title: "Sécurité & technique",
      description: "HTTPS, plugins obsolètes, sauvegardes et bonnes pratiques.",
    },
  ],
  checklist: [
    "Analyse complète de votre site existant",
    "Rapport PDF avec scores et recommandations",
    "Estimation de refonte si nécessaire",
    "Sans engagement — 100 % gratuit",
  ],
  faq: [
    {
      question: "L'audit est-il vraiment gratuit ?",
      answer:
        "Oui, l'audit initial est 100 % gratuit et sans engagement. Nous vous remettons un rapport avec nos recommandations.",
    },
    {
      question: "Combien de temps dure l'audit ?",
      answer:
        "Nous analysons votre site sous 48 à 72 heures ouvrées et vous recontactons avec un rapport détaillé.",
    },
  ],
  formTitle: "Demandez votre audit gratuit",
  ctaPrimaryLabel: "Demander mon audit",
  ctaSecondaryLabel: "Configurateur de devis",
  ctaSecondaryHref: "/devis",
  formFooter: "Pas encore de site ?",
};
