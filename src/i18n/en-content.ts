export const enNav = [
  { label: "Home", href: "/en" },
  { label: "Services", href: "/en/services" },
  { label: "AI solutions", href: "/en/solutions-ia" },
  { label: "Training", href: "/en/training" },
  { label: "Portfolio", href: "/en/portfolio" },
  { label: "Pricing", href: "/en/pricing" },
  { label: "Quote", href: "/en/devis" },
  { label: "FAQ", href: "/en/faq" },
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
      { title: "Transparent pricing", description: "Clear packages, free personalized quotes — no public price lists." },
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

export const enQuote = {
  title: "Online quote",
  highlight: "for your project",
  description:
    "Describe your needs and get a free custom quote. We reply within 24–48 business hours with a proposal tailored to your scope.",
  bookTitle: "Prefer to talk it through?",
  bookDescription:
    "Book a 30-minute call with our team to refine your project and receive a personalized quote.",
  contactCta: "Have a question? Write to us →",
  configNote:
    "Option labels may appear in French — our team will follow up with you in English.",
} as const;

export const enServices = {
  title: "Digital solutions",
  highlight: "for your business",
  description: "Showcase sites, e-commerce, AI, automation, mobile apps and more.",
  banner:
    "Detailed service pages are currently in French. Request a quote in English, or open the French brief if you prefer.",
  ctaQuote: "Get a quote",
  ctaDetailsFr: "Details (French)",
} as const;

export const enFaq = {
  title: "Frequently asked",
  highlight: "questions",
  description:
    "Clear answers about our web services, timelines, maintenance and how we work with SMEs in Côte d'Ivoire and abroad.",
  ctaTitle: "Still have a question?",
  ctaDescription: "Our team can answer your questions and prepare a free custom quote.",
  ctaButton: "Contact us",
} as const;

export const enSolutionsIa = {
  title: "AI agents",
  highlight: "that work for your business",
  description:
    "Website chatbots, WhatsApp assistants, lead qualification and workflow automation — designed for SMEs in Côte d'Ivoire and beyond.",
  demoTitle: "This site chatbot is a live demo",
  demoDescription:
    "Ask about our services, pricing approach or timelines — then book a call when you are ready.",
  packsTitle: "Packages",
  packsHighlight: "built around your needs",
  faqTitle: "Questions about AI projects",
  cta: "Estimate my AI project",
  viewFr: "Full French page →",
} as const;

export const enFooter = {
  ctaTitle: "Ready to elevate",
  ctaHighlight: "your digital presence?",
  ctaDescription: "Let's discuss your project and build your success together.",
  ctaQuote: "Get a quote",
  ctaWhatsapp: "Chat on WhatsApp",
  quickLinks: "Quick links",
  services: "Our services",
  contact: "Contact us",
  rights: "All rights reserved.",
  links: [
    { label: "Home", href: "/en" },
    { label: "Services", href: "/en/services" },
    { label: "AI solutions", href: "/en/solutions-ia" },
    { label: "Portfolio", href: "/en/portfolio" },
    { label: "Pricing", href: "/en/pricing" },
    { label: "Training", href: "/en/training" },
    { label: "Online quote", href: "/en/devis" },
    { label: "FAQ", href: "/en/faq" },
    { label: "About", href: "/en/about" },
    { label: "Contact", href: "/en/contact" },
  ],
  serviceLinks: [
    { label: "Showcase website", href: "/en/devis?type=site-vitrine" },
    { label: "E-commerce", href: "/en/devis?type=e-commerce" },
    { label: "AI agents", href: "/en/solutions-ia" },
    { label: "Training", href: "/en/training" },
    { label: "Maintenance & SLA", href: "/en/maintenance" },
    { label: "Local SEO", href: "/en/devis?type=seo-local" },
  ],
  legal: [
    { label: "Legal notice", href: "/en/legal" },
    { label: "Privacy policy", href: "/en/privacy" },
    { label: "Cookies", href: "/en/privacy#cookies" },
  ],
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

export const enTraining = {
  title: "Professional training",
  highlight: "that builds real skills",
  description:
    "Web & mobile, AI, cybersecurity, cloud, databases, digital marketing and more — for individuals, teams and public organizations.",
  cta: "Request a quote",
  viewFr: "View full catalog (French)",
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
