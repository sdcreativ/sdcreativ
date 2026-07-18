export type PageHeroBreadcrumb = {
  label: string;
  href?: string;
};

export type PageHeroConfig = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  description?: string;
  backgroundImage?: string;
  backgroundAlt?: string;
  breadcrumb?: PageHeroBreadcrumb[];
};

export const PAGE_HERO_KEYS = [
  "contact",
  "tarifs",
  "devis",
  "faq",
  "services",
  "solutions-ia",
  "formations",
  "carrieres",
  "a-propos",
  "maintenance",
  "realisations",
  "blog",
  "audit-gratuit",
  "mentions-legales",
  "politique-confidentialite",
] as const;

export type PageHeroKey = (typeof PAGE_HERO_KEYS)[number];

export const PAGE_HERO_GROUPS: { label: string; keys: PageHeroKey[] }[] = [
  {
    label: "Commercial",
    keys: ["contact", "tarifs", "devis", "services", "solutions-ia", "formations", "audit-gratuit"],
  },
  {
    label: "Contenu",
    keys: ["faq", "carrieres", "a-propos", "maintenance", "realisations", "blog"],
  },
  {
    label: "Légal",
    keys: ["mentions-legales", "politique-confidentialite"],
  },
];

export const PAGE_HERO_LABELS: Record<PageHeroKey, string> = {
  contact: "Contact",
  tarifs: "Tarifs",
  devis: "Devis / configurateur",
  faq: "FAQ",
  services: "Services (hub)",
  "solutions-ia": "Solutions IA",
  formations: "Formations",
  carrieres: "Carrières",
  "a-propos": "À propos",
  maintenance: "Maintenance",
  realisations: "Réalisations",
  blog: "Blog",
  "audit-gratuit": "Audit gratuit",
  "mentions-legales": "Mentions légales",
  "politique-confidentialite": "Politique de confidentialité",
};

export type SitePageHeroesSettings = Record<PageHeroKey, PageHeroConfig>;

export const defaultSitePageHeroesSettings: SitePageHeroesSettings = {
  contact: {
    eyebrow: "Contact",
    title: "Écrivez",
    highlight: "à notre équipe",
    description:
      "Une question, un suivi ou un besoin d'assistance ? Envoyez-nous un message — nous vous répondons sous 24 à 48 heures.",
    backgroundImage: "/images/contact/contact-hero-bg.png",
    backgroundAlt: "Équipe SD CREATIV au travail dans un bureau moderne",
  },
  tarifs: {
    eyebrow: "Nos offres",
    title: "Tarifs transparents,",
    highlight: "résultats concrets",
    description:
      "Choisissez la formule qui correspond à vos ambitions. Chaque projet fait l'objet d'un devis personnalisé gratuit.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Tarifs" }],
  },
  devis: {
    eyebrow: "Configurateur",
    title: "Estimez votre projet",
    highlight: "en quelques clics",
    description:
      "Choisissez votre type de projet, le nombre de pages et les options. Obtenez une estimation en FCFA et recevez-la par email.",
  },
  faq: {
    eyebrow: "Support",
    title: "Questions",
    highlight: "fréquentes",
    description: "Tout ce que vous devez savoir avant de lancer votre projet web avec SD CREATIV.",
  },
  services: {
    eyebrow: "Nos services",
    title: "Des solutions digitales",
    highlight: "adaptées à votre activité",
    description:
      "De la création de site vitrine aux applications mobiles et plateformes sur mesure — explorez nos offres et accédez aux fiches détaillées.",
    backgroundImage: "/images/services/services-hero-bg.png",
    backgroundAlt: "Solutions digitales SD CREATIV — création de sites web et services en ligne",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Services" }],
  },
  "solutions-ia": {
    eyebrow: "Intelligence artificielle",
    title: "Solutions IA",
    highlight: "sur mesure",
    description:
      "Support client, qualification de leads, automatisation métier — nous concevons et déployons des agents intelligents adaptés au contexte ivoirien.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Solutions IA" }],
  },
  formations: {
    eyebrow: "Formation professionnelle",
    title: "Montez en",
    highlight: "compétences",
    description:
      "Développement, IA, cybersécurité, cloud, marketing digital et plus — des formations concrètes pour particuliers, entreprises et administrations.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Formations" }],
  },
  carrieres: {
    eyebrow: "Recrutement",
    title: "Rejoignez",
    highlight: "SD CREATIV",
    description:
      "Nous recrutons des commerciaux terrain pour développer notre présence en Côte d'Ivoire et auprès de la diaspora.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Carrières" }],
  },
  "a-propos": {
    eyebrow: "À propos",
    title: "Votre partenaire digital",
    highlight: "à Abidjan",
    description:
      "SD CREATIV accompagne les PME, entrepreneurs et organisations dans leur transformation digitale avec des solutions web modernes, performantes et accessibles.",
  },
  maintenance: {
    eyebrow: "Accompagnement continu",
    title: "Maintenance",
    highlight: "& SLA",
    description:
      "Gardez votre site rapide, sécurisé et à jour. Formules mensuelles ou annuelles en FCFA — revenus récurrents, sérénité garantie.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Maintenance & SLA" }],
  },
  realisations: {
    eyebrow: "Portfolio",
    title: "Nos",
    highlight: "réalisations",
    description:
      "Des projets concrets, pensés pour la performance, la conversion et l'image de marque de nos clients.",
  },
  blog: {
    eyebrow: "Blog & Conseils",
    title: "Actualités &",
    highlight: "expertise digitale",
    description:
      "Des articles pratiques pour vous aider à développer votre présence en ligne et atteindre vos objectifs business.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Blog" }],
  },
  "audit-gratuit": {
    eyebrow: "Diagnostic gratuit",
    title: "Audit web",
    highlight: "gratuit",
    description:
      "Découvrez les forces et faiblesses de votre site actuel. Nous vous remettons un rapport clair avec un plan d'action concret.",
    breadcrumb: [{ label: "Accueil", href: "/" }, { label: "Audit gratuit" }],
  },
  "mentions-legales": {
    eyebrow: "Informations légales",
    title: "Mentions",
    highlight: "légales",
  },
  "politique-confidentialite": {
    eyebrow: "Protection des données",
    title: "Politique de",
    highlight: "confidentialité",
    description:
      "Transparence sur la collecte, l'utilisation et la protection de vos données personnelles.",
  },
};
