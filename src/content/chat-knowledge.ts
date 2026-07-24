export type ChatKnowledgeEntry = {
  id: string;
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
};

/** Accueil générique — le widget utilise `getAiGreeting` (Phase 7) selon les horaires. */
export const chatGreeting =
  "Bonjour ! Je suis l'assistant SD CREATIV. Posez-moi vos questions sur nos services, tarifs ou délais — je suis là pour vous orienter.";

export const chatSuggestions = [
  "Quels sont vos tarifs ?",
  "Combien de temps pour un site ?",
  "Proposez-vous des agents IA ?",
  "Maintenance et SLA ?",
] as const;

export const chatSuggestionsEn = [
  "How does pricing work?",
  "How long for a website?",
  "Do you build AI agents?",
  "Maintenance & SLA?",
] as const;

export const chatKnowledge: ChatKnowledgeEntry[] = [
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
      "SD CREATIV propose 12 services : site vitrine, e-commerce, refonte web, identité visuelle, SEO local, maintenance, agents IA, automatisation, DevOps, cloud, applications mobiles et développement sur mesure. Basés à Abidjan, nous accompagnons les PME ivoiriennes.",
    links: [
      { label: "Nos services", href: "/services" },
      { label: "Solutions IA", href: "/solutions-ia" },
    ],
  },
  {
    id: "ia",
    keywords: [
      "ia", "intelligence", "artificielle", "agent", "chatbot", "bot", "openai", "claude",
      "llm", "automatisation", "assistant", "whatsapp",
    ],
    answer:
      "Nous concevons des agents IA sur mesure : chatbots site web, assistants WhatsApp, qualification de leads et automatisation métier. Stack : OpenAI, Claude, n8n, intégrations CRM. Devis personnalisé gratuit. Ce chatbot est d'ailleurs une démo de notre savoir-faire !",
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
      "En heures ouvrées (lun–ven 8h–18h Abidjan), un conseiller répond via le Live Chat / appel audio (bulle en bas à droite). Hors horaires : WhatsApp, formulaire de contact ou prise de rendez-vous en ligne. Nous sommes basés à Abidjan.",
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
      "Oui — du lundi au vendredi, 8h–18h (Abidjan), ouvrez le chat conseiller (ou un appel audio) via la bulle en bas à droite. Hors horaires, prenez rendez-vous ou écrivez-nous sur WhatsApp ; un humain reprendra dès l’ouverture.",
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
  "Je n'ai pas trouvé de réponse précise à votre question. En heures ouvrées, ouvrez le chat conseiller (bas à droite). Sinon : WhatsApp, formulaire de contact ou prise de rendez-vous.";

export const chatFallbackEn =
  "I could not find a precise answer. During business hours, open the advisor chat (bottom right). Otherwise: WhatsApp, contact form or online booking.";

export const chatGreetingEn =
  "Hello! I am the SD CREATIV assistant. Ask about our services, quotes or timelines — I will point you in the right direction.";

/** Knowledge base EN (same ids as FR). */
export const chatKnowledgeEn: ChatKnowledgeEntry[] = [
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
      "We design custom AI agents: website chatbots, WhatsApp assistants, lead qualification and business automation. Stack: OpenAI, Claude, n8n, CRM integrations. Free custom quote. This chatbot is a live demo of our work!",
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
      "During business hours (Mon–Fri 8am–6pm Abidjan), an advisor can help via live chat / audio (bubble bottom right). Outside hours: WhatsApp, contact form or online booking. We are based in Abidjan.",
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
      "Yes — Monday to Friday, 8am–6pm (Abidjan), open the advisor chat (or audio call) via the bubble bottom right. Outside hours, book a meeting or message us on WhatsApp; a human will follow up when we open.",
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

