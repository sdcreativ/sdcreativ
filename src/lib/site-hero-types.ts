export type HeroHighlight = {
  label: string;
  description: string;
};

export type SiteHeroSettings = {
  eyebrow: string;
  titleBefore: string;
  titleHighlight: string;
  titleAfter: string;
  description: string;
  features: string[];
  highlights: HeroHighlight[];
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  backgroundImage: string;
};

export const defaultSiteHeroSettings: SiteHeroSettings = {
  eyebrow: "Marketing digital & agents IA pour PME",
  titleBefore: "Plus de clients,",
  titleHighlight: "moins de tâches",
  titleAfter: " répétitives.",
  description:
    "SD CREATIV aide les PME, commerces et équipes commerciales à attirer des prospects, convertir et gagner du temps — sites web, marketing digital et agents IA qui répondent, qualifient et relancent pour vous.",
  features: ["Agents IA", "Sites & e-commerce", "Leads & WhatsApp", "SEO local", "Automatisation"],
  highlights: [
    { label: "Plus de leads", description: "Visibilité et conversion" },
    { label: "Réponses 24/7", description: "Agents sur site & WhatsApp" },
    { label: "Temps gagné", description: "Moins de tâches manuelles" },
    { label: "Accompagnement", description: "De la stratégie à la mise en ligne" },
  ],
  ctaPrimaryLabel: "Obtenir mon devis",
  ctaPrimaryHref: "/devis",
  ctaSecondaryLabel: "Découvrir les agents IA",
  ctaSecondaryHref: "/solutions-ia",
  backgroundImage: "/images/services/services-hero-bg.png",
};
