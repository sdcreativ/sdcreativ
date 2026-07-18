export const enNav = [
  { label: "Home", href: "/en" },
  { label: "Services", href: "/en/services" },
  { label: "Portfolio", href: "/en/portfolio" },
  { label: "Pricing", href: "/en/pricing" },
  { label: "About", href: "/en/about" },
  { label: "Contact", href: "/en/contact" },
] as const;

export const enHome = {
  hero: {
    eyebrow: "Web agency · Abidjan",
    title: "We build",
    highlight: "digital experiences",
    description:
      "Professional websites, e-commerce, AI agents and custom solutions for SMEs in Côte d'Ivoire and beyond.",
    ctaPrimary: "Get a quote",
    ctaSecondary: "View our work",
  },
  why: {
    title: "Why",
    highlight: "SD CREATIV",
    items: [
      { title: "Local expertise", description: "Based in Abidjan, we understand the Ivorian market." },
      { title: "Transparent pricing", description: "Clear packages in FCFA, free personalized quotes." },
      { title: "Full stack", description: "From showcase sites to AI agents and DevOps." },
    ],
  },
  cta: {
    title: "Ready to start your project?",
    description: "Based in Abidjan, we serve Ivorian SMEs and the diaspora worldwide.",
    button: "Get in touch",
  },
} as const;

export const enContact = {
  title: "Get in touch",
  highlight: "with our team",
  description: "Questions, support or follow-up? Send us a message — we reply within 24–48 business hours.",
} as const;

export const enServices = {
  title: "Digital solutions",
  highlight: "for your business",
  description: "Showcase sites, e-commerce, AI, automation, mobile apps and more.",
} as const;

export const enPricing = {
  title: "Transparent pricing,",
  highlight: "concrete results",
  description: "Choose the plan that fits your goals. Every project gets a free custom quote.",
} as const;

export const enAbout = {
  title: "About",
  highlight: "SD CREATIV",
  description: "A web agency in Abidjan helping Ivorian SMEs grow their digital presence.",
} as const;

export const enMaintenance = {
  title: "Keep your site",
  highlight: "fast & secure",
  description:
    "Updates, monitoring, backups and priority support — maintenance plans tailored to your stack.",
  cta: "Request a maintenance quote",
} as const;

export const enAudit = {
  title: "Free website",
  highlight: "audit",
  description:
    "Performance, SEO, mobile experience and security — a clear action plan with no commitment.",
  cta: "Request my free audit",
} as const;

export const enLegal = {
  title: "Legal information",
  description: "Legal notice and privacy policy for SD CREATIV.",
  noticeTitle: "Legal notice",
  privacyTitle: "Privacy policy",
  privacyIntro:
    "We protect your personal data in line with GDPR principles and Ivorian law 2013-450. Full details are maintained in French and mirrored below when available.",
} as const;

export const localeSwitcher = {
  fr: { label: "FR", ariaLabel: "Français" },
  en: { label: "EN", ariaLabel: "English" },
} as const;
