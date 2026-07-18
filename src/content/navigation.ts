export const mainNav = [
  { label: "Accueil", href: "/" },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Site vitrine", href: "/services/site-vitrine" },
      { label: "E-commerce", href: "/services/e-commerce" },
      { label: "Refonte web", href: "/services/refonte-web" },
      { label: "Identité visuelle", href: "/services/identite-visuelle" },
      { label: "SEO Local", href: "/services/seo-local" },
      { label: "Maintenance & SLA", href: "/maintenance" },
      { label: "Agents IA", href: "/solutions-ia" },
      { label: "Automatisation", href: "/services/automatisation" },
      { label: "DevOps", href: "/services/devops" },
      { label: "Cloud", href: "/services/cloud" },
      { label: "Applications mobiles", href: "/services/applications-mobiles" },
      { label: "Développement sur mesure", href: "/services/developpement-sur-mesure" },
    ],
  },
  { label: "Formations", href: "/formations" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Blog", href: "/blog" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerQuickLinks = [
  { label: "Accueil", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Réalisations", href: "/realisations" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Formations", href: "/formations" },
  { label: "Devis en ligne", href: "/devis" },
  { label: "Blog", href: "/blog" },
  { label: "À propos", href: "/a-propos" },
  { label: "FAQ", href: "/faq" },
  { label: "Carrières", href: "/carrieres" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerServices = [
  { label: "Site vitrine", href: "/services/site-vitrine" },
  { label: "E-commerce", href: "/services/e-commerce" },
  { label: "Agents IA", href: "/solutions-ia" },
  { label: "Formations", href: "/formations" },
  { label: "Maintenance & SLA", href: "/maintenance" },
  { label: "SEO Local", href: "/services/seo-local" },
  { label: "Refonte web", href: "/services/refonte-web" },
  { label: "Applications mobiles", href: "/services/applications-mobiles" },
] as const;

export const footerSeoLinks = [
  { label: "Agence web Abidjan", href: "/agence-web-abidjan" },
  { label: "Audit web gratuit", href: "/audit-gratuit" },
] as const;

export const legalLinks = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/politique-confidentialite" },
  { label: "Cookies", href: "/politique-confidentialite#cookies" },
] as const;
