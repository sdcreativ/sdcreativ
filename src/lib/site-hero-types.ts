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
  eyebrow: "Agence web & solutions digitales",
  titleBefore: "Votre image,",
  titleHighlight: "votre site",
  titleAfter: ", votre impact.",
  description:
    "SD CREATIV accompagne les PME, entrepreneurs, commerces et organisations dans la création de sites web modernes, accessibles et performants.",
  features: ["Sites vitrines", "E-commerce", "Refonte web", "SEO local", "Maintenance"],
  highlights: [
    { label: "100% Responsive", description: "Adapté à tous les écrans" },
    { label: "SEO Optimisé", description: "Visible sur Google" },
    { label: "Livraison Accompagnée", description: "De A à Z avec vous" },
    { label: "Support Après mise en ligne", description: "On reste à vos côtés" },
  ],
  ctaPrimaryLabel: "Obtenir mon devis",
  ctaPrimaryHref: "/devis",
  ctaSecondaryLabel: "Découvrir nos services",
  ctaSecondaryHref: "/services",
  backgroundImage: "/images/services/services-hero-bg.png",
};
