export const enNav = [
  { label: "Home", href: "/en" },
  { label: "Services", href: "/en/services" },
  { label: "Portfolio", href: "/realisations" },
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
} as const;

export const enContact = {
  title: "Contact us",
  highlight: "Let's talk",
  description: "Tell us about your project. We reply within 24–48 business hours.",
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

export const localeSwitcher = {
  fr: { label: "FR", ariaLabel: "Français" },
  en: { label: "EN", ariaLabel: "English" },
} as const;
