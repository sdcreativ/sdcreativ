import { KADY_BIO_EN, KADY_BIO_FR } from "@/content/kady-profile";

export type ChatKnowledgeEntry = {
  id: string;
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
};

/** Accueil générique — le widget utilise `getAiGreeting` (Phase 7) selon les horaires. */
export const chatGreeting =
  "Bonjour ! Je suis Kady, l'assistance virtuelle de SD CREATIV. Posez-moi vos questions sur nos services, tarifs ou délais — je suis là pour vous orienter.";

export const chatSuggestions = [
  "Qui es-tu, Kady ?",
  "Quels sont vos tarifs ?",
  "Combien de temps pour un site ?",
  "Proposez-vous des agents IA ?",
] as const;

export const chatSuggestionsEn = [
  "Who are you, Kady?",
  "How does pricing work?",
  "How long for a website?",
  "Do you build AI agents?",
] as const;

export const chatKnowledge: ChatKnowledgeEntry[] = [
  {
    id: "kady",
    keywords: [
      "qui es-tu", "qui es tu", "qui êtes-vous", "qui etes vous", "t'es qui", "tes qui",
      "tu es qui", "ton nom", "tu t'appelles", "tu t appelles", "présente-toi", "presente-toi",
      "présentation", "presentation", "kady", "c'est qui", "c est qui",
    ],
    answer: KADY_BIO_FR,
    links: [
      { label: "Solutions IA", href: "/solutions-ia" },
      { label: "Parler à un conseiller", href: "/contact" },
    ],
  },
  {
    id: "tarifs",
    keywords: [
      "tarif", "prix", "coût", "cout", "combien", "fcfa", "budget", "devis", "estimation",
      "essentiel", "professionnel", "business", "formule", "offre",
    ],
    answer:
      "Nous proposons des formules Essentiel, Professionnel et Business (sites vitrine à e-commerce), des packs agents IA et des formules maintenance. Chaque projet fait l'objet d'un devis personnalisé gratuit — indiquez votre besoin et nous vous répondons sous 24 à 48 h.",
    links: [
      { label: "Voir les tarifs", href: "/tarifs" },
      { label: "Configurateur de devis", href: "/devis" },
    ],
  },
  {
    id: "delais",
    keywords: [
      "délai", "delai", "durée", "duree", "temps", "livraison", "jours", "semaines", "rapide",
    ],
    answer:
      "En moyenne, comptez 15 à 30 jours pour un site vitrine ou e-commerce selon la complexité. Les projets agents IA ou sur mesure peuvent prendre 4 à 8 semaines. Nous établissons un calendrier précis dès la validation du devis.",
    links: [{ label: "Demander un devis", href: "/devis" }],
  },
  {
    id: "services",
    keywords: [
      "service", "offre", "prestation", "faire", "proposez", "activité", "digital",
      "vitrine", "e-commerce", "ecommerce", "boutique", "refonte", "seo", "identité",
    ],
    answer:
      "SD CREATIV aide les PME à Abidjan avec le marketing digital et le digital : sites web, e-commerce, SEO local, agents IA (réponses clients & leads), automatisation commerciale, et si besoin applications, cloud ou projets sur mesure.",
    links: [
      { label: "Nos services", href: "/services" },
      { label: "Solutions IA", href: "/solutions-ia" },
    ],
  },
  {
    id: "ia",
    keywords: [
      "ia", "intelligence", "artificielle", "agent", "chatbot", "bot", "openai", "claude",
      "llm", "automatisation", "assistant", "whatsapp", "lead", "leads", "marketing",
    ],
    answer:
      "Nous créons 12 types d’agents IA : accueil, commercial, support, FAQ documentaire, prise de RDV, devis, e-commerce, relance, CRM, administratif, RH et finance. Ils répondent, qualifient et automatisent — avec passage à un humain si besoin. Devis gratuit.",
    links: [
      { label: "Solutions IA", href: "/solutions-ia" },
      { label: "Devis agents IA", href: "/devis?type=agents-ia" },
    ],
  },
  {
    id: "maintenance",
    keywords: [
      "maintenance", "sla", "support", "sauvegarde", "mise à jour", "mise a jour",
      "monitoring", "abonnement", "mensuel", "annuel", "forfait",
    ],
    answer:
      "Nous proposons 3 formules maintenance : Essentiel, Professionnel et Premium SLA (réponse sous 4h). Inclus : sauvegardes, mises à jour, monitoring et assistance technique. Devis personnalisé selon le niveau de SLA souhaité.",
    links: [
      { label: "Formules maintenance", href: "/maintenance" },
      { label: "Devis maintenance", href: "/devis?type=maintenance" },
    ],
  },
  {
    id: "contact",
    keywords: [
      "contact", "contacter", "appeler", "email", "rdv", "rendez-vous", "rendez vous",
      "rencontrer", "équipe", "equipe", "abidjan",
    ],
    answer:
      "En heures ouvrées (lun–ven 8h–18h Abidjan), un conseiller répond via le Live Chat sur Accueil, Contact, Devis ou Tarifs. Hors horaires : WhatsApp, formulaire de contact ou prise de rendez-vous en ligne.",
    links: [
      { label: "Prendre rendez-vous", href: "/rendez-vous" },
      { label: "Contact", href: "/contact" },
      { label: "Audit web gratuit", href: "/audit-gratuit" },
    ],
  },
  {
    id: "conseiller",
    keywords: [
      "conseiller", "humain", "personne", "appeler", "téléphone", "telephone",
      "live chat", "3cx", "parler à", "parler a", "agent",
    ],
    answer:
      "Oui — du lundi au vendredi, 8h–18h (Abidjan), le chat conseiller (ou un appel audio) s’affiche sur Accueil, Contact, Devis ou Tarifs. Hors horaires, prenez rendez-vous ou écrivez-nous sur WhatsApp.",
    links: [
      { label: "Prendre rendez-vous", href: "/rendez-vous" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "mobile",
    keywords: ["mobile", "responsive", "smartphone", "tablette", "adapté", "adapte"],
    answer:
      "Oui, 100 % de nos sites sont responsive — optimisés pour smartphone, tablette et desktop. C'est inclus dans toutes nos formules.",
    links: [{ label: "Nos tarifs", href: "/tarifs" }],
  },
  {
    id: "ecommerce",
    keywords: [
      "mobile money", "orange money", "wave", "momo", "paiement", "commande", "vente en ligne",
    ],
    answer:
      "Notre formule Business inclut une boutique e-commerce complète avec paiement Mobile Money (Orange Money, Wave), gestion des commandes et formation admin. Devis personnalisé gratuit.",
    links: [
      { label: "Tarifs e-commerce", href: "/tarifs" },
      { label: "Estimer mon projet", href: "/devis?type=e-commerce" },
    ],
  },
];

export const chatFallback =
  "Je n'ai pas trouvé de réponse précise à votre question. En heures ouvrées, le chat conseiller s’ouvre sur Accueil, Contact, Devis ou Tarifs. Sinon : WhatsApp, formulaire de contact ou prise de rendez-vous.";

export const chatFallbackEn =
  "I could not find a precise answer. During business hours, the advisor chat opens on Home, Contact, Quote or Pricing. Otherwise: WhatsApp, contact form or online booking.";

export const chatGreetingEn =
  "Hello! I'm Kady, SD CREATIV's virtual assistant. Ask about our services, quotes or timelines — I will point you in the right direction.";

/** Knowledge base EN (same ids as FR). */
export const chatKnowledgeEn: ChatKnowledgeEntry[] = [
  {
    id: "kady",
    keywords: [
      "who are you", "your name", "what's your name", "whats your name",
      "introduce yourself", "kady", "are you human", "are you a bot",
    ],
    answer: KADY_BIO_EN,
    links: [
      { label: "AI solutions", href: "/en/solutions-ia" },
      { label: "Talk to an advisor", href: "/en/contact" },
    ],
  },
  {
    id: "tarifs",
    keywords: [
      "price", "pricing", "cost", "budget", "quote", "estimate", "how much", "tarif", "devis",
      "essential", "professional", "business", "package", "plan",
    ],
    answer:
      "We offer Essential, Professional and Business packages (showcase to e-commerce), AI agent packs and maintenance plans. Every project gets a free custom quote — tell us what you need and we reply within 24–48 hours.",
    links: [
      { label: "View pricing", href: "/en/pricing" },
      { label: "Quote configurator", href: "/en/devis" },
    ],
  },
  {
    id: "delais",
    keywords: [
      "timeline", "deadline", "duration", "how long", "delivery", "days", "weeks", "fast", "délai",
    ],
    answer:
      "On average, expect 15 to 30 days for a showcase or e-commerce site depending on complexity. AI or custom projects may take 4 to 8 weeks. We set a precise schedule once the quote is validated.",
    links: [{ label: "Request a quote", href: "/en/devis" }],
  },
  {
    id: "services",
    keywords: [
      "service", "offer", "what do you", "digital", "showcase", "e-commerce", "ecommerce", "store",
      "redesign", "seo", "branding",
    ],
    answer:
      "SD CREATIV offers 12 services: showcase sites, e-commerce, redesign, visual identity, local SEO, maintenance, AI agents, automation, DevOps, cloud, mobile apps and custom development. Based in Abidjan, we support Ivorian SMEs.",
    links: [
      { label: "Our services", href: "/en/services" },
      { label: "AI solutions", href: "/en/solutions-ia" },
    ],
  },
  {
    id: "ia",
    keywords: [
      "ai", "artificial", "intelligence", "agent", "chatbot", "bot", "openai", "claude", "llm",
      "automation", "assistant", "whatsapp",
    ],
    answer:
      "We design custom AI agents: website chatbots, WhatsApp assistants, lead qualification and business automation. Stack: OpenAI, Claude, n8n, CRM integrations. Free custom quote.",
    links: [
      { label: "AI solutions", href: "/en/solutions-ia" },
      { label: "AI quote", href: "/en/devis?type=agents-ia" },
    ],
  },
  {
    id: "maintenance",
    keywords: [
      "maintenance", "sla", "support", "backup", "update", "monitoring", "subscription", "monthly",
    ],
    answer:
      "We offer 3 maintenance plans: Essential, Professional and Premium SLA (response within 4h). Included: backups, updates, monitoring and technical support. Free custom quote based on the SLA you need.",
    links: [
      { label: "Maintenance plans", href: "/en/maintenance" },
      { label: "Maintenance quote", href: "/en/devis?type=maintenance" },
    ],
  },
  {
    id: "contact",
    keywords: [
      "contact", "call", "email", "meeting", "book", "appointment", "team", "abidjan", "rdv",
    ],
    answer:
      "During business hours (Mon–Fri 8am–6pm Abidjan), an advisor can help via live chat on Home, Contact, Quote or Pricing. Outside hours: WhatsApp, contact form or online booking.",
    links: [
      { label: "Book a call", href: "/en/book" },
      { label: "Contact", href: "/en/contact" },
      { label: "Free website audit", href: "/en/free-audit" },
    ],
  },
  {
    id: "conseiller",
    keywords: [
      "advisor", "human", "person", "phone", "live chat", "3cx", "talk to", "agent",
    ],
    answer:
      "Yes — Monday to Friday, 8am–6pm (Abidjan), the advisor chat (or audio call) appears on Home, Contact, Quote or Pricing. Outside hours, book a meeting or message us on WhatsApp.",
    links: [
      { label: "Book a call", href: "/en/book" },
      { label: "Contact", href: "/en/contact" },
    ],
  },
  {
    id: "mobile",
    keywords: ["mobile", "responsive", "smartphone", "tablet"],
    answer:
      "Yes — 100% of our sites are responsive and optimized for smartphone, tablet and desktop. Included in every package.",
    links: [{ label: "Our pricing", href: "/en/pricing" }],
  },
  {
    id: "ecommerce",
    keywords: [
      "mobile money", "orange money", "wave", "momo", "payment", "order", "online store", "sell",
    ],
    answer:
      "Our Business package includes a full e-commerce store with Mobile Money payments (Orange Money, Wave), order management and admin training. Free custom quote.",
    links: [
      { label: "E-commerce pricing", href: "/en/pricing" },
      { label: "Estimate my project", href: "/en/devis?type=e-commerce" },
    ],
  },
];

